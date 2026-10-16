// Builds every probe into build/probes/: <Name>.fseq + <Name>.wav for the USB
// drive, <Name>.manifest.json with exact action times for video analysis, and
// <Name>.cues.md as a printable cue sheet.
//
// Usage: node packages/probe/src/build.ts [outDir]

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CHANNEL_COUNT, createSequence, setValue, validate, writeFseq } from "@lightshow/core";
import { Track, beep, durationMs, speak, writeWavStereo16 } from "./audio.ts";
import { PROBES } from "./probes.ts";
import type { Probe, Setter } from "./timeline.ts";

const STEP_MS = 20;
const GAP_MS = 700; // darkness between actions
const LEAD_IN_MS = 6000; // time to walk back to the camera after pressing play
const SYNC_FLASH_MS = 150;
const SYNC_PERIOD_MS = 1000;

interface Segment { atMs: number; durMs: number; render: (tMs: number, set: Setter) => void }
interface Cue { atMs: number; clip: Float32Array; gain: number }

export interface Manifest {
  probe: string;
  fileName: string;
  camera: string;
  stepMs: number;
  durationMs: number;
  /** Start of each sync flash, at show start and end. Align the video to these. */
  syncFlashesMs: number[];
  tests: Array<{
    number: number;
    title: string;
    announceMs: number;
    actions: Array<{ label: string; startMs: number; endMs: number; channels: number[] }>;
  }>;
}

export function layout(probe: Probe) {
  const segments: Segment[] = [];
  const cues: Cue[] = [];
  const manifest: Manifest = {
    probe: probe.slug, fileName: probe.fileName, camera: probe.camera,
    stepMs: STEP_MS, durationMs: 0, syncFlashesMs: [], tests: [],
  };
  let t = 0;
  // Speech has arbitrary length; snap back to the frame grid so every action starts
  // exactly on a frame and the manifest times match the show data.
  const say = (text: string, minMs = 0) => {
    const clip = speak(text);
    cues.push({ atMs: t, clip, gain: 0.9 });
    t = Math.ceil((t + Math.max(minMs, durationMs(clip) + 300)) / STEP_MS) * STEP_MS;
  };
  const sync = () => {
    for (let i = 0; i < 3; i++) {
      manifest.syncFlashesMs.push(t);
      segments.push({ atMs: t, durMs: SYNC_FLASH_MS, render: (_t, set) => probe.syncChannels.forEach((c) => set(c, 255)) });
      cues.push({ atMs: t, clip: beep(1000, SYNC_FLASH_MS, 0.6), gain: 1 });
      t += SYNC_PERIOD_MS;
    }
  };

  say(`${probe.slug} probe. Lock exposure on the car now. Starting in a few seconds.`, LEAD_IN_MS);
  say("Sync.");
  sync();
  probe.tests.forEach((test, i) => {
    const number = i + 1;
    const announceMs = t;
    say(`Test ${number}. ${test.title}.`, 1200);
    const actions: Manifest["tests"][number]["actions"] = [];
    test.actions.forEach((a, j) => {
      if (j > 0) t += GAP_MS;
      segments.push({ atMs: t, durMs: a.durMs, render: a.render });
      cues.push({ atMs: t, clip: beep(660, 40, 0.25), gain: 1 }); // soft tick marks each action start
      actions.push({ label: a.label, startMs: t, endMs: t + a.durMs, channels: a.channels });
      t += a.durMs;
    });
    t += GAP_MS;
    manifest.tests.push({ number, title: test.title, announceMs, actions });
  });
  say("Sync.");
  sync();
  say("Probe complete.");
  manifest.durationMs = t + 500;
  return { segments, cues, manifest };
}

export function renderSequence(probe: Probe) {
  const { segments, cues, manifest } = layout(probe);
  const seq = createSequence(CHANNEL_COUNT, STEP_MS, manifest.durationMs);
  seq.meta = { mf: `${probe.fileName}.wav`, sp: "agentic-light-show-editor-for-tesla probe" };
  for (const s of segments) {
    if (s.atMs % STEP_MS !== 0) throw new Error(`Segment at ${s.atMs} ms is off the ${STEP_MS} ms frame grid`);
    const first = s.atMs / STEP_MS;
    const last = Math.ceil((s.atMs + s.durMs) / STEP_MS);
    for (let f = first; f < last; f++) s.render(f * STEP_MS - s.atMs, (c, v) => setValue(seq, f, c, v));
  }
  return { seq, cues, manifest };
}

function render(probe: Probe, outDir: string) {
  const { seq, cues, manifest } = renderSequence(probe);
  const report = validate(seq);
  if (!report.ok) throw new Error(`${probe.fileName} failed validation:\n${report.errors.join("\n")}`);

  const track = new Track(manifest.durationMs);
  for (const c of cues) track.mix(c.clip, c.atMs, c.gain);

  writeFileSync(join(outDir, `${probe.fileName}.fseq`), writeFseq(seq));
  writeFileSync(join(outDir, `${probe.fileName}.wav`), writeWavStereo16(track));
  writeFileSync(join(outDir, `${probe.fileName}.manifest.json`), JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(outDir, `${probe.fileName}.cues.md`), cueSheet(manifest));
  return { manifest, report };
}

const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function cueSheet(m: Manifest): string {
  const rows = m.tests.flatMap((t) =>
    t.actions.map((a, i) => `| ${i === 0 ? t.number : ""} | ${clock(a.startMs)} | ${i === 0 ? t.title : ""} | ${a.label} |  |`));
  return [
    `# ${m.fileName} cue sheet`, "", `Camera: ${m.camera}`, "", `Length: ${clock(m.durationMs)}`, "",
    "| # | Time | Test | Action | What you saw |", "|---|---|---|---|---|", ...rows, "",
  ].join("\n");
}

if (import.meta.main) {
  const outDir = resolve(process.argv[2] ?? "build/probes");
  mkdirSync(outDir, { recursive: true });
  for (const probe of PROBES) {
    const { manifest, report } = render(probe, outDir);
    const cmds = Object.entries(report.closureCommands).map(([c, n]) => `ch${c}:${n}`).join(" ");
    console.log(`${probe.fileName.padEnd(18)} ${clock(manifest.durationMs)}  ${manifest.tests.length} tests${cmds ? `  closure commands ${cmds}` : ""}`);
  }
  console.log(`Wrote probes to ${outDir}`);
}
