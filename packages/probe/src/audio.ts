// Minimal audio for probes: spoken announcements (macOS `say`), sine beeps, and a
// 44.1 kHz 16-bit stereo WAV writer. Tesla needs 44.1 kHz; 48 kHz drifts out of sync.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SAMPLE_RATE = 44_100;

export class Track {
  samples: Float32Array;
  constructor(durationMs: number) {
    this.samples = new Float32Array(Math.ceil((durationMs / 1000) * SAMPLE_RATE));
  }
  mix(clip: Float32Array, atMs: number, gain = 1): void {
    const start = Math.round((atMs / 1000) * SAMPLE_RATE);
    for (let i = 0; i < clip.length && start + i < this.samples.length; i++) this.samples[start + i] += clip[i] * gain;
  }
}

export function beep(freqHz: number, durMs: number, amp = 0.5): Float32Array {
  const n = Math.round((durMs / 1000) * SAMPLE_RATE);
  const fade = Math.min(n / 2, SAMPLE_RATE * 0.005);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / fade, (n - i) / fade);
    out[i] = amp * env * Math.sin((2 * Math.PI * freqHz * i) / SAMPLE_RATE);
  }
  return out;
}

const speechCache = new Map<string, Float32Array>();

let hasSay: boolean | undefined;

/**
 * Renders text to mono samples with the macOS system voice. Elsewhere (or if `say` is
 * missing) it returns silence of about the spoken length, so probes still build and test;
 * the announcements are then missing from the audio.
 */
export function speak(text: string): Float32Array {
  const cached = speechCache.get(text);
  if (cached) return cached;
  if (hasSay === undefined) {
    try { execFileSync("which", ["say"], { stdio: "ignore" }); hasSay = process.platform === "darwin"; } catch { hasSay = false; }
  }
  if (!hasSay) {
    const silent = new Float32Array(Math.round(SAMPLE_RATE * (0.4 + text.length * 0.065)));
    speechCache.set(text, silent);
    return silent;
  }
  const dir = mkdtempSync(join(tmpdir(), "probe-say-"));
  try {
    const file = join(dir, "clip.wav");
    execFileSync("say", ["-r", "200", "-o", file, "--file-format=WAVE", `--data-format=LEI16@${SAMPLE_RATE}`, text]);
    const clip = readWavMono16(readFileSync(file));
    speechCache.set(text, clip);
    return clip;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const durationMs = (clip: Float32Array): number => (clip.length / SAMPLE_RATE) * 1000;

function readWavMono16(buf: Buffer): Float32Array {
  let at = 12;
  let channels = 1;
  while (at + 8 <= buf.length) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === "fmt ") channels = buf.readUInt16LE(at + 10);
    if (id === "data") {
      const frames = size / 2 / channels;
      const out = new Float32Array(frames);
      for (let i = 0; i < frames; i++) out[i] = buf.readInt16LE(at + 8 + i * 2 * channels) / 32768;
      return out;
    }
    at += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

export function writeWavStereo16(track: Track): Buffer {
  const n = track.samples.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(2, 22); // stereo
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.round(Math.max(-1, Math.min(1, track.samples[i])) * 32767);
    buf.writeInt16LE(v, 44 + i * 4);
    buf.writeInt16LE(v, 46 + i * 4);
  }
  return buf;
}
