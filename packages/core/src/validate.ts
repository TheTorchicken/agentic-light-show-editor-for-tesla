// Mirrors the checks in Tesla's validator.py, plus closure budgets, so a show that
// passes here should also pass on the car. Written from Tesla's published rules,
// not copied from their (unlicensed) script.

import { CHANNELS, CLOSURE, CLOSURE_LIMITS } from "./channels.ts";
import { frameCount, getValue, type Sequence } from "./fseq.ts";

export interface ValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  durationS: number;
  closureCommands: Record<number, number>;
}

const countingCommands = new Set<number>([CLOSURE.open, CLOSURE.dance, CLOSURE.close]);

export function validate(s: Sequence): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const frames = frameCount(s);
  const durationS = (frames * s.stepMs) / 1000;

  if (s.channelCount !== 48 && s.channelCount !== 200) errors.push(`Expected 48 or 200 channels, got ${s.channelCount}`);
  if (s.stepMs < 15 || s.stepMs > 100) errors.push(`Step time ${s.stepMs} ms is outside 15-100 ms`);
  if (frames < 1) errors.push("Sequence has no frames");
  if (durationS > 4 * 3600) errors.push(`Duration ${durationS}s exceeds 4 hours`);

  // A closure command is counted when the channel changes to a counting value.
  const closureCommands: Record<number, number> = {};
  for (const info of CHANNELS) {
    if (info.kind !== "closure" || info.channel > s.channelCount) continue;
    let prev = 0;
    let n = 0;
    for (let f = 0; f < frames; f++) {
      const v = getValue(s, f, info.channel);
      if (v !== prev && countingCommands.has(v)) n++;
      prev = v;
    }
    if (n === 0) continue;
    closureCommands[info.channel] = n;
    const limitKey = Object.keys(CLOSURE_LIMITS).find((k) => info.name.includes(k));
    const limit = limitKey ? CLOSURE_LIMITS[limitKey] : undefined;
    if (limit !== undefined && n > limit) errors.push(`${info.name} (ch ${info.channel}) has ${n} commands, limit is ${limit}`);
  }

  if (s.stepMs !== 20) warnings.push(`Step time is ${s.stepMs} ms; Tesla recommends 20 ms`);
  return { ok: errors.length === 0, errors, warnings, durationS, closureCommands };
}
