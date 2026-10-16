// Predicts what the car shows for a given sequence, light by light, using the
// behavior measured by the probe. The viewer renders this, not the raw values, so
// what you review is what the car will do.

import { CLOSURE, frameCount, getValue, type Sequence } from "@lightshow/core";
import type { Closure, Light, Profile } from "./profile.ts";

/** Ramp duration in ms for a ramp code, by band; 0 means instant. Measured on a 2027 Model 3. */
export function rampTarget(v: number): { on: boolean; ms: number } {
  if (v === 0) return { on: false, ms: 0 };
  if (v < 39) return { on: false, ms: 350 }; // 26 = off 500
  if (v < 64) return { on: false, ms: 1000 }; // 51 = off 1000
  if (v < 128) return { on: false, ms: 2000 }; // 77 = off 2000
  if (v < 192) return { on: true, ms: 2000 }; // 179 = on, slow
  if (v < 217) return { on: true, ms: 1000 }; // 204
  if (v < 243) return { on: true, ms: 500 }; // 230 = on, fast
  return { on: true, ms: 0 };
}

export interface SimLight {
  id: string;
  /** Brightness 0-1 per frame. */
  level: Float32Array;
  /** For RGB lights, 0-255 per frame per component. */
  rgb?: [Uint8Array, Uint8Array, Uint8Array];
}

export function simulate(seq: Sequence, profile: Profile): SimLight[] {
  const frames = frameCount(seq);
  const step = seq.stepMs;
  return profile.lights.map((light: Light) => {
    const level = new Float32Array(frames);
    if (light.behavior === "rgb") {
      const rgb: [Uint8Array, Uint8Array, Uint8Array] = [new Uint8Array(frames), new Uint8Array(frames), new Uint8Array(frames)];
      for (let f = 0; f < frames; f++) {
        let max = 0;
        light.channels.forEach((c, i) => { const v = getValue(seq, f, c); rgb[i][f] = v; max = Math.max(max, v); });
        level[f] = max / 255;
      }
      return { id: light.id, level, rgb };
    }
    // Several channels driving one light combine as OR (the highest value wins).
    const value = (f: number) => Math.max(...light.channels.map((c) => getValue(seq, f, c)));
    let cur = 0;
    for (let f = 0; f < frames; f++) {
      const v = value(f);
      if (light.behavior === "full") cur = v / 255;
      else if (light.behavior === "onOff") cur = v >= 128 ? 1 : 0;
      else {
        const { on, ms } = rampTarget(v);
        const target = on ? 1 : 0;
        cur = ms === 0 ? target : cur + Math.sign(target - cur) * Math.min(Math.abs(target - cur), step / ms);
      }
      level[f] = cur;
    }
    return { id: light.id, level };
  });
}

export interface SimClosure {
  id: string;
  /** 0 = closed, 1 = fully open, per frame. */
  position: Float32Array;
  /** 1 while the closure is dancing, per frame. */
  dancing: Uint8Array;
}

/**
 * Closure movement from the show's commands, following Tesla's rules: a command
 * takes effect when the channel changes to it; open and close run to the end even if
 * the channel returns to idle; stop freezes; dance oscillates while held (windows
 * dance from any position, other closures only once open).
 */
export function simulateClosures(seq: Sequence, profile: Profile): SimClosure[] {
  const n = frameCount(seq);
  const step = seq.stepMs;
  return (profile.closures ?? []).map((c: Closure) => {
    const position = new Float32Array(n), dancing = new Uint8Array(n);
    // Mirrors start unfolded (open); everything else starts closed.
    let pos = c.kind === "mirror" ? 1 : 0, target: number | null = null, prev = 0, danceT = 0, danceFrom = 0;
    for (let f = 0; f < n; f++) {
      const v = c.channel <= seq.channelCount ? getValue(seq, f, c.channel) : 0;
      if (v !== prev) {
        if (v === CLOSURE.open) target = 1;
        else if (v === CLOSURE.close) target = 0;
        else if (v === CLOSURE.stop) target = null;
      }
      prev = v;
      // Windows dance from any position; others only once open. A dance that has
      // started keeps going while the command is held.
      const canDance = c.dance && v === CLOSURE.dance && (danceT > 0 || c.kind === "window" || pos > 0.95);
      if (canDance) {
        // Oscillate between two positions, about a second per swing, starting from
        // wherever the closure is (a lowered window shimmies, it doesn't snap shut).
        if (danceT === 0) danceFrom = pos;
        danceT += step;
        const swing = 0.5 - 0.5 * Math.cos((danceT / 1100) * Math.PI);
        // Windows swing partway down and back; the trunk bobs near fully open; the
        // charge port door stays open and only its LED flashes rainbow (Tesla README).
        pos = c.kind === "window"
          ? danceFrom < 0.35 ? danceFrom + 0.35 * swing : danceFrom - 0.35 * swing
          : c.kind === "chargePort" ? 1 : 1 - 0.3 * swing;
        dancing[f] = 1;
        target = null;
      } else {
        danceT = 0;
        if (target !== null) {
          const ms = target > pos ? c.openMs : c.closeMs;
          pos += Math.sign(target - pos) * Math.min(Math.abs(target - pos), step / ms);
          if (pos === target) target = null;
        }
      }
      position[f] = pos;
    }
    return { id: c.id, position, dancing };
  });
}
