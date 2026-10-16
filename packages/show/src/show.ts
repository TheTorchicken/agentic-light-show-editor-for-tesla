// The choreography vocabulary. A show script calls these with times in seconds and
// light ids from the car profile; the Show turns them into channel values that
// respect what each light can physically do.
//
// Later calls override earlier ones where they overlap, so a script can lay down a
// base pattern and then paint accents and blackouts on top.

import { CHANNEL_COUNT, CLOSURE, RAMP, createSequence, setValue, type Sequence } from "@lightshow/core";
import { mix, themePalette, type Palette, type RGB } from "./palette.ts";
import type { Light, Profile } from "./profile.ts";

export type Ids = string | string[];

export interface Analysis {
  duration: number;
  tempo: number;
  beats: number[];
  downbeats: number[];
  onsets: Record<string, Array<{ t: number; s: number }>>;
  energy: number[];
  curveStep: number;
  sections: Array<{ start: number; end: number; energy: number }>;
  stems?: Record<string, { energy: number[]; onsets: number[] }>;
  vocalPhrases?: Array<{ start: number; end: number }>;
  silences?: Array<{ start: number; length: number }>;
  tempoCandidates?: number[];
}

const WHITE: RGB = [255, 255, 255];
const RAMP_ON: Array<[ms: number, code: number]> = [[500, RAMP.on500], [1000, RAMP.on1000], [2000, RAMP.on2000]];
const RAMP_OFF: Array<[ms: number, code: number]> = [[350, RAMP.off500], [1000, RAMP.off1000], [2000, RAMP.off2000]];
const nearest = (table: Array<[number, number]>, ms: number) =>
  table.reduce((best, cur) => (Math.abs(cur[0] - ms) < Math.abs(best[0] - ms) ? cur : best));

export class Show {
  readonly stepMs = 20;
  readonly frames: number;
  readonly warnings: string[] = [];
  private values = new Map<string, Uint8Array[]>(); // per light: one array per channel
  private lights = new Map<string, Light>();
  private closures = new Map<number, Uint8Array>();

  readonly profile: Profile;
  readonly analysis: Analysis;
  /** Optional interior color theme from show.json. */
  readonly theme?: RGB[];

  constructor(profile: Profile, analysis: Analysis, durationS = analysis.duration, theme?: RGB[]) {
    this.profile = profile;
    this.analysis = analysis;
    this.theme = theme?.length ? theme : undefined;
    this.frames = Math.ceil((durationS * 1000) / this.stepMs);
    for (const l of profile.lights) {
      this.lights.set(l.id, l);
      this.values.set(l.id, l.channels.map(() => new Uint8Array(this.frames)));
    }
  }

  // ---- time helpers -------------------------------------------------------

  frame = (t: number) => Math.max(0, Math.min(this.frames, Math.round((t * 1000) / this.stepMs)));
  beats = (t0: number, t1: number) => this.analysis.beats.filter((b) => b >= t0 - 1e-3 && b < t1 - 1e-3);
  downbeats = (t0: number, t1: number) => this.analysis.downbeats.filter((b) => b >= t0 - 1e-3 && b < t1 - 1e-3);
  /** Beat grid subdivided: div=2 gives 8th notes, 4 gives 16ths. */
  grid(t0: number, t1: number, div: number): number[] {
    const out: number[] = [];
    const b = this.analysis.beats;
    for (let i = 0; i < b.length - 1; i++) {
      for (let k = 0; k < div; k++) {
        const t = b[i] + ((b[i + 1] - b[i]) * k) / div;
        if (t >= t0 - 1e-3 && t < t1 - 1e-3) out.push(t);
      }
    }
    return out;
  }
  onsets(kind: string, t0: number, t1: number, minStrength = 0): number[] {
    const list = this.analysis.onsets[kind];
    if (list) return list.filter((o) => o.t >= t0 && o.t < t1 && o.s >= minStrength).map((o) => o.t);
    const stem = this.analysis.stems?.[kind];
    if (stem) return stem.onsets.filter((t) => t >= t0 && t < t1);
    throw new Error(`No onsets named ${kind}`);
  }
  /** Stem or mix energy (0-1) at time t. */
  energyAt(t: number, stem?: string): number {
    const curve = stem ? this.analysis.stems?.[stem]?.energy : this.analysis.energy;
    if (!curve) throw new Error(`No energy curve for ${stem}`);
    return curve[Math.min(curve.length - 1, Math.round(t / this.analysis.curveStep))] ?? 0;
  }

  /** Interior colors by role: from the song's theme if it has one, else the script's defaults. */
  palette(defaults: Palette): Palette {
    return this.theme ? themePalette(this.theme) : defaults;
  }

  // ---- low level ----------------------------------------------------------

  private ids(ids: Ids): Light[] {
    return (Array.isArray(ids) ? ids : [ids]).map((id) => {
      const l = this.lights.get(id);
      if (!l) throw new Error(`Unknown light "${id}". Known: ${[...this.lights.keys()].join(", ")}`);
      return l;
    });
  }

  private write(light: Light, t0: number, t1: number, value: number | ((t: number) => number | RGB)) {
    const arrays = this.values.get(light.id)!;
    for (let f = this.frame(t0); f < this.frame(t1); f++) {
      const v = typeof value === "number" ? value : value((f * this.stepMs) / 1000);
      if (Array.isArray(v)) v.forEach((c, i) => (arrays[i][f] = clamp(c)));
      else arrays.forEach((a) => (a[f] = clamp(v)));
    }
  }

  // ---- vocabulary ---------------------------------------------------------

  /** Instant on from t0 to t1. RGB lights use `color` (default white). */
  on(ids: Ids, t0: number, t1: number, color: RGB = WHITE): this {
    for (const l of this.ids(ids)) this.write(l, t0, t1, l.behavior === "rgb" ? () => color : 255);
    return this;
  }

  /** Force dark from t0 to t1, overriding anything placed earlier. */
  off(ids: Ids, t0: number, t1: number): this {
    for (const l of this.ids(ids)) this.write(l, t0, t1, 0);
    return this;
  }

  /** Short instant flash. Respects each light's minimum visible flash. */
  flash(ids: Ids, t: number, ms = 120, color: RGB = WHITE): this {
    for (const l of this.ids(ids)) {
      const len = Math.max(ms, l.minFlashMs ?? 40, this.stepMs);
      this.write(l, t, t + len / 1000, l.behavior === "rgb" ? () => color : 255);
    }
    return this;
  }

  /** Repeated flashes between t0 and t1. Keeps at least 40 ms dark between flashes so they stay distinct. */
  strobe(ids: Ids, t0: number, t1: number, periodMs: number, onMs = periodMs / 2, color: RGB = WHITE): this {
    const on = Math.min(onMs, periodMs - 40);
    if (on <= 0) throw new Error(`Strobe period ${periodMs} ms is too short`);
    for (let t = t0; t < t1 - 1e-3; t += periodMs / 1000) this.flash(ids, t, Math.min(on, (t1 - t) * 1000), color);
    return this;
  }

  /**
   * Fade in starting at t over about `ms`, then stay on until `holdUntil`.
   * Ramp lights use the nearest ramp code (500 / 1000 / 2000 ms). Full and RGB lights
   * fade exactly. On/off lights cannot fade: they switch on halfway through and a
   * warning is recorded.
   */
  fadeIn(ids: Ids, t: number, ms: number, holdUntil = t + ms / 1000, color: RGB = WHITE): this {
    for (const l of this.ids(ids)) {
      if (l.behavior === "ramp") this.write(l, t, holdUntil, nearest(RAMP_ON, ms)[1]);
      else if (l.behavior === "full") this.write(l, t, holdUntil, (x) => Math.min(1, (x - t) / (ms / 1000)) * 255);
      else if (l.behavior === "rgb") this.write(l, t, holdUntil, (x) => scale(color, Math.min(1, (x - t) / (ms / 1000))));
      else { this.warn(`${l.id} cannot fade; fadeIn at ${t.toFixed(2)}s became a switch`); this.write(l, t + ms / 2000, holdUntil, 255); }
    }
    return this;
  }

  /**
   * Fade out starting at t over about `ms`. The light should already be on. RGB lights fade
   * from the color they have on the frame before `t`, so place their color first.
   */
  fadeOut(ids: Ids, t: number, ms: number): this {
    for (const l of this.ids(ids)) {
      const end = t + ms / 1000 + 0.06;
      if (l.behavior === "ramp") { const [rampMs, code] = nearest(RAMP_OFF, ms); this.write(l, t, t + rampMs / 1000 + 0.06, code); this.write(l, t + rampMs / 1000 + 0.06, end, 0); }
      else if (l.behavior === "full") this.write(l, t, end, (x) => Math.max(0, 1 - (x - t) / (ms / 1000)) * 255);
      else if (l.behavior === "rgb") { const arrays = this.values.get(l.id)!; const f = Math.max(0, this.frame(t) - 1); const from: RGB = [arrays[0][f], arrays[1][f], arrays[2][f]]; this.write(l, t, end, (x) => scale(from, Math.max(0, 1 - (x - t) / (ms / 1000)))); }
      else { this.warn(`${l.id} cannot fade; fadeOut at ${t.toFixed(2)}s became a switch`); this.write(l, t, t + ms / 2000, 255); this.write(l, t + ms / 2000, end, 0); }
    }
    return this;
  }

  /** Instant on at t, then fade out: a hit that rings like a cymbal. */
  /** On/off lights in the group just flash for holdMs, since they cannot decay. */
  hit(ids: Ids, t: number, holdMs: number, decayMs: number, color: RGB = WHITE): this {
    const lights = this.ids(ids);
    this.on(lights.map((l) => l.id), t, t + holdMs / 1000, color);
    const fading = lights.filter((l) => l.behavior !== "onOff").map((l) => l.id);
    return fading.length ? this.fadeOut(fading, t + holdMs / 1000, decayMs) : this;
  }

  /** Light each group in turn, one per time in `times`, each for `onMs`. */
  chase(groups: Ids[], times: number[], onMs: number): this {
    times.forEach((t, i) => this.flash(groups[i % groups.length], t, onMs));
    return this;
  }

  /** RGB lights: hold a color, or move linearly from one color to another. */
  color(ids: Ids, t0: number, t1: number, from: RGB, to: RGB = from): this {
    for (const l of this.ids(ids)) {
      if (l.behavior !== "rgb") throw new Error(`${l.id} is not an RGB light`);
      this.write(l, t0, t1, (x) => mix(from, to, (x - t0) / Math.max(1e-6, t1 - t0)));
    }
    return this;
  }

  /** RGB lights: jump to a color at each time and decay toward `base` over decayMs. */
  pulse(ids: Ids, times: number[], color: RGB, decayMs: number, base: RGB = [0, 0, 0]): this {
    for (const l of this.ids(ids)) {
      if (l.behavior !== "rgb") throw new Error(`${l.id} is not an RGB light`);
      times.forEach((t, i) => {
        const end = Math.min(t + decayMs / 1000, times[i + 1] ?? Infinity);
        this.write(l, t, end, (x) => mix(color, base, (x - t) / (decayMs / 1000)));
      });
    }
    return this;
  }

  // ---- composite moves ------------------------------------------------------
  // The patterns every show ended up writing by hand.

  /**
   * Flashes that speed up from `startMs` apart toward `minMs`, like a riser. With several
   * groups, they take turns (front, rear, front...). Returns the flash times.
   */
  accelerate(groups: Ids | Ids[], t0: number, t1: number, opts: { startMs?: number; minMs?: number; factor?: number; duty?: number; color?: RGB } = {}): number[] {
    const list: Ids[] = Array.isArray(groups) && groups.some(Array.isArray) ? (groups as Ids[]) : [groups as Ids];
    const { startMs = 300, minMs = 60, factor = 0.88, duty = 0.45, color = WHITE } = opts;
    const times: number[] = [];
    // Keep at least 40 ms dark between flashes so they stay distinct even at the fastest rate.
    for (let t = t0, p = startMs, i = 0; t < t1 - 1e-3; t += p / 1000, p = Math.max(minMs, p * factor), i++) {
      this.flash(list[i % list.length], t, Math.max(20, Math.min(p * duty, p - 40)), color);
      times.push(t);
    }
    return times;
  }

  /**
   * Move along an ordered list of lights, one step per time (e.g. around the cabin U, or
   * front-left to rear-right). `bounce` reverses at the ends instead of wrapping. RGB lights
   * pulse in `color` and decay to `base`; others flash for `onMs`.
   */
  sweep(order: string[], times: number[], opts: { bounce?: boolean; onMs?: number; color?: RGB; decayMs?: number; base?: RGB } = {}): this {
    const { bounce = true, onMs = 150, color = WHITE, decayMs = 400, base = [0, 0, 0] } = opts;
    const n = order.length, cycle = bounce ? Math.max(1, 2 * n - 2) : n;
    times.forEach((t, i) => {
      const k = i % cycle, id = order[bounce && k >= n ? cycle - k : k];
      if (this.lights.get(id)?.behavior === "rgb") this.pulse(id, [t], color, decayMs, base);
      else this.flash(id, t, onMs, color);
    });
    return this;
  }

  /** Alternate two groups (left/right, front/rear) on successive times. */
  sides(a: Ids, b: Ids, times: number[], opts: { onMs?: number; color?: RGB; decayMs?: number; base?: RGB } = {}): this {
    const { onMs = 150, color = WHITE, decayMs = 400, base = [0, 0, 0] } = opts;
    times.forEach((t, i) => {
      const g = this.ids(i % 2 ? b : a);
      const rgb = g.filter((l) => l.behavior === "rgb").map((l) => l.id), other = g.filter((l) => l.behavior !== "rgb").map((l) => l.id);
      if (rgb.length) this.pulse(rgb, [t], color, decayMs, base);
      if (other.length) this.flash(other, t, onMs, color);
    });
    return this;
  }

  /**
   * RGB lights whose brightness follows a stem's (or the mix's) energy between t0 and t1:
   * `floor` at silence, full `color` at the stem's loudest.
   */
  follow(ids: Ids, t0: number, t1: number, stem: string | undefined, color: RGB, floor = 0.08): this {
    for (const l of this.ids(ids)) {
      if (l.behavior !== "rgb") throw new Error(`follow() needs RGB lights; ${l.id} is ${l.behavior}`);
      this.write(l, t0, t1, (x) => scale(color, floor + (1 - floor) * this.energyAt(x, stem)));
    }
    return this;
  }

  /** Vocal phrases (from the vocals stem) between t0 and t1, if the analysis has them. */
  phrases(t0 = 0, t1 = Infinity): Array<{ start: number; end: number }> {
    return (this.analysis.vocalPhrases ?? []).filter((p) => p.end > t0 && p.start < t1);
  }

  /** Near-silent gaps in the mix between t0 and t1. */
  silences(t0 = 0, t1 = Infinity): Array<{ start: number; length: number }> {
    return (this.analysis.silences ?? []).filter((g) => g.start >= t0 && g.start < t1);
  }

  /**
   * Closure command (mirrors, windows, charge port, liftgate) by channel number.
   * Open, close and stop are held for 600 ms; dance is held until `until`.
   * Per-show command limits are enforced by the validator at compile time.
   */
  closure(channels: number | number[], t: number, command: "open" | "close" | "dance" | "stop", until = t + 0.6): this {
    for (const c of Array.isArray(channels) ? channels : [channels]) {
      if (!this.closures.has(c)) this.closures.set(c, new Uint8Array(this.frames));
      const a = this.closures.get(c)!;
      for (let f = this.frame(t); f < this.frame(command === "dance" ? until : t + 0.6); f++) a[f] = CLOSURE[command];
    }
    return this;
  }

  private warn(msg: string) { if (!this.warnings.includes(msg)) this.warnings.push(msg); }

  // ---- output -------------------------------------------------------------

  toSequence(meta?: Record<string, string>): Sequence {
    const seq = createSequence(CHANNEL_COUNT, this.stepMs, this.frames * this.stepMs);
    seq.meta = meta;
    for (const l of this.profile.lights) {
      const arrays = this.values.get(l.id)!;
      l.channels.forEach((c, i) => { for (let f = 0; f < this.frames; f++) if (arrays[i][f]) setValue(seq, f, c, arrays[i][f]); });
    }
    for (const [c, a] of this.closures) for (let f = 0; f < this.frames; f++) if (a[f]) setValue(seq, f, c, a[f]);
    return seq;
  }
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
