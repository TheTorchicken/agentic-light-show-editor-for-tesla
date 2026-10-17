// Test Drive (John Powell, How to Train Your Dragon): choreography for a 2027 Model 3.
// See PLAN.md. Routed to skills/genres/cinematic-orchestral.md: phrases and set pieces,
// not onsets; near-dark quiet passages; the main beams carry the theme; the five big
// moments (leap, climax, second peak, last crescendo, final hit) come out of darkness
// as the whole car.

import type { Palette, RGB, Show } from "@lightshow/show";
import { DRUM, ORCH } from "./data.ts";

// ---- Light groups ----------------------------------------------------------
const OUTER = ["outerL", "outerR"];
const INNER = ["innerL", "innerR"];
const DRL = ["drlL", "drlR"];
const TURN_F = ["turnFL", "turnFR"];
const REP = ["repeaterL", "repeaterR"];
const TAILS = ["tailL", "tailR"];
const TURN_R = ["turnRL", "turnRR"];
const FRONT = [...OUTER, ...INNER, ...DRL, ...TURN_F];
const REAR = ["brake", ...TAILS, ...TURN_R, "reverse", "rearFog", "plate"];
const EXT = [...FRONT, ...REP, ...REAR];
/** One whole side of the car, front to back. */
const SIDE = [
  ["outerL", "drlL", "turnFL", "repeaterL", "tailL", "turnRL"],
  ["outerR", "drlR", "turnFR", "repeaterR", "tailR", "turnRR"],
];
const DIAGONAL = [["turnFL"], ["turnRR"], ["turnFR"], ["turnRL"]];

// Cabin: five accents in one upside-down U, the screen below its center.
const U = ["accentLeftRear", "accentLeftFront", "accentFront", "accentRightFront", "accentRightRear"];
const CAB_SIDE = [["accentLeftRear", "accentLeftFront"], ["accentRightFront", "accentRightRear"]];
const CAB_FRONT = ["accentLeftFront", "accentFront", "accentRightFront"];
const CAB_REAR = ["accentLeftRear", "accentRightRear"];
const SCREEN = "screen";
const INTERIOR = [SCREEN, ...U];
const ALL = [...EXT, ...INTERIOR];
const bounce = (i: number) => { const k = i % 8; return k < 5 ? k : 8 - k; };

// Closures
const MIRROR_L = 35, MIRROR_R = 36;
const MIRRORS = [MIRROR_L, MIRROR_R];
const WIN_FRONT = [37, 39];
const WIN_REAR = [38, 40];
const WINDOWS = [...WIN_FRONT, ...WIN_REAR];
const TRUNK = 41;
const CHARGE_PORT = 46;
/** One full window-dance swing (down → partway up → down) in the simulator. */
const SWING = 2.2;

// No theme was given. Sea and sky: ocean blue while the music waits, open-sky cyan for
// flight, brass gold, cloud white for the peaks, twilight indigo for the hushes, sunset.
const DEFAULT_PALETTE: Palette = {
  calm: [0, 40, 150], // deep ocean blue
  rise: [255, 140, 20], // dawn gold, the brass
  pulse: [0, 170, 255], // open-sky cyan
  alt: [0, 200, 160], // sea teal
  flash: [255, 255, 255], // cloud white
  accent: [255, 195, 70], // sun gold
  mellow: [70, 25, 185], // twilight indigo
  cool: [150, 215, 255], // high-altitude ice blue
  cycle: [[0, 60, 210], [0, 170, 255], [255, 170, 40], [110, 45, 230]],
  glow: [255, 175, 105], // sunset
};
const BLACK: RGB = [0, 0, 0];
const dim = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const blend = (a: RGB, b: RGB, k: number): RGB => {
  const t = Math.max(0, Math.min(1, k));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};

// ---- Key moments (s), read from the stems and the RMS curve ------------------
const T = {
  first: 0.35, hit1: 1.71, hit2: 1.98, // overture swell and the double drum hit
  A2: 19.26, // drums thin out
  rise: 30.06, // the choir rise, five bars
  riseBars: [30.06, 32.23, 34.39, 36.55, 38.72],
  riseDark: 40.0, risePick: 40.61,
  flight: 40.87, // first flight theme, four two-bar phrases
  phrases: [40.87, 45.2, 49.53, 56.02],
  flightEnd: 58.21,
  fill: [59.23, 59.8, 60.09, 60.36],
  breath: 60.62, picks: [61.96, 62.24, 62.5],
  leap: 63.47, // BIG 1
  duel: 64.6, duelEnd: 81.4, // brass and drums, front against rear
  hush: 81.4, brk: 81.94,
  build: 84.11, inner: 88.52, gasp: 89.7,
  climax: 89.95, // BIG 2
  sea: 94.94, // the theme over the sea
  swell: 110.0, swellDark: 112.35, swellPick: 112.72,
  peak2: 113.16, // BIG 3
  sun: 114.21, // rising sun
  sunBack: 121.9,
  grand: 122.61, grand2: 130.81, grandBack: 139.3,
  crescendo: 140.05, cut: 142.3, // BIG 4
  ticks: [143.16, 144.16, 145.2],
  fin: 146.23, finHits: [146.73, 147.02],
  last: 147.28, // BIG 5
};
const ROLL = [84.19, 84.47, 84.74, 85.84, 86.46, 86.78, 87.04, 87.68, 88.02, 88.38, 88.79, 89.25, 89.55];

export default function testDrive(s: Show) {
  const P = s.palette(DEFAULT_PALETTE);
  const step = s.analysis.curveStep;

  // ---- Helpers ------------------------------------------------------------------
  const loudness = (t: number) => DRUM.find(([x]) => x === t)?.[1] ?? 0;
  const drums = (a: number, b: number, min = 0) => DRUM.filter(([t, l]) => t >= a && t < b && l >= min).map(([t]) => t);
  const orch = (a: number, b: number, min = 0) => ORCH.filter(([t, l]) => t >= a && t < b && l >= min).map(([t]) => t);
  const accel = (t0: number, t1: number, startMs: number, minMs: number, k: number) => {
    const out: number[] = [];
    let t = t0, p = startMs;
    while (t < t1 - 0.03) { out.push(t); t += p / 1000; p = Math.max(minMs, p * k); }
    return out;
  };
  const energy = (t: number) => {
    let sum = 0;
    for (let k = -5; k <= 5; k++) sum += s.energyAt(Math.max(0, t + k * step));
    return Math.min(1, sum / 11 / 0.6);
  };
  const follow = (ids: string | string[], t0: number, t1: number, fn: (t: number) => RGB) => {
    for (let t = t0; t < t1 - 1e-3; t += 0.04) s.color(ids, t, Math.min(t1, t + 0.04), fn(t), fn(Math.min(t1, t + 0.04)));
  };
  const ring = (times: number[], color: RGB, decayMs: number, base: RGB, dir = 1) =>
    times.forEach((t, i) => s.pulse(U[dir > 0 ? bounce(i) : 4 - bounce(i)], [t], color, decayMs, base));
  const converge = (t: number, span: number, color: RGB, decayMs: number, base: RGB) => {
    s.pulse(CAB_REAR, [t], color, decayMs, base);
    s.pulse(["accentLeftFront", "accentRightFront"], [t + span / 2], color, decayMs, base);
    s.pulse("accentFront", [t + span], color, decayMs, base);
  };
  const scr = (times: number[], color: RGB, decayMs: number, base: RGB) => s.pulse(SCREEN, times, color, decayMs, base);
  const strobeScreen = (times: number[], colors: RGB[], base: RGB, end: number) =>
    times.forEach((t, i) => s.pulse(SCREEN, [t], colors[i % colors.length], Math.max(40, ((times[i + 1] ?? end) - t) * 600), base));
  /** Everything snaps on for holdMs; lights that can fade ring out over decayMs. */
  const slam = (t: number, holdMs: number, decayMs: number, ids: string[] = EXT) => {
    s.on(ids, t, t + holdMs / 1000);
    const fading = ids.filter((id) => [...INNER, ...DRL, ...TURN_F].includes(id));
    if (fading.length) s.fadeOut(fading, t + holdMs / 1000, decayMs);
  };
  /**
   * A big moment: the whole car and cabin at full white, then a strobe, then a decay.
   * The caller makes the darkness before it.
   */
  const bigHit = (t: number, holdMs: number, strobeS: number, decayMs: number, settle: RGB) => {
    slam(t, holdMs, decayMs);
    const s0 = t + holdMs / 1000;
    if (strobeS > 0) {
      s.strobe([...OUTER, "brake", "reverse", ...TAILS, ...REP, "plate", "rearFog"], s0, s0 + strobeS, 90, 45);
      s.on([...INNER, ...DRL], s0, s0 + strobeS).fadeOut([...INNER, ...DRL], s0 + strobeS, decayMs);
    }
    s.color(INTERIOR, t, s0, P.flash);
    strobeScreen(accel(s0, s0 + strobeS, 90, 90, 1), [P.flash, P.accent], dim(settle, 0.3), s0 + strobeS);
    s.color(U, s0, s0 + strobeS + decayMs / 1000, P.flash, dim(settle, 0.25));
  };

  // =====================================================================
  // 0:00-0:02  Ignition: the orchestra swells, then the double drum hit
  // =====================================================================
  s.fadeIn(DRL, T.first, 1000, T.hit1).fadeOut(DRL, T.hit1, 350);
  s.flash(TAILS, 0.71, 220).flash(TURN_R, 1.24, 160);
  s.flash([...OUTER, "brake"], T.hit1, 120);
  slam(T.hit2, 200, 1000, [...OUTER, ...INNER, "brake", ...TAILS, "reverse"]);
  s.color(SCREEN, T.first, T.hit1, dim(P.calm, 0.2), P.pulse);
  scr([T.hit1], P.flash, 260, P.pulse);
  scr([T.hit2], P.flash, 900, dim(P.calm, 0.3));
  s.color(U, T.first, T.hit1, BLACK, dim(P.calm, 0.35));
  converge(T.first, 1.0, P.pulse, 700, dim(P.calm, 0.35));
  s.pulse(U, [T.hit2], P.flash, 700, dim(P.calm, 0.15));

  // =====================================================================
  // SET PIECE 1, 0:02-0:30  The ostinato: the drums throw the car side to side.
  // Each main drum hit lights one whole side (outer beam + tail); its pickup
  // flicks the opposite repeater. Nothing else on the exterior. Near-dark between.
  // =====================================================================
  {
    const a = 2.3, b = T.rise;
    const hits = drums(a, b, 2.4);
    let side = 0;
    hits.forEach((t, i) => {
      const next = hits[i + 1];
      const isPickup = next !== undefined && next - t < 0.4;
      if (isPickup) { s.flash(REP[1 - side], t, 70); return; }
      if (loudness(t) >= 4.5) { s.flash([...OUTER, ...TAILS], t, 140); s.hit(INNER, t, 80, 350); }
      else s.flash([SIDE[side][0], SIDE[side][4]], t, 130);
      s.pulse(CAB_SIDE[side], [t], P.pulse, 700, dim(P.calm, 0.12));
      side = 1 - side;
    });
    // After the drums thin (0:19), a slow amber wash per bar keeps both ends alive.
    s.downbeats(T.A2, b).forEach((d, i) => { s.hit(TURN_F[i % 2], d, 100, 1000); s.flash(TURN_R[i % 2], d + 0.54, 200); });
    // Cabin: the screen breathes ocean blue once per bar; the drums flare it cyan.
    s.color(U, a, b, dim(P.calm, 0.12));
    s.downbeats(a, b).forEach((d) => s.color(SCREEN, d, d + 1.08, dim(P.calm, 0.2), dim(P.calm, 0.55)).color(SCREEN, d + 1.08, d + 2.17, dim(P.calm, 0.55), dim(P.calm, 0.2)));
    hits.forEach((t) => scr([t], loudness(t) >= 4.5 ? P.flash : P.pulse, 400, dim(P.calm, 0.3)));
  }

  // =====================================================================
  // SET PIECE 2, 0:30-0:41  The choir rise: everything off, then one layer per bar,
  // travelling around the car, all on ramps; a strobe; black; the pickup.
  // =====================================================================
  {
    const [b1, b2, b3, b4, b5] = T.riseBars, end = T.riseDark;
    s.fadeIn("turnFL", b1, 2000, end); s.on("tailL", b1 + 0.2, end);
    s.fadeIn("turnFR", b2, 2000, end); s.on("tailR", b2 + 0.2, end);
    s.fadeIn(DRL, b3, 2000, end); s.flash(TURN_R, b3 + 0.2, 400);
    s.fadeIn(INNER, b4, 2000, end); s.flash(["plate", "brake"], b4 + 0.2, 300);
    accel(b5, end, 300, 60, 0.86).forEach((t, i) => s.flash(i % 2 ? [...OUTER, ...REP] : ["brake", "reverse"], t, 40));
    s.off(ALL, end, T.risePick);
    s.flash([...OUTER, "brake"], T.risePick, 110);
    // Cabin: one U segment joins per bar, outside-in; the screen climbs indigo → white.
    const order = [["accentLeftRear"], ["accentRightRear"], ["accentLeftFront", "accentRightFront"], ["accentFront"]];
    s.color(U, b1, end, BLACK);
    order.forEach((ids, i) => s.color(ids, T.riseBars[i], end, dim(P.mellow, 0.15), blend(P.mellow, P.cool, 0.7)));
    follow(SCREEN, b1, b5, (t) => { const k = (t - b1) / (b5 - b1); return dim(blend(P.mellow, P.pulse, k), 0.1 + 0.6 * k); });
    const acc = accel(b5, end, 300, 60, 0.86);
    strobeScreen(acc, [P.flash, P.pulse], dim(P.pulse, 0.4), end);
    ring(acc, P.flash, 160, dim(P.cool, 0.4));
    scr([T.risePick], P.cool, 220, BLACK);
  }

  // =====================================================================
  // SET PIECE 3, 0:41-0:58  First flight: each two-bar phrase is one sweep around
  // the car (front left → front right → rear right → rear left), held lights handing
  // over to the next; the direction turns each phrase. Inner beams on the two swells.
  // =====================================================================
  {
    slam(T.flight, 250, 2000, [...OUTER, ...INNER, ...DRL, "brake", ...TAILS, "reverse"]);
    const corners = [
      { ext: ["drlL", "turnFL"], cab: ["accentLeftFront"] },
      { ext: ["drlR", "turnFR"], cab: ["accentRightFront"] },
      { ext: ["tailR", "turnRR"], cab: ["accentRightRear"] },
      { ext: ["tailL", "turnRL"], cab: ["accentLeftRear"] },
    ];
    s.color(U, T.flight, T.flightEnd, dim(P.pulse, 0.08));
    T.phrases.forEach((p, k) => {
      const seq = k % 2 ? [1, 0, 3, 2] : [0, 1, 2, 3];
      const start = k === 0 ? p + 0.9 : p;
      const stepS = k === 3 ? 0.7 : 0.95, holdS = k === 3 ? 1.1 : 1.3;
      seq.forEach((c, j) => {
        const t = start + j * stepS, hold = t + holdS;
        for (const id of corners[c].ext) {
          if (/drl|turnF/.test(id)) s.fadeIn(id, t, 500, hold).fadeOut(id, hold, 1000);
          else s.on(id, t, hold);
        }
        s.color(corners[c].cab, t, t + 0.5, dim(P.pulse, 0.08), P.accent).color(corners[c].cab, t + 0.5, hold + 0.6, P.accent, dim(P.pulse, 0.08));
      });
      // Screen: one swell per phrase, cyan warming to gold.
      s.color(SCREEN, p, p + 2.0, dim(P.pulse, 0.25), blend(P.pulse, P.accent, 0.3 + 0.15 * k));
      s.color(SCREEN, p + 2.0, p + 4.33, blend(P.pulse, P.accent, 0.3 + 0.15 * k), dim(P.pulse, 0.25));
    });
    s.fadeIn(INNER, 42.6, 1000, 43.7).fadeOut(INNER, 43.7, 2000);
    s.fadeIn(INNER, 51.0, 1000, 53.4).fadeOut(INNER, 53.4, 2000);
    s.flash(["brake", ...TAILS], 55.75, 160); // the drum that turns the theme's last phrase
    const brass = orch(T.flight + 1, T.flightEnd, 1.15);
    brass.forEach((t) => s.flash(OUTER, t, 160).flash("brake", t, 160));
    scr([T.flight], P.flash, 700, dim(P.pulse, 0.25));
    scr(brass, P.flash, 400, dim(P.accent, 0.4));
    s.pulse("accentFront", brass, P.flash, 400, dim(P.pulse, 0.08));
  }

  // =====================================================================
  // 0:58-1:04  BIG 1, the leap: drum fill front/rear, a held breath in black,
  // three growing pickups, then the whole car.
  // =====================================================================
  {
    s.flash([...OUTER, "brake"], T.flightEnd, 150);
    const [f1, f2, f3, f4] = T.fill;
    s.flash(["brake", ...TAILS], f1, 140);
    s.flash(OUTER, f2, 120);
    s.flash(["brake", "reverse"], f3, 120);
    s.flash([...OUTER, "brake", "reverse", ...TAILS], f4, 140);
    s.off(ALL, T.breath, T.picks[0]);
    s.flash(REP, T.picks[0], 70);
    s.flash(["brake", "plate"], T.picks[1], 90);
    s.flash([...OUTER, "brake"], T.picks[2], 120);
    s.off(EXT, T.picks[2] + 0.12, T.leap);
    s.flash(TAILS, 62.95, 90);
    bigHit(T.leap, 400, 0.7, 2000, P.accent);
    // Cabin around it
    s.color(SCREEN, T.flightEnd, T.breath, dim(P.accent, 0.2));
    scr([T.flightEnd], P.flash, 500, dim(P.accent, 0.2));
    strobeScreen(T.fill, [P.accent, P.flash], dim(P.accent, 0.15), T.breath);
    s.color(U, T.flightEnd, T.breath, dim(P.accent, 0.1));
    T.fill.forEach((t, i) => s.pulse(i % 2 ? CAB_FRONT : CAB_REAR, [t], P.flash, 250, dim(P.accent, 0.1)));
    s.color(SCREEN, T.breath, 61.6, dim(P.mellow, 0.25), BLACK);
    s.color(SCREEN, T.picks[0], T.leap, BLACK);
    scr(T.picks, P.cool, 200, BLACK);
    s.color(U, T.picks[0], T.leap, BLACK);
    s.pulse(CAB_REAR, [T.picks[0]], P.cool, 300, BLACK);
    s.pulse(["accentLeftFront", "accentRightFront"], [T.picks[1]], P.cool, 300, BLACK);
    s.pulse("accentFront", [T.picks[2]], P.cool, 600, BLACK);
  }

  // =====================================================================
  // SET PIECE 4, 1:04-1:21  The brass duel: front against rear. A drum hit with a
  // pickup: the pickup at the rear (brake, reverse, tails), the main hit at the
  // front (both outer beams + inner ring). Unpaired hits alternate ends. Dark between.
  // =====================================================================
  {
    const a = T.duel, b = T.duelEnd;
    const hits = drums(a, b, 2.5);
    let end = 0;
    hits.forEach((t, i) => {
      const next = hits[i + 1];
      const pickup = next !== undefined && next - t < 0.4;
      const front = pickup ? false : (end = 1 - end) === 1;
      if (loudness(t) >= 6) {
        s.flash([...OUTER, "brake", "reverse", ...TAILS], t, 180).hit(INNER, t, 150, 1000);
        s.color(INTERIOR, t, t + 0.12, P.flash);
        s.pulse(INTERIOR, [t + 0.12], P.flash, 600, dim(P.accent, 0.08));
      } else if (front) {
        s.flash(OUTER, t, 220).hit(INNER, t, 150, 1000);
        s.pulse(CAB_FRONT, [t], P.accent, 500, dim(P.accent, 0.08));
        scr([t], P.flash, 450, dim(P.accent, 0.3));
      } else {
        s.flash(["brake", "reverse", ...TAILS, "rearFog"], t, 250);
        s.pulse(CAB_REAR, [t], P.pulse, 500, dim(P.accent, 0.08));
        scr([t], P.pulse, 450, dim(P.calm, 0.3));
      }
    });
    s.color(U, a, b, dim(P.accent, 0.08));
    // Screen base: gold and ocean trade places each bar, under the hits.
    const bars = s.downbeats(a, b);
    s.color(SCREEN, a, bars[0] ?? a, dim(P.accent, 0.3));
    bars.forEach((d, i) => s.color(SCREEN, d, bars[i + 1] ?? b, dim(i % 2 ? P.calm : P.accent, 0.4), dim(i % 2 ? P.calm : P.accent, 0.2)));
  }

  // =====================================================================
  // 1:21-1:24  A hush: near-dark, the screen breathes indigo
  // =====================================================================
  {
    const a = T.hush, b = T.build;
    s.off(EXT, a, b);
    s.fadeIn(DRL, T.brk, 1000, 82.9).fadeOut(DRL, 82.9, 1000);
    s.flash(TAILS, T.brk, 300).flash("turnRL", 83.55, 200);
    s.color(SCREEN, a, T.brk, dim(P.calm, 0.15), dim(P.mellow, 0.45));
    s.color(SCREEN, T.brk, b, dim(P.mellow, 0.45), dim(P.mellow, 0.1));
    s.color(U, a, b, BLACK);
    s.color("accentFront", T.brk, b, dim(P.mellow, 0.5), BLACK);
  }

  // =====================================================================
  // 1:24-1:30  Takeoff: layers join on ramps, the timpani roll at the rear,
  // an accelerating strobe, a breath of black.
  // =====================================================================
  {
    const a = T.build, b = T.gasp;
    s.fadeIn(DRL, a, 2000, b);
    ROLL.forEach((t, i) => s.flash(i % 3 === 2 ? ["brake", ...TAILS] : TAILS[i % 2], t, 120));
    s.fadeIn(TURN_F, 86.0, 2000, T.inner);
    s.fadeIn(INNER, T.inner, 1000, b);
    accel(T.inner, b, 260, 60, 0.85).forEach((t, i) => s.flash(i % 2 ? [...REP, "plate"] : ["brake", "reverse"], t, 40));
    accel(88.9, b, 200, 60, 0.85).forEach((t) => s.flash(OUTER, t, 35));
    s.off(ALL, b, T.climax);
    follow(SCREEN, a, b, (t) => { const k = (t - a) / (b - a); return dim(blend(P.mellow, P.cool, k * 1.2), 0.15 + 0.85 * k * k); });
    strobeScreen(accel(87.0, b, 400, 60, 0.85), [P.flash], dim(P.cool, 0.5), b);
    s.color(U, a, b, BLACK, dim(P.cool, 0.4));
    accel(a, b, 1100, 180, 0.8).forEach((t) => converge(t, 0.15, P.cool, 400, dim(blend(P.mellow, P.cool, (t - a) / (b - a)), 0.25)));
  }

  // =====================================================================
  // 1:30-1:35  BIG 2, the climax: the whole car, then flight at full sail:
  // main beams held, amber circling on eighths, the brake on every beat.
  // =====================================================================
  {
    const a = T.climax, b = T.sea;
    bigHit(a, 400, 0.65, 1000, P.pulse);
    s.on(OUTER, 91.0, 93.6);
    s.fadeIn(INNER, 91.0, 500, 93.6).fadeOut(INNER, 93.6, 1000);
    s.fadeIn(DRL, 91.0, 500, 93.6).fadeOut(DRL, 93.6, 1000);
    s.flash([...OUTER, "brake", "reverse", ...TAILS, "rearFog"], 91.69, 180);
    s.chase(DIAGONAL, s.grid(91.0, b, 2), 220);
    s.beats(91.0, b).forEach((t, i) => s.flash(["brake", TAILS[i % 2]], t, 130));
    s.color(SCREEN, 91.0, b, dim(P.pulse, 0.7));
    scr(s.beats(91.0, b), P.flash, 330, dim(P.pulse, 0.7));
    scr(s.downbeats(91.0, b), P.accent, 600, dim(P.pulse, 0.7));
    s.color(U, 91.0, b, dim(P.pulse, 0.4));
    ring(s.grid(91.0, b, 2), P.flash, 250, dim(P.pulse, 0.4), -1);
  }

  // =====================================================================
  // SET PIECE 5, 1:35-1:50  Over the sea: amber only. Each brass attack is one
  // diagonal (a front turn and the opposite rear turn) with a slow ramp; the inner
  // beams breathe on the two big swells. No white except those swells.
  // =====================================================================
  {
    const a = T.sea, b = T.swell;
    const acc = orch(a + 0.3, b, 1.0);
    acc.forEach((t, i) => { s.fadeIn(TURN_F[i % 2], t, 500, t + 0.45).fadeOut(TURN_F[i % 2], t + 0.45, 1000); s.on(TURN_R[(i + 1) % 2], t + 0.1, t + 0.7); });
    drums(a + 0.3, b, 4.0).forEach((t) => s.flash("brake", t, 160));
    s.fadeIn(INNER, 97.0, 1000, 98.2).fadeOut(INNER, 98.2, 2000);
    s.fadeIn(INNER, 104.0, 1000, 105.0).fadeOut(INNER, 105.0, 2000);
    // Cabin: the color moves one bar at a time across sea and sky; a gold wave per brass attack.
    const bars = s.downbeats(a, b);
    s.color(SCREEN, a, bars[0] ?? a, dim(P.cycle[0], 0.45));
    bars.forEach((d, i) => { const c = P.cycle[i % P.cycle.length]; s.color(SCREEN, d, bars[i + 1] ?? b, dim(c, 0.6), dim(c, 0.3)); });
    acc.forEach((t) => { const i = bars.filter((d) => d <= t).length - 1; const c = P.cycle[Math.max(0, i) % P.cycle.length]; scr([t], blend(c, P.flash, 0.3), 600, dim(c, 0.3)); });
    s.color(U, a, b, dim(P.calm, 0.15));
    ring(acc, P.accent, 900, dim(P.calm, 0.15));
  }

  // =====================================================================
  // 1:50-1:54  BIG 3, the second peak: rise, black, pickup, the whole car
  // =====================================================================
  {
    const a = T.swell;
    s.fadeIn(DRL, a, 2000, T.swellDark);
    s.flash([...OUTER, "brake"], 110.49, 120);
    accel(110.9, T.swellDark, 320, 60, 0.86).forEach((t, i) => s.flash(i % 2 ? [...REP, "plate"] : ["brake", ...TAILS], t, 45));
    s.fadeIn(INNER, 111.4, 1000, T.swellDark);
    s.off(ALL, T.swellDark, T.peak2);
    s.flash([...OUTER, "brake"], T.swellPick, 100);
    bigHit(T.peak2, 350, 0.55, 350, P.accent);
    follow(SCREEN, a, T.swellDark, (t) => { const k = (t - a) / (T.swellDark - a); return dim(blend(P.pulse, P.flash, k), 0.4 + 0.6 * k); });
    strobeScreen(accel(110.9, T.swellDark, 320, 60, 0.86), [P.flash, P.accent], dim(P.pulse, 0.5), T.swellDark);
    s.color(U, a, T.swellDark, dim(P.pulse, 0.2), dim(P.pulse, 0.6));
    ring(accel(110.9, T.swellDark, 320, 60, 0.86), P.flash, 150, dim(P.pulse, 0.4));
    scr([T.swellPick], P.cool, 250, BLACK);
  }

  // =====================================================================
  // SET PIECE 6, 1:54-2:02  Rising sun: the car breathes one side at a time,
  // a slow wash down the whole side per bar. Warm screen.
  // =====================================================================
  {
    const a = T.sun, b = T.grand;
    [a + 0.8, ...s.downbeats(a + 1.0, T.sunBack)].forEach((d, i) => {
      const side = i % 2;
      s.fadeIn([SIDE[side][1], SIDE[side][2]], d, 1000, d + 1.0).fadeOut([SIDE[side][1], SIDE[side][2]], d + 1.0, 1000);
      s.on([SIDE[side][4], SIDE[side][5]], d + 0.3, d + 1.5);
      s.color(CAB_SIDE[side], d, d + 1.0, dim(P.glow, 0.1), P.glow).color(CAB_SIDE[side], d + 1.0, d + 2.1, P.glow, dim(P.glow, 0.1));
    });
    s.fadeIn(INNER, 118.43, 2000, 119.6).fadeOut(INNER, 119.6, 2000);
    s.color(U, a, b, dim(P.glow, 0.1));
    s.color(SCREEN, a, a + 0.6, P.accent, dim(P.glow, 0.3));
    follow(SCREEN, a + 0.6, T.sunBack, (t) => dim(blend(P.glow, P.accent, energy(t)), 0.3 + 0.55 * energy(t)));
    s.color(SCREEN, T.sunBack, b, dim(P.glow, 0.3), dim(P.glow, 0.08));
    s.flash("brake", 122.36, 120);
    scr([122.36], P.accent, 250, dim(P.glow, 0.08));
  }

  // =====================================================================
  // SET PIECE 7, 2:02-2:20  The grand theme: the main beams carry it. Inner beams
  // held through each phrase, outer beams on the brass, tails held a bar at a time,
  // the screen at full color, the U rolling.
  // =====================================================================
  {
    const a = T.grand, m = T.grand2, b = T.grandBack;
    slam(a, 300, 1000);
    [[a + 0.3, 126.4], [126.71, 130.5], [m, 134.6], [134.92, b - 0.4]].forEach(([p, q]) => s.fadeIn(INNER, p, 500, q).fadeOut(INNER, q, 350));
    s.downbeats(a + 0.3, b).forEach((d, i) => s.on(TAILS, d, d + 1.9).on(TURN_R[i % 2], d, d + 0.9));
    orch(a + 0.3, b, 1.3).forEach((t, i) => s.flash(OUTER, t, 180).flash(i % 2 ? ["brake", "reverse"] : "brake", t, 180));
    // Second half: the outer beams join, held through the phrases.
    [[m, 134.6], [134.92, b - 0.4]].forEach(([p, q]) => s.on(OUTER, p, q));
    // Second half: an amber sweep per bar answers the beams.
    s.downbeats(m, b).forEach((d, i) => { s.hit(TURN_F[i % 2], d + 0.5, 100, 1000); s.flash(TURN_R[(i + 1) % 2], d + 1.0, 250); });
    // Cabin: full color per bar, white on brass, the U rolls on every beat.
    const bars = s.downbeats(a, b);
    s.color(SCREEN, a, a + 0.3, P.flash);
    s.color(SCREEN, a + 0.3, bars[0] ?? a, P.accent);
    bars.forEach((d, i) => { const c = i % 2 ? P.pulse : P.accent; s.color(SCREEN, d, bars[i + 1] ?? b, c, dim(c, 0.6)); });
    scr(orch(a + 0.3, b, 1.3), P.flash, 350, dim(P.accent, 0.6));
    s.color(U, a, a + 0.3, P.flash);
    s.color(U, a + 0.3, b, dim(P.accent, 0.3));
    ring(s.beats(a + 0.3, m), P.flash, 450, dim(P.accent, 0.3));
    ring(s.grid(m, b, 2), P.pulse, 300, dim(P.accent, 0.3), -1);
    // Pull back for half a bar before the crescendo.
    s.off(EXT, b, T.crescendo);
    s.color(INTERIOR, b, T.crescendo, dim(P.accent, 0.3), dim(P.accent, 0.05));
  }

  // =====================================================================
  // 2:20-2:22  BIG 4, the last crescendo: hits alternate ends, then everything strobes
  // =====================================================================
  {
    const a = T.crescendo, b = T.cut;
    const hits = [140.05, 140.44, 140.82, 141.09];
    hits.forEach((t, i) => (i % 2 ? s.flash(["brake", "reverse", ...TAILS, ...TURN_R], t, 160) : s.flash([...OUTER, ...REP], t, 140)));
    hits.forEach((t) => s.hit(INNER, t, 100, 350));
    s.fadeIn(DRL, a, 500, b);
    s.on([...INNER, ...TURN_F], 141.33, b);
    s.strobe([...OUTER, "brake", "reverse", ...TAILS, ...REP, "plate", "rearFog"], 141.33, b, 70, 35);
    strobeScreen(accel(a, 141.33, 260, 120, 0.85), [P.flash, P.accent], dim(P.accent, 0.4), 141.33);
    strobeScreen(accel(141.33, b, 70, 70, 1), [P.flash, P.pulse], dim(P.pulse, 0.3), b);
    s.color(U, a, 141.33, dim(P.accent, 0.4));
    ring(accel(a, 141.33, 200, 80, 0.85), P.flash, 140, dim(P.accent, 0.4));
    s.color(U, 141.33, b, P.flash);
    s.off(ALL, b, T.ticks[0]);
  }

  // =====================================================================
  // 2:22-2:26  The orchestra stops: soft ticks in the dark
  // =====================================================================
  {
    T.ticks.forEach((t, i) => {
      s.flash(TAILS, t, 200);
      s.fadeIn(DRL[i % 2], t, 500, t + 0.3).fadeOut(DRL[i % 2], t + 0.3, 1000);
    });
    s.flash("turnRL", 144.94, 120);
    scr(T.ticks, dim(P.mellow, 0.6), 900, BLACK);
    T.ticks.forEach((t, i) => s.pulse(["accentFront", CAB_SIDE[i % 2][1]], [t], dim(P.mellow, 0.6), 900, BLACK));
  }

  // =====================================================================
  // 2:26-2:32  BIG 5, the final hit: held, then a sunset fade to black
  // =====================================================================
  {
    const a = T.fin, z = T.last;
    s.flash(TAILS, a, 200).fadeIn(DRL, a, 500, T.finHits[1]).fadeOut(DRL, T.finHits[1], 350);
    s.flash([...OUTER, "brake"], T.finHits[0], 120);
    s.flash([...OUTER, ...REP, "brake", "reverse"], T.finHits[1], 120);
    s.off(EXT, T.finHits[1] + 0.13, z);
    s.on(EXT, z, z + 0.8);
    s.fadeOut([...INNER, ...DRL, ...TURN_F], z + 0.8, 2000);
    s.on([...TAILS, "plate"], z + 0.8, 149.6);
    s.color(SCREEN, a, z, dim(P.pulse, 0.25), P.cool);
    scr(T.finHits, P.flash, 200, P.cool);
    s.color(SCREEN, z, z + 0.8, P.flash);
    s.color(SCREEN, z + 0.8, 149.5, P.flash, P.glow);
    s.color(SCREEN, 149.5, 152.5, P.glow, BLACK);
    s.color(U, a, z, BLACK, dim(P.pulse, 0.4));
    converge(a, 0.6, P.cool, 400, dim(P.pulse, 0.3));
    s.color(U, z, z + 0.8, P.flash);
    s.color(U, z + 0.8, 149.5, P.flash, P.glow);
    s.color(CAB_REAR, 149.5, 151.0, P.glow, BLACK);
    s.color(["accentLeftFront", "accentRightFront"], 149.5, 151.6, P.glow, BLACK);
    s.color("accentFront", 149.5, 152.2, P.glow, BLACK);
  }

  danceMoves(s);
}

/**
 * Dance moves, unverified on this car. Each starts early enough that the motion lands
 * on its moment (mirrors ~2 s, windows ~4 s, trunk 14 s open / 4 s close, port ~2 s).
 * Counts: mirrors 12 each (limit 20), windows 5 each (6), trunk 2 (6), charge port 3 (3).
 * Dancing: 2.2 s swings on 12 window-moments (front 3, rear 3, x2 windows each) = 26.4 s,
 * plus the charge port 4 s = 30.4 s.
 */
function danceMoves(s: Show) {
  // Windows: all four down at the start and kept down so the crowd hears the cabin
  // speakers. They move only by dancing: one full 2.2 s swing up and back on the big
  // moments, so each dance ends down again. Up only after the music has ended.
  s.closure(WINDOWS, 0.0, "open");
  s.closure(WIN_FRONT, T.leap, "dance", T.leap + SWING);
  s.closure(WIN_REAR, T.peak2, "dance", T.peak2 + SWING);
  s.closure(WINDOWS, 152.5, "close");
  // Ignition bow: mirrors fold onto the first drum hit, open as the choir rises.
  s.closure(MIRRORS, 0.0, "close");
  s.closure(MIRRORS, 28.9, "open");
  // The leap: folded as it lands; out again in the hush.
  s.closure(MIRRORS, T.leap - 2.0, "close");
  s.closure(MIRRORS, T.brk, "open");
  // The trunk rises through the duel, the hush and takeoff: fully up for the climax.
  s.closure(TRUNK, 76.0, "open");
  // Mirrors nod left then right into the climax.
  s.closure(MIRROR_L, 87.95, "close");
  s.closure(MIRROR_R, 88.45, "close");
  // Climax: all four windows swing up and back down.
  s.closure(WINDOWS, T.climax, "dance", T.climax + SWING);
  s.closure(MIRRORS, T.sea, "open");
  // Second peak: mirrors fold and the charge port opens, both landing on 1:53.2.
  s.closure(MIRRORS, T.peak2 - 2.0, "close");
  s.closure(CHARGE_PORT, T.peak2 - 2.0, "open");
  s.closure(MIRRORS, 114.5, "open");
  // The port sparkles through the grand theme's first phrases.
  s.closure(CHARGE_PORT, T.grand, "dance", 126.6);
  s.closure(CHARGE_PORT, 136.0, "close");
  // Last crescendo: mirrors fold onto 2:21.6, all four windows swing.
  s.closure(MIRRORS, 139.6, "close");
  s.closure(WINDOWS, T.crescendo, "dance", T.crescendo + SWING);
  // The orchestra stops: trunk down, mirrors out.
  s.closure(TRUNK, 142.4, "close");
  s.closure(MIRRORS, 142.4, "open");
  // Final hit: one last bow, then mirrors out for the fade.
  s.closure(MIRRORS, T.last - 2.0, "close");
  s.closure(MIRRORS, 148.6, "open");
}
