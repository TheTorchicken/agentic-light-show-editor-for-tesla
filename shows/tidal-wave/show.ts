// Tidal Wave: choreography for a 2027 Model 3. See PLAN.md.
//
// The analyzer reports 100 BPM; the song is really 150 BPM (beat 0.4 s, bar 1.6 s)
// on a fixed grid starting at 0.16 s. This script builds its own grid and does not
// use s.beats() / s.downbeats().

import type { Palette, RGB, Show } from "@lightshow/show";

// ---- grid ---------------------------------------------------------------------
const T0 = 0.16;
const BEAT = 0.4;
const BAR = 1.6;
const gridOf = (a: number, b: number, step: number): number[] => {
  const out: number[] = [];
  for (let k = Math.ceil((a - T0) / step - 1e-6); ; k++) {
    const t = +(T0 + k * step).toFixed(3);
    if (t >= b - 1e-6) break;
    if (t >= 0) out.push(t);
  }
  return out;
};
const beats = (a: number, b: number) => gridOf(a, b, BEAT);
const eighths = (a: number, b: number) => gridOf(a, b, BEAT / 2);
const sixteenths = (a: number, b: number) => gridOf(a, b, BEAT / 4);
const bars = (a: number, b: number) => gridOf(a, b, BAR);
/** Beat position inside the bar, 0-3. */
const inBar = (t: number) => ((Math.round((t - T0) / BEAT) % 4) + 4) % 4;

// ---- lights -------------------------------------------------------------------
const OUTER = ["outerL", "outerR"];
const INNER = ["innerL", "innerR"];
const DRL = ["drlL", "drlR"];
const TURN_F = ["turnFL", "turnFR"];
const REPEATERS = ["repeaterL", "repeaterR"];
const TAILS = ["tailL", "tailR"];
const TURN_R = ["turnRL", "turnRR"];
const FRONT = [...OUTER, ...INNER, ...DRL, ...TURN_F, ...REPEATERS];
const REAR = ["brake", ...TAILS, ...TURN_R, "reverse", "rearFog", "plate"];
const EXTERIOR = [...FRONT, ...REAR];
// The accents form an upside-down U, in this order; the screen sits below the center.
const U = ["accentLeftRear", "accentLeftFront", "accentFront", "accentRightFront", "accentRightRear"];
const U_LEFT = ["accentLeftRear", "accentLeftFront"];
const U_RIGHT = ["accentRightFront", "accentRightRear"];
const U_FRONT = ["accentLeftFront", "accentFront", "accentRightFront"];
const U_REAR = ["accentLeftRear", "accentRightRear"];
const SCREEN = "screen";
const INTERIOR = [SCREEN, ...U];
/** Amber diagonal around the car, and its mirror image. */
const DIAG = [["turnFL"], ["turnRR"], ["turnFR"], ["turnRL"]];
const DIAG_REV = [["turnFR"], ["turnRL"], ["turnFL"], ["turnRR"]];
/** A wave that travels around the car: front left → front right → rear right → rear left. */
const SWEEP = [["outerL", "drlL"], ["outerR", "drlR"], ["tailR", "turnRR"], ["tailL", "turnRL"]];
const MIRRORS = [35, 36];
const WINDOWS = [37, 38, 39, 40]; // LF, LR, RF, RR
const TRUNK = 41;
const CHARGE_PORT = 46;

/** Position along the U for step i, bouncing at both ends: 0 1 2 3 4 3 2 1 0 ... */
const bounce = (i: number) => { const k = i % 8; return k < 5 ? k : 8 - k; };
const dim = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const BLACK: RGB = [0, 0, 0];

// Used only when show.json has no theme. This song's theme is cyan and purple.
const DEFAULT_PALETTE: Palette = {
  calm: [0, 229, 255], rise: [0, 229, 255], pulse: [0, 229, 255],
  alt: [138, 43, 226], flash: [138, 43, 226], accent: [69, 136, 240],
  mellow: [0, 229, 255], cool: [138, 43, 226],
  cycle: [[0, 229, 255], [69, 136, 240], [0, 229, 255], [138, 43, 226]],
  glow: [90, 108, 236],
};

export default function tidalWave(s: Show) {
  windows(s);
  const P = s.palette(DEFAULT_PALETTE);
  const CY = P.pulse; // cyan: the lead
  const PU = P.alt; // purple: the answer
  const BL = P.accent; // the blend between them
  const tween = (k: number): RGB => [CY[0] + (PU[0] - CY[0]) * k, CY[1] + (PU[1] - CY[1]) * k, CY[2] + (PU[2] - CY[2]) * k];

  // ---- helpers --------------------------------------------------------------
  /** A crest that travels along the U and bounces, one segment per time. */
  const wave = (times: number[], color: RGB, decayMs: number, base: RGB, dir = 1) =>
    times.forEach((t, i) => s.pulse(U[dir > 0 ? bounce(i) : 4 - bounce(i)], [t], color, decayMs, base));
  const sideSwap = (times: number[], a: RGB, b: RGB, decayMs: number, base: RGB) =>
    times.forEach((t, i) => s.pulse(i % 2 ? U_RIGHT : U_LEFT, [t], i % 2 ? b : a, decayMs, base));
  const frontBack = (times: number[], front: RGB, rear: RGB, decayMs: number, base: RGB) =>
    times.forEach((t, i) => s.pulse(i % 2 ? U_REAR : U_FRONT, [t], i % 2 ? rear : front, decayMs, base));
  /** Hard RGB strobe: color for `duty` of each period, then base. */
  const rgbStrobe = (ids: string | string[], t0: number, t1: number, periodMs: number, colors: RGB[], base: RGB = BLACK, duty = 0.5) => {
    let i = 0;
    for (let t = t0; t < t1 - 1e-3; t += periodMs / 1000, i++) {
      const on = Math.min((periodMs * duty) / 1000, t1 - t);
      s.color(ids, t, t + on, colors[i % colors.length]);
      s.color(ids, t + on, Math.min(t + periodMs / 1000, t1), base);
    }
  };
  /** Call fn at times that get closer together: a riser. */
  const accel = (t0: number, t1: number, startMs: number, minMs: number, k: number, fn: (t: number, i: number, periodMs: number) => void) => {
    let t = t0, p = startMs, i = 0;
    while (t < t1 - 1e-3) { fn(t, i++, p); t += p / 1000; p = Math.max(minMs, p * k); }
  };
  /** Vocal phrases from the vocal stem: [start, end] where the smoothed energy is up. */
  const vocalPhrases = (a: number, b: number, thr = 0.25): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    let start: number | null = null;
    for (let t = a; t < b; t += 0.05) {
      let sum = 0;
      for (let d = -0.15; d <= 0.11; d += 0.05) sum += s.energyAt(Math.max(0, t + d), "vocals");
      const up = sum / 6 > thr;
      if (up && start === null) start = t;
      if ((!up || t + 0.05 >= b) && start !== null) {
        if (t - start >= 0.2) {
          const last = out[out.length - 1];
          if (last && start - last[1] < 0.3) last[1] = t; else out.push([start, t]);
        }
        start = null;
      }
    }
    return out;
  };
  /** The car's eyes sing: DRL fades with each vocal phrase. Long phrases are split into
   *  1.6 s breaths that alternate sides, so the eyes never just sit on. */
  const singingEyes = (a: number, b: number, opts: { both?: boolean; thr?: number; maxHold?: number } = {}) => {
    let side = 0;
    for (const [p0, p1] of vocalPhrases(a, b, opts.thr)) {
      for (let t = p0; t < p1 - 0.15; t += BAR) {
        const end = Math.min(p1, t + BAR, t + (opts.maxHold ?? BAR));
        const ids = opts.both ? DRL : DRL[side++ % 2];
        s.fadeIn(ids, t, 500, Math.max(t + 0.3, end - 0.1)).fadeOut(ids, Math.max(t + 0.3, end - 0.1), 1000);
      }
    }
  };
  /** Screen brightness follows the vocal envelope, in the given color. */
  const screenVoice = (t0: number, t1: number, color: RGB, floor = 0.08, gain = 1.4) => {
    for (let t = t0; t < t1 - 1e-3; t += 0.05) {
      const k = Math.min(1, floor + gain * s.energyAt(t, "vocals"));
      s.color(SCREEN, t, Math.min(t1, t + 0.05), dim(color, k));
    }
  };

  // ============================================================================
  // Opening 0:00-0:39. The song starts strong, so the show does too, with its own
  // motifs (ripples, surf, rising tide). The drop still steps up: four-on-the-floor
  // outer beams and the rear clap mapping are held back until 0:41.
  // ============================================================================
  // Intro 0:00-0:13: vocal and pad, no drums. Ripples on every beat, a surge per phrase.
  {
    const a = 0.16, b = 12.96;
    const INTRO_PHRASES: Array<[number, number]> = [[0.16, 3.45], [3.36, 6.65], [6.56, 9.85], [9.76, 12.9]];
    // First second: the whole car surges on.
    s.on([...OUTER, "brake", ...TAILS, ...TURN_R], a, a + 0.18);
    s.hit([...INNER, ...TURN_F], a, 180, 1000);
    // Front ripple: the eyes ping-pong on every beat.
    beats(a, b).forEach((t, i) => s.flash(DRL[i % 2], t, 130));
    // Each phrase: one inner beam surges (alternating), an outer blink marks it.
    INTRO_PHRASES.forEach(([p0], i) => {
      s.fadeIn(INNER[i % 2], p0 + 0.05, 500, p0 + 0.9).fadeOut(INNER[i % 2], p0 + 0.9, 1000);
      s.flash(OUTER[i % 2], p0, 90);
    });
    // Amber surf: front turns swell on alternate bars, rear turns answer on beat 4.
    bars(a, b).forEach((d, i) => {
      s.fadeIn(TURN_F[i % 2], d, 500, d + 0.4).fadeOut(TURN_F[i % 2], d + 0.4, 350);
      s.flash(TURN_R[(i + 1) % 2], d + 1.2, 160);
      s.flash("brake", d, 140);
    });
    // Rear heartbeat: tails alternate on beats 2 and 3, plate ticks the off-beat.
    beats(a, b).forEach((t) => { const q = inBar(t); if (q === 1) s.flash("tailL", t, 130); if (q === 2) s.flash("tailR", t, 130); if (q === 3) s.flash("plate", t + 0.2, 70); });
    // Last bar: repeaters roll into the verse.
    eighths(11.36, b).forEach((t, i) => s.flash(REPEATERS[i % 2], t, 50));

    // Screen: a bright cyan surge on each phrase, purple ripples on every beat.
    s.color(SCREEN, 0, a, BLACK);
    INTRO_PHRASES.forEach(([p0, p1]) => s.color(SCREEN, p0, p1, CY, dim(BL, 0.3)));
    beats(a, b).forEach((t, i) => s.pulse(SCREEN, [t], i % 4 === 0 ? CY : PU, 260, dim(BL, 0.3 + 0.3 * ((i % 8) / 8))));
    rgbStrobe(SCREEN, 11.36, b, 100, [CY, PU], dim(BL, 0.2), 0.5);
    s.color(SCREEN, a, a + 0.25, CY);
    // U: a bright crest rides along the U on every beat over a purple sea.
    s.color(U, 0, b, dim(PU, 0.18));
    wave(beats(a, b), CY, 420, dim(PU, 0.18));
    s.pulse(U, bars(a, b), dim(PU, 0.9), 300, dim(PU, 0.18));
  }

  // Verse 1 0:13-0:26: surf. The syncopated kick crosses the car, hats on the repeaters.
  {
    const a = 12.96, b = 25.76;
    bars(a, b).forEach((d, i) => {
      const side = i % 2;
      s.flash(["brake", OUTER[side]], d, 140);
      s.flash([TAILS[side], OUTER[1 - side]], d + 0.6, 120);
      s.flash(TURN_R[side], d + 0.8, 140);
      s.flash("reverse", d + 1.2, 90);
      if (side === 0) s.hit(INNER[(i / 2) % 2], d, 100, 1000);
    });
    s.chase(DIAG, beats(a, b), 150);
    eighths(a, b).forEach((t, i) => { const e = i % 8; if (e !== 0 && e !== 3) s.flash(REPEATERS[i % 2], t, 40); });
    singingEyes(a, b, { maxHold: 0.5 });
    // Screen: full cyan on the first kick, full purple on the second, eighth flicker between.
    s.color(SCREEN, a, b, dim(BL, 0.2));
    eighths(a, b).forEach((t) => s.pulse(SCREEN, [t], dim(BL, 0.55), 140, dim(BL, 0.2)));
    bars(a, b).forEach((d) => { s.pulse(SCREEN, [d], CY, 420, dim(BL, 0.2)); s.pulse(SCREEN, [d + 0.6], PU, 420, dim(BL, 0.2)); });
    // U: sides swap on the kicks, the center glows with the voice.
    s.color(U, a, b, dim(CY, 0.12));
    sideSwap(bars(a, b).flatMap((d) => [d, d + 0.6]), CY, PU, 500, dim(CY, 0.12));
    wave(beats(a, b).filter((t) => inBar(t) % 2 === 1), BL, 300, dim(CY, 0.12));
    for (let t = a; t < b; t += 0.1) s.color("accentFront", t, t + 0.1, mixRGB(dim(CY, 0.15), CY, Math.min(1, 1.5 * s.energyAt(t, "vocals"))));
  }

  // Build 0:26-0:37: rising tide. Front and rear answer each other, beats then eighths.
  {
    const a = 25.76, half = 32.16, b = 36.96;
    // Front alternates sides; the rear answers with brake, then the tails.
    const hitAt = (i: number) => (i % 2 ? (i % 4 === 1 ? ["brake"] : TAILS) : (i % 4 === 0 ? ["drlL", "turnFL"] : ["drlR", "turnFR"]));
    beats(a, half).forEach((t, i) => s.flash(hitAt(i), t, 140));
    eighths(half, b).forEach((t, i) => s.flash(hitAt(i), t, 120));
    bars(a, b).forEach((d, i) => { s.hit(INNER[i % 2], d, 100, 1000); if (i >= 2) s.flash(OUTER[i % 2], d + 0.8, 80); });
    s.chase(DIAG_REV, eighths(a, half).filter((_, i) => i % 2), 120);
    sixteenths(half, b).forEach((t, i) => i % 2 && s.flash(i % 4 === 1 ? REPEATERS : "plate", t, 40));
    // Screen: eighths drifting from cyan to purple, brighter every bar.
    const et = eighths(a, b);
    et.forEach((t, i) => { const k = i / et.length; const c = mixRGB(CY, PU, k); s.pulse(SCREEN, [t], i % 2 ? dim(c, 0.6 + 0.4 * k) : c, 180, dim(c, 0.15 + 0.2 * k)); });
    // U: front arc answers the rear pair, with the exterior.
    s.color(U, a, b, dim(PU, 0.15));
    frontBack(beats(a, half), CY, PU, 380, dim(PU, 0.15));
    frontBack(eighths(half, b), CY, PU, 200, dim(PU, 0.2));
  }

  // ============================================================================
  // Verse 1 0:13-0:26 and Verse 2 1:17-1:30. Heartbeat and singing eyes.
  // ============================================================================
  const verse = (a: number, b: number, lead: RGB, answer: RGB, second: boolean) => {
    bars(a, b).forEach((d, i) => {
      const strong = i % 2 === 0;
      // Syncopated kick: bar start and 1.5 beats later.
      s.flash("brake", d, strong ? 140 : 90);
      s.flash(TAILS[i % 2], d + 0.6, 120);
      if (strong) s.flash(OUTER[(i / 2) % 2], d, 70);
      // Snare texture on beat 4: plate tick.
      s.flash("plate", d + 1.2, 60);
      // Screen: lead color on the first kick, answer on the second.
      s.pulse(SCREEN, [d], strong ? lead : dim(lead, 0.7), 520, dim(lead, 0.12));
      s.pulse(SCREEN, [d + 0.6], dim(answer, strong ? 0.85 : 0.6), 480, dim(lead, 0.12));
      s.pulse(SCREEN, [d + 1.2], dim(answer, 0.35), 300, dim(lead, 0.12));
    });
    singingEyes(a, b);
    if (second) {
      // Rear turns answer the end of each vocal phrase, alternating sides.
      vocalPhrases(a, b).forEach(([, p1], i) => s.flash(TURN_R[i % 2], p1, 200));
      s.color(U, a, b, dim(lead, 0.08));
      frontBack(bars(a, b).flatMap((d) => [d, d + 0.6]), lead, answer, 700, dim(lead, 0.08));
    } else {
      s.color(U, a, b, dim(lead, 0.08));
      sideSwap(bars(a, b).flatMap((d) => [d, d + 0.6]), lead, answer, 700, dim(lead, 0.08));
    }
    // The center accent glows with the voice.
    for (let t = a; t < b; t += 0.1) s.color("accentFront", t, t + 0.1, dim(lead, Math.min(1, 0.08 + s.energyAt(t, "vocals"))));
  };

  // ============================================================================
  // Builds 0:26-0:37 and 1:30-1:41. The wave starts circling.
  // ============================================================================
  const build = (a: number, b: number, from: RGB, to: RGB, dir: number) => {
    const half = a + BAR * 4;
    const chase = dir > 0 ? DIAG : DIAG_REV;
    s.chase(chase, beats(a, half), 260);
    s.chase(chase, eighths(half, b), 160);
    bars(a, b).forEach((d, i) => {
      s.flash("brake", d, 140);
      if (i >= 2) s.flash(OUTER[i % 2], d, 90);
      if (i >= 4) s.flash(OUTER[(i + 1) % 2], d + 0.8, 70);
    });
    beats(a, b).forEach((t) => inBar(t) % 2 === 1 && s.flash(TAILS[Math.round((t - T0) / BEAT / 2) % 2], t, 110));
    eighths(half, b).forEach((t, i) => i % 2 && s.flash(REPEATERS[(i >> 1) % 2], t, 40));
    singingEyes(a, b, { thr: 0.3 });
    // Inner beams breathe up across the last two bars.
    s.fadeIn(INNER, b - BAR * 2, 2000, b - BAR - 0.1).fadeOut(INNER, b - BAR - 0.1, 350);

    // Screen: the color drifts from one theme color to the other, pulses get denser.
    const bt = beats(a, half);
    bt.forEach((t, i) => { const k = i / bt.length; s.pulse(SCREEN, [t], dim(mixRGB(from, to, k * 0.5), 0.6 + 0.4 * k), 360, dim(mixRGB(from, to, k * 0.5), 0.12)); });
    const et = eighths(half, b);
    et.forEach((t, i) => { const k = 0.5 + 0.5 * (i / et.length); s.pulse(SCREEN, [t], i % 2 ? dim(mixRGB(from, to, k), 0.7) : mixRGB(from, to, k), 180, dim(mixRGB(from, to, k), 0.15)); });
    // U: crest on beats, then on eighths.
    s.color(U, a, b, dim(from, 0.08), dim(to, 0.15));
    wave(beats(a, half), from, 600, dim(from, 0.08), dir);
    wave(eighths(half, b), to, 300, dim(to, 0.15), dir);
  };

  // Riser bars (36.96-38.56 and 100.96-102.56): vocal spike then a snare roll.
  const riser = (a: number) => {
    const b = a + BAR;
    s.fadeIn(DRL, a + 0.4, 500, b - 0.05);
    accel(a, b, 320, 80, 0.85, (t, i, p) => s.flash(i % 2 ? ["brake", "reverse"] : OUTER, t, Math.max(40, p * 0.45)));
    s.color(U, a, b, dim(PU, 0.2), PU);
    accel(a, b, 300, 50, 0.85, (t, i) => s.pulse(U[bounce(i)], [t], CY, 160, dim(PU, 0.3)));
    s.color(SCREEN, a, b, dim(PU, 0.1), dim(PU, 0.4));
    accel(a, b, 320, 50, 0.85, (t, i, p) => s.pulse(SCREEN, [t], i % 2 ? CY : PU, Math.max(30, p * 0.5), dim(PU, 0.2)));
  };
  riser(36.96);

  // Pre-drop hit (38.56 / 102.56): everything snaps on, then darkness until the drop.
  const crash = (t: number, flickers: number[], darkFrom: number, drop: number) => {
    s.on([...OUTER, "brake", "reverse", ...TAILS, ...TURN_R, ...REPEATERS], t, t + 0.15);
    s.hit([...INNER, ...DRL, ...TURN_F], t, 150, 1000);
    s.color(INTERIOR, t, t + 0.12, PU);
    s.color(INTERIOR, t + 0.12, t + 0.9, PU, BLACK);
    flickers.forEach((f, i) => { s.flash(i % 2 ? "plate" : REPEATERS, f, 60); s.pulse(SCREEN, [f], dim(CY, 0.6), 120, BLACK); });
    s.off(EXTERIOR, darkFrom, drop);
    return drop;
  };
  crash(38.56, [38.87, 39.15], 39.36, 41.13);
  // In the gap the screen only flickers with the stray hits, then goes fully black.
  s.off(INTERIOR, 39.36, 41.13);
  [39.68, 39.94, 40.16].forEach((f) => s.pulse(SCREEN, [f], dim(CY, 0.35), 150, BLACK));

  // ============================================================================
  // Drop 1 0:41-1:04. Breakers: kicks walk left to right, claps land at the rear.
  // ============================================================================
  const breakers = (a: number, b: number, opts: { chase?: boolean; hats?: boolean }) => {
    beats(a, b).forEach((t) => {
      const q = inBar(t);
      if (q === 0) s.flash(["outerL", "tailL"], t, 160);
      if (q === 2) s.flash(["outerR", "tailR"], t, 160);
      if (q === 1) s.flash(["brake", "reverse"], t, 160).flash(DRL, t, 140).flash("turnFL", t, 120);
      if (q === 3) s.flash(["brake", "plate"], t, 160).flash(DRL, t, 140).flash("turnFR", t, 120);
    });
    bars(a, b).forEach((d, i) => s.hit(INNER[i % 2], d, 100, 1000));
    if (opts.chase) s.chase(DIAG, eighths(a, b).filter((_, i) => i % 2), 150);
    if (opts.hats) eighths(a, b).forEach((t, i) => i % 2 && s.flash(REPEATERS[(i >> 1) % 2], t, 40));
  };
  const drop1 = (a: number, b: number, dense: boolean) => {
    // Screen: cyan kick, purple clap, bright on the downbeat.
    beats(a, b).forEach((t) => {
      const q = inBar(t);
      s.pulse(SCREEN, [t], q === 0 ? CY : q % 2 ? PU : dim(CY, 0.8), 300, dim(q % 2 ? PU : CY, 0.12));
    });
    if (dense) eighths(a, b).forEach((t, i) => i % 2 && s.pulse(SCREEN, [t], dim(BL, 0.45), 120, dim(CY, 0.12)));
    // U: crest on eighths over a dim purple sea; claps flash the rear pair.
    s.color(U, a, b, dim(PU, 0.15));
    wave(eighths(a, b), CY, 260, dim(PU, 0.15));
    s.pulse(U_REAR, beats(a, b).filter((t) => inBar(t) % 2 === 1), PU, 220, dim(PU, 0.15));
  };
  // The slam.
  s.closure(MIRRORS, 41.13, "close");
  // Windows started down at 37.1 (~4 s) so the music pours out on the drop.
  s.on([...OUTER, "brake", "reverse", ...TAILS], 41.13, 41.3);
  s.hit([...INNER, ...DRL], 41.13, 150, 1000);
  s.color(INTERIOR, 41.13, 41.36, CY);
  breakers(41.36, 49.76, { chase: false, hats: false });
  drop1(41.36, 49.76, false);
  // Fill bar 49.76-51.36: strip down to the brake, the screen strobes.
  beats(49.76, 51.36).forEach((t) => s.flash("brake", t, 100));
  s.color(U, 49.76, 51.36, dim(PU, 0.1));
  rgbStrobe(SCREEN, 49.76, 51.36, 100, [CY, PU], BLACK, 0.5);
  s.fadeIn(DRL, 49.76, 1000, 51.2).fadeOut(DRL, 51.2, 350);
  // Second phrase: add the chase and the hats.
  s.on([...OUTER, "brake", ...TAILS], 51.36, 51.5);
  breakers(51.36, 62.56, { chase: true, hats: true });
  drop1(51.36, 62.56, true);
  // Last bar: accelerating front/rear strobe into the breakdown.
  accel(62.56, 64.16, 300, 80, 0.85, (t, i, p) => s.flash(i % 2 ? ["brake", "tailL", "tailR"] : [...OUTER, ...REPEATERS], t, Math.max(40, p * 0.45)));
  s.color(U, 62.56, 64.16, dim(PU, 0.2), PU);
  accel(62.56, 64.16, 300, 50, 0.85, (t, i, p) => s.pulse(SCREEN, [t], i % 2 ? PU : CY, Math.max(30, p * 0.5), BLACK));

  // ============================================================================
  // Breakdown 1:04-1:15. Bass. The tide goes out.
  // ============================================================================
  const halfTime = (a: number, b: number, layers: number) => {
    bars(a, b).forEach((d, i) => {
      s.flash("brake", d, 150);
      if (layers >= 2) { s.flash(TAILS[i % 2], d + 0.6, 110); s.flash(TAILS[(i + 1) % 2], d + 1.2, 110); }
      if (layers >= 3) s.flash("plate", d + 1.4, 60);
      // Bass swell: front turn on one side per bar.
      if (layers >= 1) s.fadeIn(TURN_F[i % 2], d, 1000, d + 0.9).fadeOut(TURN_F[i % 2], d + 0.9, 1000);
    });
  };
  s.closure(MIRRORS, 64.16, "open");
  s.on([...OUTER, "brake"], 64.16, 64.3);
  s.fadeIn(INNER, 64.16, 500, 64.4).fadeOut(INNER, 64.4, 2000);
  halfTime(64.16, 72.16, 3);
  halfTime(72.16, 75.36, 1);
  s.fadeIn(DRL, 64.6, 1000, 65.6).fadeOut(DRL, 65.6, 2000);
  s.fadeIn("drlL", 68.96, 1000, 69.8).fadeOut("drlL", 69.8, 2000);
  s.fadeIn("drlR", 70.56, 1000, 71.4).fadeOut("drlR", 71.4, 2000);
  // Screen: purple swells once per bar with the bass, cyan glints on the snare.
  bars(64.16, 75.36).forEach((d) => {
    const k = 0.25 + 0.75 * Math.min(1, s.energyAt(d + 0.3, "bass") * 1.6);
    s.color(SCREEN, d, d + 0.5, dim(PU, 0.15), dim(PU, k)).color(SCREEN, d + 0.5, d + BAR, dim(PU, k), dim(PU, 0.15));
    s.pulse(SCREEN, [d + 0.6, d + 1.2], dim(CY, 0.55), 200, dim(PU, 0.2));
  });
  s.color(U, 64.16, 75.36, dim(PU, 0.12));
  wave(beats(64.16, 75.36), PU, 900, dim(PU, 0.12), -1);

  // Hush 1:15-1:17: almost nothing, the voice glows.
  s.off(EXTERIOR, 75.36, 76.96);
  s.flash("tailL", 75.36, 150);
  s.fadeIn(DRL, 76.0, 1000, 76.8).fadeOut(DRL, 76.8, 350);
  s.flash("tailR", 76.4, 150);
  s.color(INTERIOR, 75.36, 76.96, dim(CY, 0.04));
  screenVoice(75.36, 76.96, CY, 0.05, 1.0);

  // ============================================================================
  // Verse 2 1:17-1:30, build 2 1:30-1:41: same ideas, purple leads, reversed wave.
  // ============================================================================
  verse(76.96, 89.76, PU, CY, true);
  build(89.76, 100.96, PU, CY, -1);
  riser(100.96);
  crash(102.56, [102.88, 103.15], 103.36, 105.14);

  // A cappella 103.36-105.14: only the voice. DRL and screen follow it, then black.
  s.off(INTERIOR, 103.36, 105.14);
  s.fadeIn(DRL, 103.4, 500, 104.3).fadeOut(DRL, 104.3, 350);
  s.fadeIn("drlR", 104.5, 500, 104.75).fadeOut("drlR", 104.75, 350);
  screenVoice(103.36, 104.76, CY, 0.0, 1.2);
  s.color(U_FRONT, 103.36, 104.76, dim(PU, 0.12));

  // ============================================================================
  // Drop 2 1:45-2:10. Riptide: kicks cross the car diagonally, the eyes sing.
  // ============================================================================
  const riptide = (a: number, b: number) => {
    beats(a, b).forEach((t) => {
      const q = inBar(t);
      if (q === 0) s.flash(["outerL", "tailR"], t, 160);
      if (q === 2) s.flash(["outerR", "tailL"], t, 160);
      if (q === 1) s.flash(["brake", "reverse"], t, 160).flash("rearFog", t + 0.2, 100).flash("turnFR", t, 140);
      if (q === 3) s.flash(["brake", "plate"], t, 160).flash("rearFog", t + 0.2, 100).flash("turnFL", t, 140);
    });
    s.chase(DIAG_REV, eighths(a, b).filter((_, i) => i % 2), 180);
    eighths(a, b).forEach((t, i) => i % 2 && i % 4 !== 1 && s.flash(REPEATERS[(i >> 2) % 2], t, 50));
    singingEyes(a, b, { thr: 0.3 });
    bars(a, b).forEach((d, i) => { const side = INNER[i % 2]; if (i % 2 === 0) s.fadeIn(side, d, 500, d + 0.6).fadeOut(side, d + 0.6, 1000); else s.hit(side, d, 120, 1000); });
    // Screen: cyan/purple per beat, brightness rides the voice.
    beats(a, b).forEach((t) => {
      const q = inBar(t);
      const c = q % 2 ? PU : CY;
      const base = dim(BL, Math.min(0.45, 0.1 + 0.6 * s.energyAt(t + 0.1, "vocals")));
      s.pulse(SCREEN, [t], c, 320, base);
    });
    // U: claps swap sides, kicks light the center.
    s.color(U, a, b, dim(BL, 0.12));
    sideSwap(beats(a, b).filter((t) => inBar(t) % 2 === 1), PU, PU, 300, dim(BL, 0.12));
    s.pulse("accentFront", beats(a, b).filter((t) => inBar(t) % 2 === 0), CY, 300, dim(BL, 0.12));
  };
  // 105.14 and 105.33 are pickups: only a brake tick and a screen flicker, still dark,
  // so the real downbeat at 105.76 lands out of darkness.
  s.off(EXTERIOR, 105.14, 105.76);
  s.flash("brake", 105.14, 80).flash("brake", 105.36, 80);
  s.color(INTERIOR, 105.14, 105.76, BLACK);
  s.pulse(SCREEN, [105.14, 105.36], dim(PU, 0.5), 120, BLACK);
  s.on([...OUTER, "brake", "reverse", ...TAILS, ...TURN_R], 105.76, 105.92);
  s.hit(INNER, 105.76, 150, 350);
  s.color(INTERIOR, 105.76, 105.96, PU);
  riptide(105.96, 113.76);
  // Fill bar 113.76-115.36: strip down, screen strobes.
  s.off(EXTERIOR, 113.76, 115.36);
  beats(113.76, 115.36).forEach((t, i) => s.flash(i % 2 ? "tailR" : "tailL", t, 100).flash(DRL[i % 2], t, 80));
  rgbStrobe(SCREEN, 113.76, 115.36, 100, [PU, CY], BLACK, 0.5);
  s.color(U, 113.76, 115.36, dim(PU, 0.1));
  s.on([...OUTER, "brake", ...TAILS], 115.36, 115.5);
  riptide(115.36, 128.16);
  // Last bar: repeaters and plate on sixteenths, the screen strobes, drums cut at 129.
  sixteenths(128.16, 129.0).forEach((t, i) => s.flash(i % 2 ? "plate" : REPEATERS, t, 40));
  rgbStrobe(SCREEN, 128.16, 129.0, 100, [CY, PU], dim(PU, 0.1), 0.5);

  // Break 2:09-2:11: exterior dark, one rising swell, then black before the slam.
  s.off(EXTERIOR, 129.0, 131.33);
  s.off(INTERIOR, 129.0, 131.33);
  s.color(SCREEN, 129.0, 130.9, dim(PU, 0.1), CY);
  s.color(U, 129.0, 130.9, BLACK, dim(PU, 0.5));
  s.flash("plate", 130.2, 80);
  // The front inhales with the screen: DRL rises slowly, cut just before the slam.
  s.fadeIn(DRL, 129.4, 2000, 130.9);

  // ============================================================================
  // Drop 3 2:11-2:46. Everything.
  // ============================================================================
  s.closure(MIRRORS, 131.33, "close");
  // Trunk rises for 14 s through drop 3 so it is fully up when the climax lands at 156.96.
  s.closure(TRUNK, 142.96, "open");
  // Climax: charge port opens, then dances; windows shimmy for two bars.
  s.closure(CHARGE_PORT, 155.0, "open");
  s.closure(CHARGE_PORT, 156.96, "dance", 161.76);
  s.on([...OUTER, "brake", "reverse", ...TAILS, ...TURN_R, ...REPEATERS], 131.33, 131.5);
  s.hit([...INNER, ...DRL, ...TURN_F], 131.33, 200, 1000);
  s.color(INTERIOR, 131.33, 131.5, CY);
  // 3a: drop 1's mapping plus the chase and hats; screen strobes eighths.
  const drop3a = (a: number, b: number) => {
    breakers(a, b, { chase: true, hats: true });
    eighths(a, b).forEach((t, i) => s.pulse(SCREEN, [t], i % 2 ? PU : CY, 140, dim(BL, 0.15)));
    s.color(U, a, b, dim(CY, 0.15));
    wave(eighths(a, b), PU, 260, dim(CY, 0.15), -1);
    s.pulse(U, bars(a, b), CY, 400, dim(CY, 0.15));
  };
  drop3a(131.5, 139.36);
  // Fill bar 139.36-140.96.
  beats(139.36, 140.96).forEach((t) => s.flash("brake", t, 100));
  s.fadeIn(INNER, 139.36, 2000, 140.9);
  rgbStrobe(SCREEN, 139.36, 140.96, 80, [CY, PU], BLACK, 0.5);
  s.color(U, 139.36, 140.96, dim(PU, 0.1), PU);
  drop3a(140.96, 144.16);

  // 3b: the wave sweeps around the car on every beat.
  {
    const a = 144.16, b = 156.96;
    beats(a, b).forEach((t) => {
      s.chase(SWEEP, [t, t + 0.1, t + 0.2, t + 0.3], 90);
      if (inBar(t) % 2 === 1) s.flash("brake", t, 120);
    });
    bars(a, b).forEach((d, i) => s.hit(INNER[i % 2], d, 100, 1000));
    eighths(a, b).forEach((t, i) => i % 2 && s.flash(REPEATERS[(i >> 1) % 2], t, 40));
    // Screen: each beat a cyan hit fading into purple; downbeats are strobed.
    beats(a, b).forEach((t) => s.pulse(SCREEN, [t], CY, 380, dim(PU, 0.25)));
    bars(a, b).forEach((d) => rgbStrobe(SCREEN, d, d + 0.24, 80, [CY, PU], BLACK));
    // U: the crest sweeps the U in time with the exterior sweep.
    s.color(U, a, b, dim(PU, 0.15));
    beats(a, b).forEach((t, i) => U.forEach((id, j) => s.pulse(i % 2 ? U[4 - j] : id, [t + j * 0.07], CY, 200, dim(PU, 0.15))));
  }

  // 3c: the climax, densest.
  {
    const a = 156.96, b = 164.96;
    beats(a, b).forEach((t) => {
      const q = inBar(t);
      s.flash(OUTER, t, 90);
      s.flash(q % 2 ? ["brake", "reverse"] : ["tailL", "tailR"], t, 120);
    });
    sixteenths(a, b).forEach((t, i) => i % 2 && s.flash(i % 4 === 1 ? REPEATERS : "plate", t, 40));
    s.chase(DIAG, eighths(a, b), 120);
    // The eyes ping-pong on eighths, both lit on each downbeat.
    eighths(a, b).forEach((t, i) => s.flash(DRL[i % 2], t, 150));
    bars(a, b).forEach((d) => s.flash(DRL, d, 250));
    bars(a, b).forEach((d) => s.hit(INNER, d, 120, 1000));
    // Screen strobes sixteenths, alternating the theme colors.
    rgbStrobe(SCREEN, a, b, 100, [CY, PU], dim(BL, 0.1), 0.5);
    s.color(U, a, b, dim(PU, 0.2));
    wave(sixteenths(a, b), CY, 150, dim(PU, 0.2));
  }
  // Last bar: everything accelerates, then a beat of black before the outro.
  accel(164.96, 166.16, 200, 80, 0.86, (t, i, p) => s.flash(i % 2 ? ["brake", "reverse", ...TAILS] : [...OUTER, ...REPEATERS], t, Math.max(40, p * 0.45)));
  accel(164.96, 166.16, 200, 40, 0.86, (t, i, p) => s.color(INTERIOR, t, t + Math.max(0.025, (p * 0.45) / 1000), i % 2 ? PU : CY).color(INTERIOR, t + Math.max(0.025, (p * 0.45) / 1000), t + p / 1000, BLACK));
  s.off(EXTERIOR, 166.16, 166.56);
  s.off(INTERIOR, 166.16, 166.56);

  // ============================================================================
  // Outro 2:46-2:58: half time, the tide goes out. Final image 2:58-3:01.
  // ============================================================================
  s.closure(MIRRORS, 166.56, "open");
  s.closure(CHARGE_PORT, 166.56, "close");
  s.closure(TRUNK, 174.56, "close"); // 4 s: shut by 178.6, before the final image fades
  s.on(["brake", ...OUTER], 166.56, 166.7);
  s.fadeIn(INNER, 166.56, 500, 166.9).fadeOut(INNER, 166.9, 2000);
  halfTime(166.56, 172.96, 3);
  halfTime(172.96, 176.16, 2);
  halfTime(176.16, 177.76, 1);
  s.flash("tailL", 176.96, 160).flash("tailR", 177.36, 160);
  singingEyes(166.56, 177.76, { thr: 0.3, maxHold: 0.7 });
  // Screen: purple swells per bar, settling toward cyan.
  const ob = bars(166.56, 177.76);
  ob.forEach((d, i) => {
    const k = i / ob.length;
    const c = tween(1 - k);
    s.color(SCREEN, d, d + 0.4, dim(c, 0.15), dim(c, 0.9 - 0.4 * k)).color(SCREEN, d + 0.4, d + BAR, dim(c, 0.9 - 0.4 * k), dim(c, 0.12));
    s.pulse(SCREEN, [d + 0.6, d + 1.2], dim(CY, 0.6 - 0.3 * k), 200, dim(c, 0.15));
  });
  s.color(U, 166.56, 177.76, dim(PU, 0.12), dim(CY, 0.08));
  wave(beats(166.56, 177.76), BL, 900, dim(PU, 0.1));

  // Final image: the last vocal. Eyes and beams fade up, tails hold, then all fades out.
  s.fadeIn([...DRL, ...INNER], 177.76, 2000, 179.36).fadeOut([...DRL, ...INNER], 179.36, 2000);
  s.on([...TAILS, "plate"], 178.36, 179.36);
  s.color(SCREEN, 177.76, 178.8, dim(CY, 0.2), CY).color(SCREEN, 178.8, 179.36, CY).color(SCREEN, 179.36, 181.4, CY, BLACK);
  s.color(U, 177.76, 178.8, dim(PU, 0.1), PU).color(U, 178.8, 179.36, PU).color(U, 179.36, 181.4, PU, BLACK);
  s.off([...EXTERIOR, ...INTERIOR], 181.6, 184.5);
}

function mixRGB(a: RGB, b: RGB, k: number): RGB {
  const t = Math.max(0, Math.min(1, k));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Windows: down from the start so the crowd hears the cabin speakers; they move only by
 *  dancing (swing partway up and back) at the peaks, and close after the music ends. */
function windows(s: Show) {
  const FRONT_W = [37, 39], REAR_W = [38, 40];
  s.closure(WINDOWS, 0, "open");
  s.closure(FRONT_W, 41.13, "dance", 42.73); // drop 1 slam: front glass shimmies
  s.closure(REAR_W, 105.76, "dance", 107.36); // drop 2 slam: rear glass answers
  s.closure(WINDOWS, 131.33, "dance", 132.93); // drop 3 slam: all four
  s.closure(WINDOWS, 156.96, "dance", 160.16); // climax: all four, two bars
  s.closure(WINDOWS, 180.2, "close"); // music ends ~179.5; up by ~184.2, before the audio ends
}
