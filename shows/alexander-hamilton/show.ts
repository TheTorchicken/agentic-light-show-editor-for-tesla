// Alexander Hamilton (Hamilton, Original Broadway Cast): choreography for a 2027 Model 3.
// See PLAN.md. The song is a story told by several narrators, so the lights are cast
// like a company: each narrator owns a side or an end of the car, Hamilton owns the
// headlights, the ensemble owns everything.

import type { Palette, RGB, Show } from "@lightshow/show";
import { DRUM, KICKS, SNARES } from "./data.ts";

// ---- Light groups ----------------------------------------------------------
const OUTER = ["outerL", "outerR"];
const INNER = ["innerL", "innerR"];
const DRL = ["drlL", "drlR"];
const TURN_F = ["turnFL", "turnFR"];
const REP = ["repeaterL", "repeaterR"];
const TAILS = ["tailL", "tailR"];
const TURN_R = ["turnRL", "turnRR"];
const FRONT = [...OUTER, ...INNER, ...DRL, ...TURN_F, ...REP];
const REAR = ["brake", ...TAILS, ...TURN_R, "reverse", "rearFog", "plate"];
const EXT = [...FRONT, ...REAR];
const SIDE = [
  ["outerL", "drlL", "turnFL", "repeaterL", "tailL", "turnRL"],
  ["outerR", "drlR", "turnFR", "repeaterR", "tailR", "turnRR"],
];
/** Amber diagonal around the car. */
const DIAGONAL = [["turnFL"], ["turnRR"], ["turnFR"], ["turnRL"]];

// Cabin: five accents in one upside-down U, screen below its center.
const U = ["accentLeftRear", "accentLeftFront", "accentFront", "accentRightFront", "accentRightRear"];
const CAB_SIDE = [["accentLeftRear", "accentLeftFront"], ["accentRightFront", "accentRightRear"]];
const CAB_FRONT = ["accentLeftFront", "accentFront", "accentRightFront"];
const CAB_REAR = ["accentLeftRear", "accentRightRear"];
const SCREEN = "screen";
const INTERIOR = [SCREEN, ...U];
const ALL = [...EXT, ...INTERIOR];
const bounce = (i: number) => { const k = i % 8; return k < 5 ? k : 8 - k; };

const MIRRORS = [35, 36];
const CHARGE_PORT = 46;
const WIN_FRONT = [37, 39]; // left front, right front
const WIN_REAR = [38, 40]; // left rear, right rear
const WINDOWS = [...WIN_FRONT, ...WIN_REAR];
const TRUNK = 41;

// Used only without a theme. With the owner's theme (gold and white) every role is
// built from those two colors.
const DEFAULT_PALETTE: Palette = {
  calm: [255, 184, 28],
  rise: [255, 184, 28],
  pulse: [255, 184, 28],
  alt: [255, 255, 255],
  flash: [255, 255, 255],
  accent: [255, 220, 140],
  mellow: [255, 184, 28],
  cool: [255, 255, 255],
  cycle: [[255, 184, 28], [255, 220, 140], [255, 184, 28], [255, 255, 255]],
  glow: [255, 230, 175],
};
const BLACK: RGB = [0, 0, 0];
const dim = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const blend = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// ---- Key moments (seconds), measured from the stems -------------------------
const T = {
  stabs: [0.4, 1.35, 1.82, 2.28],
  roll: 2.78, // snare pickup into the first verse
  v1: 3.46, // narrator 1: "How does a bastard, orphan..."
  v2: 20.3, // narrator 2 takes over
  v3: 33.76, // narrator 3, the bass enters
  v4: 44.4, // narrator 4
  hero: 56.4, // the build to Hamilton's own name
  waitDark: 74.2,
  wait: [74.48, 76.35, 77.28, 77.75, 78.24, 78.7], // "just you wait" stabs
  quiet: 79.6, // the childhood story, almost bare
  stab2: 90.71,
  stab2Hits: [91.65, 92.61, 93.08, 93.54],
  held: 94.45, // the long sung note
  silence: 105.73,
  cousin: 109.46, // bass swells return
  swells: [109.5, 113.27, 116.98],
  drums: 120.6,
  build: 124.2,
  buildRoll: 133.0,
  drop: 134.77, // full groove
  a2: 148.9,
  b: 163.0,
  shout: 177.1, // drums stop, the company shouts
  peak: 178.92,
  c1: 180.72, // the company, all in
  c2: 194.85, // pumping bass
  strip: 208.98,
  roll2: 212.49, // the roll call
  voices: [[213.1, 215.74], [216.0, 219.72], [220.66, 222.64], [223.56, 225.95]] as Array<[number, number]>,
  finale: 226.45,
  call: 229.76, // "What's your name, man?" "Alexander Hamilton!"
  lastDark: 232.98,
  last: 233.45,
  end: 236.8,
};

export default function alexanderHamilton(s: Show) {
  const P = s.palette(DEFAULT_PALETTE);
  danceMoves(s);
  const GOLD = P.pulse, WHITE = P.flash, MID = P.accent, GLOW = P.glow;
  const step = s.analysis.curveStep;

  // ---- Helpers ------------------------------------------------------------------
  const inRange = (list: number[], a: number, b: number) => list.filter((t) => t >= a && t < b);
  const kicks = (a: number, b: number) => inRange(KICKS, a, b);
  const snares = (a: number, b: number) => inRange(SNARES, a, b);
  const drum = (a: number, b: number) => inRange(DRUM, a, b);
  const accel = (t0: number, t1: number, startMs: number, minMs: number, k: number) => {
    const out: number[] = [];
    let t = t0, p = startMs;
    while (t < t1 - 0.03) { out.push(t); t += p / 1000; p = Math.max(minMs, p * k); }
    return out;
  };
  const gapMs = (list: number[], i: number, end: number) => ((list[i + 1] ?? end) - list[i]) * 1000;
  const vocal = (t: number) => {
    let sum = 0;
    for (let k = -2; k <= 2; k++) sum += s.energyAt(Math.max(0, t + k * step), "vocals");
    return Math.min(1, sum / 5);
  };
  const follow = (ids: string | string[], t0: number, t1: number, fn: (t: number) => RGB) => {
    for (let t = t0; t < t1 - 1e-3; t += 0.04) s.color(ids, t, Math.min(t1, t + 0.04), fn(t), fn(Math.min(t1, t + 0.04)));
  };
  // Cabin movement
  const ring = (times: number[], color: RGB, decayMs: number, base: RGB, dir = 1) =>
    times.forEach((t, i) => s.pulse(U[dir > 0 ? bounce(i) : 4 - bounce(i)], [t], color, decayMs, base));
  const sides = (times: number[], color: RGB, decayMs: number, base: RGB, first = 0) =>
    times.forEach((t, i) => s.pulse(CAB_SIDE[(i + first) % 2], [t], color, decayMs, base));
  const frontBack = (times: number[], front: RGB, rear: RGB, decayMs: number, base: RGB) =>
    times.forEach((t, i) => (i % 2 ? s.pulse(CAB_REAR, [t], rear, decayMs, base) : s.pulse(CAB_FRONT, [t], front, decayMs, base)));
  const converge = (t: number, span: number, color: RGB, decayMs: number, base: RGB) => {
    s.pulse(CAB_REAR, [t], color, decayMs, base);
    s.pulse(["accentLeftFront", "accentRightFront"], [t + span / 2], color, decayMs, base);
    s.pulse("accentFront", [t + span], color, decayMs, base);
  };
  const diverge = (t: number, span: number, color: RGB, decayMs: number, base: RGB) => {
    s.pulse("accentFront", [t], color, decayMs, base);
    s.pulse(["accentLeftFront", "accentRightFront"], [t + span / 2], color, decayMs, base);
    s.pulse(CAB_REAR, [t + span], color, decayMs, base);
  };
  const scr = (times: number[], color: RGB, decayMs: number, base: RGB) => s.pulse(SCREEN, times, color, decayMs, base);
  const strobeScreen = (times: number[], colors: RGB[], base: RGB, end: number) =>
    times.forEach((t, i) => s.pulse(SCREEN, [t], colors[i % colors.length], Math.max(40, gapMs(times, i, end) * 0.6), base));

  // =====================================================================
  // 0:00-0:03.5  Overture: four orchestral stabs, then a snare pickup
  // =====================================================================
  // The song opens at full force, so the car does too.
  const stabGroups = [[...FRONT, "brake", ...TAILS], ["brake", "reverse", ...TAILS, ...TURN_R, ...OUTER], [...OUTER, "brake"], EXT];
  T.stabs.forEach((t, i) => {
    s.on(stabGroups[i], t, t + 0.18);
    s.fadeOut([...INNER, ...DRL, ...TURN_F].filter((id) => stabGroups[i].includes(id)), t + 0.18, 350);
  });
  s.fadeOut([...INNER, ...DRL], T.stabs[3] + 0.18, 1000);
  {
    const ts = [2.78, 3.02, 3.25, 3.48];
    ts.forEach((t, i) => s.flash(i % 2 ? ["brake", "plate"] : [...REP, "reverse"], t, 90));
  }
  s.color(U, 0, T.stabs[0], BLACK);
  T.stabs.forEach((t, i) => (i % 2 ? diverge(t, 0.2, WHITE, 450, dim(GOLD, 0.2)) : converge(t, 0.2, WHITE, 450, dim(GOLD, 0.2))));
  s.color(U, 2.9, T.v1, dim(GOLD, 0.2));
  ring(drum(2.7, 4.0), WHITE, 200, dim(GOLD, 0.2));
  scr(T.stabs, WHITE, 420, dim(GOLD, 0.25));
  s.pulse(SCREEN, [T.stabs[3]], WHITE, 500, dim(GOLD, 0.3));
  strobeScreen(drum(2.7, 4.0), [WHITE, GOLD], dim(GOLD, 0.2), T.v1 + 0.5);

  // =====================================================================
  // 0:03.5-0:56  The narrators. One snap per bar, a sparse piano.
  // Each narrator owns part of the car while they speak.
  // =====================================================================
  const snaps = (a: number, b: number) => drum(a, b).filter((t) => t > 4.5 && t < 110);
  const piano = (a: number, b: number) => (s.analysis.stems!.other.onsets ?? []).filter((t) => t >= a && t < b && !DRUM.some((d) => Math.abs(d - t) < 0.3));

  /** One narrator on one side: the DRL breathes with the rap, the same-side tail and amber answer. */
  const narrator = (t0: number, t1: number, side: number) => {
    const o = 1 - side;
    s.downbeats(t0, t1).forEach((d) => {
      s.fadeIn(DRL[side], d, 500, d + 0.4).fadeOut(DRL[side], d + 0.4, 350);
      s.flash(TAILS[side], d, 160);
    });
    snaps(t0, t1).forEach((t) => {
      s.flash("brake", t, 130);
      s.hit(TURN_F[side], t, 100, 1000);
    });
    piano(t0, t1).forEach((t, i) => s.flash(i % 2 ? TURN_R[side] : "plate", t, 110));
    // Cabin: the narrator's side of the U carries the voice; the far side stays low.
    s.color(CAB_SIDE[side], t0, t1, dim(GOLD, 0.3));
    s.color(CAB_SIDE[o], t0, t1, dim(GOLD, 0.08));
    s.color("accentFront", t0, t1, dim(GOLD, 0.15));
    s.beats(t0, t1).forEach((b, i) => s.pulse(CAB_SIDE[side][i % 2], [b], GOLD, 600, dim(GOLD, 0.3)));
    s.pulse("accentFront", snaps(t0, t1), WHITE, 500, dim(GOLD, 0.15));
  };

  // Narrator 1 owns the left side.
  narrator(T.v1, T.v2, 0);
  // Narrator 2 owns the right side.
  narrator(T.v2, T.v3, 1);
  // Screen: gold that follows the voice; a white tick on every snap.
  follow(SCREEN, T.v1, T.v2, (t) => dim(GOLD, 0.18 + 0.82 * Math.min(1, vocal(t) * 2.5)));
  follow(SCREEN, T.v2, T.v3, (t) => dim(blend(GOLD, MID, 0.4), 0.18 + 0.82 * Math.min(1, vocal(t) * 2.5)));
  scr(snaps(T.v1, T.v3), WHITE, 350, dim(GOLD, 0.25));

  // Narrator 3: the bass enters, so this voice lives at the rear.
  s.beats(T.v3, T.v4).forEach((b, i) => s.flash(TAILS[i % 2], b, 140));
  snaps(T.v3, T.v4).forEach((t) => s.flash(["brake", "reverse"], t, 150));
  s.downbeats(T.v3, T.v4).forEach((d, i) => {
    s.fadeIn(DRL, d, 500, d + 0.5).fadeOut(DRL, d + 0.5, 350);
    s.hit(TURN_F[i % 2], d + 0.9, 100, 1000);
  });
  s.on(["brake", ...TAILS, "reverse"], T.v3, T.v3 + 0.2);
  s.color(U, T.v3, T.v4, dim(GOLD, 0.15));
  frontBack(s.beats(T.v3, T.v4), WHITE, GOLD, 600, dim(GOLD, 0.15));
  s.color(SCREEN, T.v3, T.v4, dim(GOLD, 0.2));
  s.beats(T.v3, T.v4).forEach((b, i) => scr([b], dim(GOLD, 0.5 + 0.5 * Math.min(1, vocal(b) * 2.5)), 420, dim(GOLD, 0.2)));
  scr(snaps(T.v3, T.v4), WHITE, 380, dim(GOLD, 0.2));
  scr([T.v3], WHITE, 800, dim(GOLD, 0.2));

  // Narrator 4: the hurricane. Amber travels round the car on every beat.
  s.chase(DIAGONAL, s.beats(T.v4, T.hero), 260);
  snaps(T.v4, T.hero).forEach((t) => s.flash([...OUTER, "brake"], t, 90));
  s.downbeats(T.v4, T.hero).forEach((d, i) => s.fadeIn(DRL[i % 2], d, 500, d + 0.4).fadeOut(DRL[i % 2], d + 0.4, 350));
  s.color(U, T.v4, T.hero, dim(GOLD, 0.2));
  ring(s.beats(T.v4, T.hero), GOLD, 700, dim(GOLD, 0.2));
  s.color(SCREEN, T.v4, T.hero, dim(GOLD, 0.25));
  s.beats(T.v4, T.hero).forEach((b, i) => scr([b], i % 2 ? dim(MID, 0.85) : GOLD, 380, dim(GOLD, 0.25)));
  scr(snaps(T.v4, T.hero), WHITE, 300, dim(GOLD, 0.25));

  // =====================================================================
  // 0:56-1:14  Hamilton: the build to his own name. He owns the headlights.
  // =====================================================================
  // The eyes open on his entrance, then blink with his bars between the inner-beam swells.
  s.fadeIn(DRL, T.hero, 2000, T.hero + 2.6).fadeOut(DRL, T.hero + 2.6, 1000);
  s.downbeats(T.hero, T.waitDark - 1).forEach((d, i) => {
    if (i % 2 === 0) s.fadeIn(INNER, d, 1000, d + 1.0).fadeOut(INNER, d + 1.0, 1000);
    else if (d > T.hero + 3) s.fadeIn(DRL, d, 500, d + 0.6).fadeOut(DRL, d + 0.6, 350);
  });
  snaps(T.hero, T.waitDark).forEach((t) => s.flash([...OUTER, "brake", "reverse"], t, 110));
  s.beats(T.hero, T.waitDark).forEach((b, i) => s.flash(TAILS[i % 2], b, 130));
  s.grid(67.0, T.waitDark, 2).forEach((g, i) => s.flash(REP[i % 2], g, 50));
  s.downbeats(T.hero, T.waitDark).forEach((d, i) => s.flash(TURN_R[i % 2], d + 0.47, 150));
  s.color(U, T.hero, T.waitDark, dim(GOLD, 0.15), dim(GOLD, 0.45));
  s.downbeats(T.hero, T.waitDark).forEach((d) => converge(d, 0.5, WHITE, 900, dim(GOLD, 0.25)));
  // Screen: white, his voice sets the brightness, rising across the build.
  follow(SCREEN, T.hero, T.waitDark, (t) => {
    const k = (t - T.hero) / (T.waitDark - T.hero);
    return dim(blend(GOLD, WHITE, 0.3 + 0.6 * k), 0.2 + 0.3 * k + 0.5 * Math.min(1, vocal(t) * 2));
  });
  scr(snaps(T.hero, T.waitDark), WHITE, 300, dim(GOLD, 0.3));
  s.off(ALL, T.waitDark, T.wait[0]);

  // "Just you wait": every stab is the whole car, black in between.
  {
    const groups = [FRONT, REAR, [...SIDE[0]], [...SIDE[1]], [...OUTER, "brake", "reverse", ...TAILS], EXT];
    T.wait.forEach((t, i) => {
      s.on(groups[i], t, t + 0.16);
      s.fadeOut([...INNER, ...DRL].filter((id) => groups[i].includes(id)), t + 0.16, i === 5 ? 1000 : 350);
    });
    s.fadeIn(DRL, 75.2, 500, 76.2).fadeOut(DRL, 76.2, 350);
    s.flash(TAILS, 75.18, 300).flash(TURN_R, 75.7, 150);
    s.color(U, T.wait[0], T.quiet, dim(GOLD, 0.1));
    T.wait.forEach((t, i) => s.pulse(i === 5 ? U : i % 2 ? CAB_REAR : CAB_FRONT, [t], WHITE, 500, dim(GOLD, 0.1)));
    s.color(SCREEN, T.wait[0], T.quiet, BLACK);
    T.wait.forEach((t, i) => scr([t], i % 2 ? GOLD : WHITE, 600, BLACK));
    scr([T.wait[5]], WHITE, 1000, dim(GOLD, 0.1));
  }

  // =====================================================================
  // 1:20-1:31  The childhood, told quietly
  // =====================================================================
  [[82.42, 84.32], [86.44, 88.52], [89.72, 90.7]].forEach(([a, b], i) => {
    s.fadeIn(DRL[i % 2], a, 1000, b).fadeOut(DRL[i % 2], b, 1000);
    s.flash(TAILS[i % 2], a, 250);
  });
  s.downbeats(T.quiet, T.stab2).forEach((d, i) => s.flash(i % 2 ? "turnRR" : "turnRL", d, 160));
  s.downbeats(T.quiet, T.stab2).forEach((d, i) => i % 2 && s.hit(TURN_F[(i >> 1) % 2], d, 100, 1000));
  s.color(U, T.quiet, T.stab2, dim(GOLD, 0.1));
  s.downbeats(T.quiet, T.stab2).forEach((d, i) => s.pulse(CAB_SIDE[i % 2], [d], dim(GOLD, 0.7), 1600, dim(GOLD, 0.1)));
  follow(SCREEN, T.quiet, T.stab2, (t) => dim(GOLD, 0.12 + 0.88 * Math.min(1, vocal(t) * 3)));

  // 1:31-1:34  Hard stabs: the illness
  s.on([...OUTER, ...INNER, "brake", ...TAILS], T.stab2, T.stab2 + 0.15).fadeOut(INNER, T.stab2 + 0.15, 1000);
  T.stab2Hits.forEach((t, i) => s.flash(i === 3 ? [...OUTER, "brake", "reverse", ...TAILS] : SIDE[i % 2], t, 150));
  s.hit(INNER, T.stab2Hits[3], 100, 1000);
  s.color(U, T.stab2, T.held, dim(GOLD, 0.15));
  sides([T.stab2, ...T.stab2Hits], WHITE, 450, dim(GOLD, 0.15));
  s.color(SCREEN, T.stab2, T.held, dim(GOLD, 0.15));
  scr([T.stab2, ...T.stab2Hits], WHITE, 420, dim(GOLD, 0.15));

  // 1:34-1:46  The long sung note: the eyes open slowly and hold.
  s.fadeIn(DRL, 96.0, 2000, 99.5).fadeOut(DRL, 99.5, 2000);
  snaps(T.held, T.silence).forEach((t, i) => { s.flash(TAILS, t, 220); s.flash(TURN_R[i % 2], t + 0.94, 160); });
  s.color(U, T.held, T.silence, dim(GOLD, 0.1));
  snaps(T.held, T.silence).forEach((t, i) => (i % 2 ? diverge : converge)(t, 0.9, dim(blend(GOLD, WHITE, 0.6), 0.8), 1400, dim(GOLD, 0.1)));
  follow(SCREEN, T.held, T.silence, (t) => {
    const k = 0.5 + 0.5 * Math.sin(((t - T.held) / 1.87) * Math.PI * 2 - Math.PI / 2);
    return dim(blend(GOLD, WHITE, 0.5 + 0.4 * k), 0.25 + 0.35 * k + 0.4 * Math.min(1, vocal(t) * 3));
  });

  // 1:46-1:49  Silence. Darkness before the story turns.
  s.off(ALL, T.silence, T.cousin);
  s.color(SCREEN, T.silence, 107.6, dim(GOLD, 0.35), BLACK);

  // =====================================================================
  // 1:49-2:00  Bass swells return. 2:00-2:04 drums enter.
  // =====================================================================
  T.swells.forEach((t) => {
    s.on([...INNER, ...DRL, "brake", ...TAILS], t, t + 0.2).fadeOut([...INNER, ...DRL], t + 0.2, 2000);
    s.flash(TURN_R, t + 0.25, 250);
  });
  s.downbeats(T.cousin + 1, T.drums).forEach((d, i) => {
    if (!T.swells.some((w) => Math.abs(w - d) < 0.3)) { s.fadeIn(DRL[i % 2], d, 500, d + 0.5).fadeOut(DRL[i % 2], d + 0.5, 1000); s.flash(TAILS[i % 2], d, 150); }
    s.flash("plate", d + 0.92, 120);
  });
  s.beats(T.cousin, T.drums).forEach((b, i) => i % 4 === 2 && s.hit(TURN_F[(i >> 2) % 2], b, 100, 1000));
  s.color(U, T.cousin, T.drums, dim(GOLD, 0.15));
  T.swells.forEach((t) => { s.color(U, t, t + 0.25, WHITE); s.color(U, t + 0.25, t + 3.5, GOLD, dim(GOLD, 0.15)); });
  ring(s.beats(T.cousin, T.drums), dim(WHITE, 0.8), 500, dim(GOLD, 0.15));
  T.swells.forEach((t, i) => {
    const e = T.swells[i + 1] ?? T.drums;
    s.color(SCREEN, t, t + 0.25, WHITE);
    follow(SCREEN, t + 0.25, e, (x) => dim(GOLD, Math.max(0.2 + 0.6 * Math.min(1, vocal(x) * 2), 1 - (x - t) / 3)));
  });

  // Drums enter: each hit alternates front and rear.
  {
    const hs = drum(T.drums, T.build + 0.1);
    hs.forEach((t, i) => s.flash(i === hs.length - 1 ? [...OUTER, "brake", "reverse"] : i % 2 ? ["brake", ...TAILS] : OUTER, t, 120));
    s.fadeIn(DRL, T.drums, 500, T.build).fadeOut(DRL, T.build, 350);
    s.color(U, T.drums, T.build, dim(GOLD, 0.25));
    frontBack(hs, WHITE, GOLD, 350, dim(GOLD, 0.25));
    s.color(SCREEN, T.drums, T.build, dim(GOLD, 0.3));
    hs.forEach((t, i) => scr([t], i % 2 ? GOLD : WHITE, 380, dim(GOLD, 0.3)));
  }

  // =====================================================================
  // 2:04-2:15  Build without the bass: layers arrive, then the strobe.
  // =====================================================================
  kicks(T.build, T.buildRoll).forEach((t) => s.flash(["brake", "reverse"], t, 150));
  s.downbeats(T.build, T.buildRoll).forEach((d, i) => {
    s.flash("brake", d, 120);
    s.fadeIn(DRL[i % 2], d, 500, d + 0.5).fadeOut(DRL[i % 2], d + 0.5, 350);
    s.flash(TAILS, d + 0.88, 140);
  });
  snares(T.build, 127.7).forEach((t, i) => s.flash(REP[i % 2], t, 50));
  s.grid(127.7, T.buildRoll, 2).forEach((g, i) => s.flash(i % 2 ? REP[(i >> 1) % 2] : TAILS[(i >> 1) % 2], g, 60));
  s.grid(131.2, T.buildRoll, 4).forEach((g, i) => i % 2 && s.flash("plate", g, 40));
  [127.75, 131.25].forEach((t) => s.hit(INNER, t, 120, 1000));
  s.downbeats(T.build, T.buildRoll).forEach((d, i) => s.hit(TURN_F[i % 2], d, 100, 1000));
  {
    const ts = accel(T.buildRoll, 134.55, 220, 45, 0.88);
    ts.forEach((t, i) => s.flash(i % 2 ? ["brake", "reverse", ...TAILS] : [...OUTER, ...REP], t, Math.max(40, gapMs(ts, i, 134.55) * 0.45)));
    s.fadeIn(INNER, 132.5, 2000, 134.5);
    s.color(U, T.build, T.buildRoll, dim(GOLD, 0.1), dim(GOLD, 0.4));
    ring(s.grid(T.build, T.buildRoll, 2), GOLD, 400, dim(GOLD, 0.2));
    s.color(U, T.buildRoll, 134.55, GOLD, WHITE);
    ts.forEach((t, i) => s.pulse(U[bounce(i)], [t], WHITE, 150, GOLD));
    // Screen: gold kicks and white snares, each bar brighter, then a white strobe.
    s.color(SCREEN, T.build, T.buildRoll, dim(GOLD, 0.15));
    kicks(T.build, T.buildRoll).forEach((t) => scr([t], dim(GOLD, 0.6 + 0.4 * (t - T.build) / 9), 380, dim(GOLD, 0.15)));
    snares(T.build, T.buildRoll).forEach((t) => scr([t], WHITE, 260, dim(GOLD, 0.15)));
    strobeScreen(ts, [WHITE, GOLD], dim(GOLD, 0.2), 134.55);
  }
  s.off(ALL, 134.55, T.drop);

  // =====================================================================
  // 2:15-2:57  The groove. Kick crosses left and right, snare lands on the rear.
  // =====================================================================
  s.closure(MIRRORS, T.drop, "close");
  s.on(EXT, T.drop, T.drop + 0.2).fadeOut([...INNER, ...DRL, ...TURN_F], T.drop + 0.2, 1000);
  /** Kick: outer beam + same-side tail, alternating. Snare: brake (and reverse) at the rear, DRL blink at the front. */
  const groove = (t0: number, t1: number, opts: { reverse?: boolean; inner?: boolean; wholeSide?: boolean } = {}) => {
    kicks(t0, t1).forEach((t, i) => s.flash(opts.wholeSide ? SIDE[i % 2] : [OUTER[i % 2], TAILS[i % 2]], t, 120));
    snares(t0, t1).forEach((t) => {
      s.flash(opts.reverse ? ["brake", "reverse"] : "brake", t, 150);
      if (opts.inner) s.hit(INNER, t, 90, 350); else s.flash(DRL, t, 120);
    });
  };
  groove(T.drop + 0.3, T.a2);
  s.downbeats(T.drop + 1, T.a2).forEach((d, i) => s.fadeIn(DRL[i % 2], d, 500, d + 0.7).fadeOut(DRL[i % 2], d + 0.7, 350));
  s.chase(DIAGONAL, s.beats(T.drop, T.a2), 240);
  s.color(U, T.drop, T.a2, dim(GOLD, 0.2));
  ring(s.grid(T.drop, T.a2, 2), WHITE, 420, dim(GOLD, 0.2));
  s.color(SCREEN, T.drop, T.a2, dim(GOLD, 0.3));
  scr([T.drop], WHITE, 900, dim(GOLD, 0.3));
  scr(kicks(T.drop + 0.3, T.a2), GOLD, 330, dim(GOLD, 0.3));
  scr(snares(T.drop + 0.3, T.a2), WHITE, 300, dim(GOLD, 0.3));

  groove(T.a2, T.b, { reverse: true });
  s.chase(DIAGONAL, s.grid(T.a2, T.b, 2), 200);
  s.grid(T.a2, T.b, 2).forEach((g, i) => i % 2 && s.flash(REP[(i >> 1) % 2], g, 50));
  s.downbeats(T.a2, T.b).forEach((d) => s.hit(INNER, d, 100, 1000));
  s.color(U, T.a2, T.b, dim(GOLD, 0.25));
  sides(s.grid(T.a2, T.b, 2), WHITE, 300, dim(GOLD, 0.25));
  s.color(SCREEN, T.a2, T.b, dim(GOLD, 0.35));
  scr(kicks(T.a2, T.b), GOLD, 300, dim(GOLD, 0.35));
  scr(snares(T.a2, T.b), WHITE, 280, dim(GOLD, 0.35));
  scr(s.downbeats(T.a2, T.b), WHITE, 450, dim(GOLD, 0.35));

  // Groove B: whole sides alternate; inner beams on the snare; 16th sparkle.
  groove(T.b, T.shout, { reverse: true, inner: true, wholeSide: true });
  s.downbeats(T.b, T.shout).forEach((d, i) => s.fadeIn(DRL[i % 2], d, 500, d + 0.5).fadeOut(DRL[i % 2], d + 0.5, 350));
  s.grid(T.b, T.shout, 4).forEach((g, i) => i % 2 && s.flash(i % 4 === 1 ? "plate" : REP[(i >> 2) % 2], g, 40));
  s.beats(T.b, T.shout).forEach((b, i) => s.flash(TURN_R[i % 2], b + 0.22, 100));
  s.color(U, T.b, T.shout, dim(GOLD, 0.3));
  ring(s.grid(T.b, T.shout, 4), WHITE, 180, dim(GOLD, 0.3), -1);
  {
    const bars = s.downbeats(T.b - 0.1, T.shout);
    bars.forEach((d, i) => {
      const c = P.cycle[i % P.cycle.length];
      const e = bars[i + 1] ?? T.shout;
      s.color(SCREEN, d, e, dim(c, 0.35));
      scr(kicks(d, e), c, 300, dim(c, 0.35));
      scr(snares(d, e), WHITE, 300, dim(c, 0.35));
    });
  }

  // 2:57-2:59  Drums stop, the company shouts: dark, then a rising strobe.
  s.off(ALL, T.shout, T.peak);
  {
    const ts = accel(T.shout + 0.4, T.peak - 0.05, 300, 50, 0.84);
    ts.forEach((t, i) => s.flash(i % 2 ? ["brake", "plate"] : REP, t, Math.max(40, gapMs(ts, i, T.peak) * 0.4)));
    s.fadeIn(DRL, T.shout + 0.3, 1000, T.peak);
    s.color(SCREEN, T.shout, T.peak, dim(GOLD, 0.2), WHITE);
    strobeScreen(ts, [WHITE], dim(GOLD, 0.3), T.peak);
    s.color(U, T.shout, T.peak, BLACK, dim(GOLD, 0.6));
    ts.forEach((t, i) => s.pulse(U[4 - bounce(i)], [t], WHITE, 120, dim(GOLD, 0.4)));
  }

  // 2:59-3:00.7  The loudest moment so far: a one-bar strobe of the whole car.
  {
    const ts = s.grid(T.peak, 179.84, 4);
    ts.forEach((t, i) => s.flash(i % 2 ? [...REAR, ...REP] : [...OUTER, ...REP, ...TURN_F, "brake", ...TAILS], t, 60));
    s.fadeIn(INNER, T.peak, 500, 179.84);
    s.on(DRL, T.peak, 179.84);
    s.strobe(["brake", ...OUTER], 179.84, 180.4, 140, 50);
    strobeScreen([...ts, ...accel(179.84, 180.4, 140, 140, 1)], [WHITE, GOLD], BLACK, 180.4);
    s.off(ALL, 180.4, T.c1);
    ts.forEach((t, i) => s.pulse(i % 2 ? CAB_REAR : CAB_FRONT, [t], WHITE, 90, BLACK));
  }

  // =====================================================================
  // 3:00.7-3:32  The company, all in.
  // =====================================================================
  s.closure(CHARGE_PORT, T.c1, "open");
  s.on(EXT, T.c1, T.c1 + 0.2).fadeOut([...INNER, ...TURN_F], T.c1 + 0.2, 1000);
  s.downbeats(T.c1 + 1, T.c2).forEach((d) => s.hit(DRL, d, 120, 350));
  groove(T.c1 + 0.3, T.c2, { reverse: true, inner: true, wholeSide: true });
  s.chase(DIAGONAL, s.grid(T.c1, T.c2, 2), 200);
  s.grid(T.c1, T.c2, 4).forEach((g, i) => i % 2 && s.flash(i % 4 === 1 ? REP : "plate", g, 40));
  s.color(U, T.c1, T.c2, dim(GOLD, 0.35));
  ring(s.grid(T.c1, T.c2, 4), WHITE, 180, dim(GOLD, 0.35));
  s.pulse(U, s.downbeats(T.c1 + 1, T.c2), WHITE, 300, dim(GOLD, 0.35));
  s.color(SCREEN, T.c1, T.c2, dim(GOLD, 0.45));
  scr([T.c1], WHITE, 1000, dim(GOLD, 0.45));
  scr(kicks(T.c1 + 0.3, T.c2), WHITE, 300, dim(GOLD, 0.45));
  scr(snares(T.c1 + 0.3, T.c2), WHITE, 320, dim(GOLD, 0.45));
  scr(s.beats(T.c1, T.c2).map((b) => b + 0.22), GOLD, 160, dim(GOLD, 0.45));

  // Pumping bass: amber and tails pump on the eighths, front answers rear.
  s.closure(CHARGE_PORT, T.c2, "dance", T.c2 + 10);
  kicks(T.c2, T.strip).forEach((t, i) => s.flash(OUTER[i % 2], t, 110));
  snares(T.c2, T.strip).forEach((t) => { s.flash(["brake", "reverse"], t, 150); s.hit(INNER, t, 90, 350); });
  s.grid(T.c2, T.strip, 2).forEach((g, i) => { s.flash(TAILS[i % 2], g, 110); s.flash(TURN_F[(i + 1) % 2], g, 110); });
  s.grid(T.c2, T.strip, 4).forEach((g, i) => i % 2 && s.flash(i % 4 === 1 ? REP[(i >> 2) % 2] : "plate", g, 40));
  s.downbeats(T.c2, T.strip).forEach((d, i) => s.fadeIn(DRL[i % 2], d, 500, d + 0.8).fadeOut(DRL[i % 2], d + 0.8, 350));
  s.color(U, T.c2, T.strip, dim(GOLD, 0.3));
  frontBack(s.grid(T.c2, T.strip, 2), WHITE, GOLD, 220, dim(GOLD, 0.3));
  s.color(SCREEN, T.c2, T.strip, dim(GOLD, 0.35));
  s.grid(T.c2, T.strip, 2).forEach((g, i) => scr([g], i % 2 ? GOLD : WHITE, 200, dim(GOLD, 0.35)));
  scr(snares(T.c2, T.strip), WHITE, 300, dim(GOLD, 0.4));

  // 3:29-3:32  Strip down; the charge port closes; half a bar of black.
  s.closure(CHARGE_PORT, T.strip + 0.3, "close");
  snares(T.strip, 211.6).forEach((t) => s.flash("brake", t, 150));
  kicks(T.strip, 211.6).forEach((t, i) => s.flash(TAILS[i % 2], t, 120));
  s.fadeIn(DRL, T.strip, 500, 210.6).fadeOut(DRL, 210.6, 1000);
  s.downbeats(T.strip, 211.6).forEach((d, i) => s.hit(TURN_F[i % 2], d, 100, 1000));
  s.color(U, T.strip, 211.6, dim(GOLD, 0.35), dim(GOLD, 0.05));
  sides(s.beats(T.strip, 211.6), GOLD, 600, dim(GOLD, 0.15));
  s.color(SCREEN, T.strip, 211.6, GOLD, dim(GOLD, 0.15));
  scr(snares(T.strip, 211.6), WHITE, 400, dim(GOLD, 0.3));
  s.off(ALL, 211.6, T.roll2);

  // =====================================================================
  // 3:32-3:46  The roll call: four voices, each owns its own part of the car.
  // =====================================================================
  s.closure(MIRRORS, T.roll2, "open");
  s.flash([...OUTER, "brake"], T.roll2, 150);
  const [v1, v2, v3, v4] = T.voices;
  // Voice 1: the left side.
  s.fadeIn("drlL", v1[0], 500, v1[1]).fadeOut("drlL", v1[1], 350);
  s.fadeIn("turnFL", v1[0], 1000, v1[1]).fadeOut("turnFL", v1[1], 350);
  s.flash(["outerL", "tailL"], 214.25, 200);
  s.beats(v1[0], v1[1]).forEach((b, i) => s.flash(i % 2 ? "turnRL" : "tailL", b, 150));
  // Voice 2: the right side.
  s.flash(["outerR", "tailR"], 215.9, 200);
  s.fadeIn("drlR", v2[0], 500, v2[1]).fadeOut("drlR", v2[1], 350);
  s.fadeIn("turnFR", v2[0], 1000, v2[1]).fadeOut("turnFR", v2[1], 350);
  s.beats(v2[0], v2[1]).forEach((b, i) => s.flash(i % 2 ? "turnRR" : "tailR", b, 150));
  s.flash(["outerR", "tailR"], 217.59, 150);
  // A stab, then voice 3: the eyes of the car, with the tails glowing under it.
  s.on([...OUTER, "brake", "reverse", ...TAILS], 219.98, 220.18);
  s.fadeIn([...INNER, ...DRL], v3[0], 1000, v3[1]).fadeOut([...INNER, ...DRL], v3[1], 1000);
  s.on(TAILS, v3[0], v3[1]);
  // Voice 4, the man who shot him: red at the rear, the front answers with one shot.
  s.on(["brake", ...TAILS], v4[0], v4[0] + 0.5);
  s.flash(["brake", "reverse"], 224.09, 150);
  s.flash([...OUTER, "brake", "reverse", ...TAILS], 224.73, 120);
  accel(225.15, 225.85, 200, 60, 0.8).forEach((t) => s.flash(["brake", ...REP], t, 50));
  s.beats(v4[0], v4[1]).forEach((b, i) => s.flash(TURN_F[i % 2], b, 100));
  s.off(ALL, v4[1], T.finale);
  // Cabin: each voice owns a part of the U, and the screen takes their color.
  s.color(U, T.roll2, v4[1], dim(GOLD, 0.06));
  s.color(CAB_SIDE[0], v1[0], v1[1], dim(GOLD, 0.25), GOLD);
  s.pulse(CAB_SIDE[0], s.beats(v1[0], v1[1]), WHITE, 400, dim(GOLD, 0.5));
  s.color(CAB_SIDE[1], v2[0], v2[1], dim(WHITE, 0.25), WHITE);
  s.pulse(CAB_SIDE[1], s.beats(v2[0], v2[1]), GOLD, 400, dim(WHITE, 0.5));
  s.color(CAB_FRONT, v3[0], v3[1], dim(MID, 0.3), MID);
  s.pulse(U, [219.98], WHITE, 500, dim(GOLD, 0.06));
  s.color(CAB_REAR, v4[0], v4[1], GOLD, dim(GOLD, 0.15));
  s.pulse(U, [224.73], WHITE, 300, dim(GOLD, 0.06));
  s.color(SCREEN, T.roll2, v1[0], dim(GOLD, 0.15));
  follow(SCREEN, v1[0], v1[1], (t) => dim(GOLD, 0.25 + 0.75 * Math.min(1, vocal(t) * 1.6)));
  follow(SCREEN, v1[1], v2[1], (t) => dim(WHITE, 0.2 + 0.8 * Math.min(1, vocal(t) * 1.6)));
  follow(SCREEN, v2[1], v3[1], (t) => dim(MID, 0.2 + 0.8 * Math.min(1, vocal(t) * 1.6)));
  scr([219.98], WHITE, 600, dim(MID, 0.3));
  follow(SCREEN, v3[1], v4[1], (t) => dim(GOLD, 0.15 + 0.5 * Math.min(1, vocal(t) * 1.6)));
  scr([224.09], GOLD, 300, dim(GOLD, 0.2));
  scr([224.73], WHITE, 500, dim(GOLD, 0.15));
  strobeScreen(accel(225.15, 225.85, 200, 60, 0.8), [WHITE], BLACK, 225.9);
  s.off(SCREEN, v4[1], T.finale);

  // =====================================================================
  // 3:46-3:53  The finale: the whole company says his name.
  // =====================================================================
  s.closure(MIRRORS, T.finale, "close");
  s.on(EXT, T.finale, T.finale + 0.25).fadeOut([...INNER, ...TURN_F], T.finale + 0.25, 1000);
  s.fadeIn(DRL, T.finale + 0.25, 500, T.lastDark);
  {
    const hs = drum(T.finale + 0.3, T.call);
    hs.forEach((t, i) => { s.flash(i % 2 ? [...REAR] : [...OUTER, ...REP], t, 130); if (i % 2 === 0) s.hit(INNER, t, 90, 350); });
    s.chase(DIAGONAL, s.grid(T.finale, T.call, 4), 110);
    s.grid(T.finale, T.call, 2).forEach((g, i) => s.flash(TAILS[i % 2], g, 90));
    s.color(U, T.finale, T.call, dim(GOLD, 0.45));
    ring(s.grid(T.finale, T.call, 4), WHITE, 150, dim(GOLD, 0.45));
    s.color(SCREEN, T.finale, T.call, dim(GOLD, 0.5));
    scr([T.finale], WHITE, 800, dim(GOLD, 0.5));
    s.grid(T.finale + 0.4, T.call, 4).forEach((g, i) => scr([g], i % 2 ? GOLD : WHITE, 100, dim(GOLD, 0.5)));
    scr(hs, WHITE, 250, dim(GOLD, 0.5));
  }
  // "What's your name, man?" "Alexander Hamilton!": the strobe accelerates to the last hit.
  {
    const hs = drum(T.call, 231.0);
    hs.forEach((t) => s.flash([...OUTER, "brake", "reverse", ...TAILS], t, 120));
    s.fadeIn(INNER, T.call, 1000, T.lastDark);
    const ts = accel(231.0, T.lastDark, 220, 45, 0.88);
    ts.forEach((t, i) => s.flash(i % 2 ? [...REAR] : [...OUTER, ...REP, ...TURN_F], t, Math.max(40, gapMs(ts, i, T.lastDark) * 0.45)));
    s.grid(T.call, 231.0, 2).forEach((g, i) => s.flash(TURN_R[i % 2], g, 100).flash(TURN_F[(i + 1) % 2], g, 100));
    s.color(U, T.call, T.lastDark, dim(GOLD, 0.5), WHITE);
    sides(s.grid(T.call, 231.0, 2), WHITE, 200, dim(GOLD, 0.5));
    ts.forEach((t, i) => s.pulse(U[i % 2 ? 4 - bounce(i) : bounce(i)], [t], i % 2 ? GOLD : WHITE, 100, dim(GOLD, 0.6)));
    s.color(SCREEN, T.call, 231.0, GOLD, WHITE);
    scr(hs, WHITE, 300, GOLD);
    strobeScreen(ts, [WHITE, GOLD], dim(GOLD, 0.3), T.lastDark);
  }
  s.off(ALL, T.lastDark, T.last);

  // The last hit: everything on, held, then a slow fade to black.
  s.closure(MIRRORS, T.last + 0.1, "open");
  s.on(EXT, T.last, T.last + 0.7);
  s.on(["brake", ...TAILS, "plate"], T.last, 234.6);
  s.fadeOut([...INNER, ...DRL, ...TURN_F], T.last + 0.7, 2000);
  s.color(INTERIOR, T.last, T.last + 0.7, WHITE);
  s.color(SCREEN, T.last + 0.7, T.end, WHITE, BLACK);
  s.color(U, T.last + 0.7, 235.9, GLOW, BLACK);
  s.off(U, 235.9, T.end);
}

// =========================================================================
// Dance moves (closures). Slow moves start early so the motion lands on the moment.
// Not yet verified on this car (closures probe not filmed).
// =========================================================================
function danceMoves(s: Show) {
  // The music only plays from the cabin, so the windows go down at the start and stay down.
  s.closure(WINDOWS, 0, "open");
  // The trunk rises through groove B so it is fully up (14 s) at the 2:59 peak.
  s.closure(TRUNK, T.peak - 14, "open");
  // The peak: all four windows swing partway up and back for the bar.
  s.closure(WINDOWS, T.peak, "dance", T.c1 - 0.05);
  // Roll call: the voice that owns the left side moves the left windows, then the right.
  s.closure([37, 38], T.voices[0][0], "dance", T.voices[0][0] + 1.2);
  s.closure([39, 40], T.voices[1][0], "dance", T.voices[1][0] + 1.2);
  // Finale: the company says his name and the glass dances.
  s.closure(WINDOWS, T.finale, "dance", T.finale + 2.2);
  // Trunk shuts for the last hit.
  s.closure(TRUNK, T.call - 0.3, "close");
  // Glass back fully down after the dance, then up from 232.8 so it is half up only once the
  // music has ended (~234.3) and fully closed as the audio ends (236.8).
  s.closure(WINDOWS, T.finale + 2.3, "open");
  s.closure(WINDOWS, 232.8, "close");
}
