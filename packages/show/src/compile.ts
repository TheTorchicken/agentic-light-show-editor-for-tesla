// Compiles a show directory into files for the car and the viewer.
//
// A show directory has show.json ({ title, profile, audio, analysis }) and show.ts,
// whose default export choreographs a Show. Paths in show.json are relative to the
// repo root. Output goes to workspace/<slug>/build/.
//
// Usage: node packages/show/src/compile.ts shows/grief

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFseq, validate, writeFseq } from "@lightshow/core";
import { critique, critiqueReport } from "./critique.ts";
import { loadProfile } from "./profile.ts";
import { hexToRgb } from "./palette.ts";
import { Show, type Analysis } from "./show.ts";
import { simulate, simulateClosures } from "./simulate.ts";

interface ShowConfig {
  title: string;
  profile: string;
  audio: string;
  analysis: string;
  /** Optional interior color theme, e.g. { "colors": ["#ff0000", "#ffffff"] }. Exterior is never themed. */
  theme?: { colors: string[]; note?: string };
  /** Import an existing .fseq instead of running show.ts (for comparing other shows). */
  fseq?: string;
  /** Optional section starts (seconds, with optional names) that replace the analyzer's for the critique. */
  sections?: Array<{ start: number; name?: string }>;
}

export async function compile(showDir: string, root = process.cwd()) {
  const dir = resolve(root, showDir);
  const slug = basename(dir);
  const config = JSON.parse(readFileSync(join(dir, "show.json"), "utf8")) as ShowConfig;
  const profile = loadProfile(resolve(root, config.profile));
  const analysis = JSON.parse(readFileSync(resolve(root, config.analysis), "utf8")) as Analysis;
  // A show may name its own sections (from its PLAN); the critique then judges against them.
  if (config.sections?.length) {
    analysis.sections = config.sections.map((sec, i) => {
      const end = config.sections![i + 1]?.start ?? analysis.duration;
      const a = Math.round(sec.start / analysis.curveStep), b = Math.max(a + 1, Math.round(end / analysis.curveStep));
      const slice = analysis.energy.slice(a, b);
      return { start: sec.start, end, energy: slice.reduce((n, v) => n + v, 0) / Math.max(1, slice.length) };
    });
  }

  const theme = config.theme?.colors.map(hexToRgb);
  const show = new Show(profile, analysis, analysis.duration, theme);
  const fileBase = config.title.replace(/[^A-Za-z0-9]+/g, "_");
  let seq;
  if (config.fseq) {
    // Imported show: use its channel data as is.
    seq = readFseq(readFileSync(resolve(root, config.fseq)));
    show.warnings.push(`Imported from ${config.fseq}; not choreographed here.`);
  } else {
    // Cache-bust so a long-running viewer server picks up edits to show.ts.
    const mod = await import(`${pathToFileURL(join(dir, "show.ts")).href}?t=${Date.now()}`);
    mod.default(show);
    seq = show.toSequence({ mf: `${fileBase}.wav`, sp: "agentic-light-show-editor-for-tesla" });
  }
  const report = validate(seq);
  const sim = simulate(seq, profile);
  const closureSim = simulateClosures(seq, profile);
  // Music only plays through the cabin speakers: with the windows up, the crowd outside
  // can barely hear it. Windows should be down whenever music plays (a dance keeps them
  // mostly open), closing only in real silence or after the music ends. The first 5 s are
  // allowed for lowering them.
  const music = (t: number) => {
    const c = analysis.energy, i = Math.round(t / analysis.curveStep), w = Math.round(0.5 / analysis.curveStep);
    let sum = 0, n = 0;
    for (let k = Math.max(0, i - w); k <= Math.min(c.length - 1, i + w); k++) { sum += c[k]; n++; }
    return n ? sum / n : 0;
  };
  const windows = closureSim.filter((c) => profile.closures?.find((k) => k.id === c.id)?.kind === "window");
  if (windows.some((w) => w.position.some((v) => v > 0))) {
    let muffled = 0;
    for (let f = Math.round(5000 / seq.stepMs); f < windows[0].position.length; f++) {
      const t = (f * seq.stepMs) / 1000;
      if (music(t) > 0.08 && windows.some((w) => w.position[f] < 0.5)) muffled++;
    }
    const secs = (muffled * seq.stepMs) / 1000;
    if (secs > 1.5) show.warnings.push(`Windows are mostly up for ${secs.toFixed(1)} s while music plays; the music only comes out of the cabin speakers, so the crowd can't hear it. Lower them at the start, keep them down (dance for motion), and close only in silence or after the music ends.`);
  }

  // A show should end the way the car started: everything closed, mirrors unfolded.
  for (const c of closureSim) {
    const kind = profile.closures?.find((k) => k.id === c.id)?.kind;
    const want = kind === "mirror" ? 1 : 0, end = c.position[c.position.length - 1];
    if (Math.abs(end - want) > 0.02) show.warnings.push(`${c.id} ends ${kind === "mirror" ? "folded" : "open"} (position ${end.toFixed(2)}); a dance leaves it mid-swing, so close or unfold it after.`);
  }
  const review = critique(sim, profile, analysis, seq.stepMs, theme);

  const out = resolve(root, "workspace", slug, "build");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${fileBase}.fseq`), writeFseq(seq));
  copyFileSync(resolve(root, config.audio), join(out, `${fileBase}.wav`));
  writeFileSync(join(out, "viewer.json"), JSON.stringify({
    title: config.title,
    audio: `${fileBase}.wav`,
    stepMs: seq.stepMs,
    frames: Math.floor(seq.data.length / seq.channelCount),
    profile,
    analysis: { tempo: analysis.tempo, beats: analysis.beats, downbeats: analysis.downbeats, sections: analysis.sections, energy: analysis.energy, curveStep: analysis.curveStep },
    closures: closureSim.map((c) => ({
      id: c.id,
      position: Buffer.from(Uint8Array.from(c.position, (v) => Math.round(v * 255))).toString("base64"),
      dancing: Buffer.from(c.dancing).toString("base64"),
    })),
    lights: sim.map((s) => ({
      id: s.id,
      level: Buffer.from(Uint8Array.from(s.level, (v) => Math.round(v * 255))).toString("base64"),
      rgb: s.rgb?.map((c) => Buffer.from(c).toString("base64")),
    })),
  }));
  const text = [
    `# ${config.title}`, "",
    report.ok ? "Validation: OK" : `Validation FAILED:\n${report.errors.join("\n")}`,
    ...show.warnings.map((w) => `Warning: ${w}`), "",
    critiqueReport(review), "",
  ].join("\n");
  writeFileSync(join(out, "report.md"), text);
  return { ok: report.ok, out, fileBase, text };
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) { console.error("Usage: compile.ts <show dir>"); process.exit(1); }
  const r = await compile(dir);
  console.log(r.text);
  console.log(`Wrote ${r.out}`);
  if (!r.ok) process.exit(1);
}
