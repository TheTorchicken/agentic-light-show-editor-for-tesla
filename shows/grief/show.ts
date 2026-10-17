// Grief (KzX, Stalemate): choreography for a 2027 Model 3. See PLAN.md.

import type { Palette, RGB, Show } from "@lightshow/show";

// Light groups
const OUTER = ["outerL", "outerR"];
const INNER = ["innerL", "innerR"];
const DRL = ["drlL", "drlR"];
const TURN_F = ["turnFL", "turnFR"];
const REPEATERS = ["repeaterL", "repeaterR"];
const TAILS = ["tailL", "tailR"];
const TURN_R = ["turnRL", "turnRR"];
const FRONT = [...OUTER, ...INNER, ...DRL, ...TURN_F];
const REAR = ["brake", ...TAILS, ...TURN_R, "reverse", "rearFog", "plate"];
const EXTERIOR = [...FRONT, ...REPEATERS, ...REAR];
// The cabin accents form one upside-down U, in this order along it. Movement sweeps
// along the U and bounces back. The screen is the lead instrument: see screenPart.
const U = ["accentLeftRear", "accentLeftFront", "accentFront", "accentRightFront", "accentRightRear"];
const CABIN_LEFT = ["accentLeftFront", "accentLeftRear"];
const CABIN_RIGHT = ["accentRightFront", "accentRightRear"];
const CABIN_FRONT = ["accentLeftFront", "accentFront", "accentRightFront"];
const CABIN_REAR = ["accentLeftRear", "accentRightRear"];
const ACCENTS = U;
const INTERIOR = ["screen", ...U];
/** Position along the U for step i, bouncing at both ends: 0 1 2 3 4 3 2 1 0 1 ... */
const bounce = (i: number) => { const k = i % 8; return k < 5 ? k : 8 - k; };
/** Amber diagonal that travels around the car. */
const DIAGONAL = [["turnFL"], ["turnRR"], ["turnFR"], ["turnRL"]];
const MIRRORS = [35, 36];
const CHARGE_PORT = 46;
const FRONT_WINDOWS = [37, 39];
const REAR_WINDOWS = [38, 40];
const TRUNK = 41;

// Interior colors by role. These are used when show.json has no theme; with a theme
// (Grief's is red and white) every role comes from the theme colors instead.
const DEFAULT_PALETTE: Palette = {
  calm: [10, 25, 120], // deep blue
  rise: [90, 20, 160], // violet
  pulse: [200, 10, 10], // red
  alt: [220, 70, 0], // orange
  flash: [255, 255, 255],
  accent: [200, 0, 120], // magenta
  mellow: [70, 0, 140], // purple
  cool: [0, 160, 200], // cyan
  cycle: [[0, 110, 90], [0, 160, 200], [10, 25, 120], [90, 20, 160]],
  glow: [255, 150, 60], // warm white
};
const dim = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

// Silent gaps measured in drop 1 (start, length in s). Black in the gap, burst after.
const STUTTERS: Array<[number, number]> = [[48.03, 0.13], [49.17, 0.27], [50.9, 0.22], [52.79, 0.11], [55.55, 0.17], [58.44, 0.11]];

export default function grief(s: Show) {
  const bar = (60 / s.analysis.tempo) * 4;
  const P = s.palette(DEFAULT_PALETTE);

  // Cabin movement helpers. Each lays pulses over whatever wash is already there.
  /** Sweep a pulse along the U and back. dir -1 starts from the right rear. */
  const ring = (times: number[], color: RGB, decayMs: number, base: RGB, dir = 1) =>
    times.forEach((t, i) => s.pulse(U[dir > 0 ? bounce(i) : 4 - bounce(i)], [t], color, decayMs, base));
  const sides = (times: number[], color: RGB, decayMs: number, base: RGB) =>
    times.forEach((t, i) => s.pulse(i % 2 ? CABIN_RIGHT : CABIN_LEFT, [t], color, decayMs, base));
  const frontBack = (times: number[], front: RGB, rear: RGB, decayMs: number, base: RGB) =>
    times.forEach((t, i) => (i % 2 ? s.pulse(CABIN_REAR, [t], rear, decayMs, base) : s.pulse(CABIN_FRONT, [t], front, decayMs, base)));

  // ---- Intro 0:00-0:10: stabs breathe on alternating DRLs ------------------
  s.color(ACCENTS, 0, 10.43, [0, 0, 0], dim(P.calm, 0.35));
  ring(s.beats(0, 10.43), P.calm, 1400, dim(P.calm, 0.3));
  s.beats(0, 10.43).forEach((t, i) => {
    const side = DRL[i % 2];
    s.fadeIn(side, t, 500, t + 0.25).fadeOut(side, t + 0.25, 1000);
    s.flash(TAILS[(i + 1) % 2], t + 0.3525, 110);
  });

  // ---- Build 0:10-0:22: eighths, amber on downbeats, accelerating strobe ---
  s.color(ACCENTS, 10.43, 19.02, dim(P.calm, 0.3), dim(P.rise, 0.4));
  ring(s.grid(10.43, 19.02, 2), P.rise, 500, dim(P.rise, 0.3));
  s.grid(10.43, 19.02, 2).forEach((t, i) => s.flash(DRL[i % 2], t, 160));
  s.downbeats(10.43, 19.02).forEach((t, i) => { s.hit(TURN_F[i % 2], t, 150, 1000); s.flash(TURN_R[(i + 1) % 2], t + 0.3525, 200); });
  s.grid(10.43, 19.02, 2).forEach((t, i) => i % 2 && s.flash(i % 4 === 1 ? "tailL" : "tailR", t, 90));
  // Last bar: the riser. Strobe accelerates on the outer beams, interior brightens.
  let t = 19.02, period = 300;
  { let k = 0; while (t < 21.55) { s.flash(k++ % 2 ? ["brake", "reverse"] : OUTER, t, Math.max(40, period * 0.45)); t += period / 1000; period = Math.max(70, period * 0.86); } }
  s.fadeIn(INNER, 19.02, 2000, 21.55);
  s.color(ACCENTS, 19.02, 21.55, P.rise, P.flash);
  { let rt = 19.02, rp = 300, i = 0; while (rt < 21.55) { s.pulse(U[bounce(i++)], [rt], P.flash, 250, P.rise); rt += rp / 1000; rp = Math.max(70, rp * 0.86); } }
  s.off([...EXTERIOR, ...INTERIOR], 21.55, 21.85);

  // ---- Drums enter 0:22-0:30: heartbeat ------------------------------------
  const heartbeat = (t0: number, t1: number) => {
    s.beats(t0, t1).forEach((b) => { s.flash("brake", b, 140); s.flash(TAILS, b + 0.3525, 110); });
  };
  heartbeat(21.85, 30.31);
  s.downbeats(21.85, 30.31).forEach((d) => s.fadeIn(DRL, d, 500, d + 0.5).fadeOut(DRL, d + 0.5, 1000));
  frontBack(s.beats(21.85, 30.31), P.pulse, P.pulse, 550, dim(P.pulse, 0.08));

  // ---- Groove up 0:30-0:42: front answers rear, amber diagonal chase -------
  heartbeat(30.31, 41.61);
  s.beats(30.31, 41.61).forEach((b) => s.flash(OUTER, b + 0.3525, 90));
  s.chase(DIAGONAL, s.grid(30.31, 41.61, 2), 300);
  s.downbeats(30.31, 41.61).forEach((d) => s.hit(INNER, d, 120, 1000));
  sides(s.beats(30.31, 41.61), P.alt, 600, dim(P.pulse, 0.1));
  s.pulse("accentFront", s.beats(30.31, 41.61).map((b) => b + 0.3525), P.pulse, 300, dim(P.pulse, 0.1));

  // ---- Pre-drop 0:42-0:47: strip back, accelerate, then black --------------
  s.beats(41.61, 44.27).forEach((b) => s.flash("brake", b, 100));
  s.fadeIn(DRL, 41.61, 2000, 44.27);
  s.color(ACCENTS, 41.61, 46.5, dim(P.pulse, 0.1), P.pulse);
  { let rt = 44.27, rp = 350, i = 0; while (rt < 46.6) { s.pulse(U[bounce(i++)], [rt], P.flash, 200, P.pulse); rt += rp / 1000; rp = Math.max(60, rp * 0.9); } }
  t = 44.27; period = 350;
  let side = 0;
  while (t < 46.75) {
    s.flash(side ? ["outerL", "outerR", "reverse"] : ["brake", "plate"], t, Math.max(40, period * 0.4));
    side ^= 1; t += period / 1000; period = Math.max(60, period * 0.9);
  }
  s.off([...EXTERIOR, ...INTERIOR], 46.75, 47.15);

  // ---- Drop 1a 0:47-1:01: everything on the hits, black in the stutters ----
  s.closure(MIRRORS, 47.6, "close");
  s.beats(46.89, 60.74).forEach((b, i) => {
    if (i % 2 === 0) s.on([...OUTER, ...INNER, ...DRL], b, b + 0.12).fadeOut(INNER, b + 0.12, 350).fadeOut(DRL, b + 0.12, 350);
    else s.flash(["brake", "reverse", ...TAILS], b, 160).flash("rearFog", b + 0.18, 120);
    s.flash(TURN_F, b + 0.3525, 80).flash(TURN_R, b + 0.3525, 80);
  });
  s.grid(46.89, 60.74, 4).forEach((g, i) => i % 2 && s.flash(REPEATERS, g, 40));
  s.color(ACCENTS, 46.89, 60.74, dim(P.pulse, 0.4));
  frontBack(s.beats(46.89, 60.74), P.flash, P.pulse, 320, dim(P.pulse, 0.4));
  for (const [gap, len] of STUTTERS) {
    s.off([...EXTERIOR, ...INTERIOR], gap, gap + len);
    s.strobe([...OUTER, "brake"], gap + len, gap + len + 0.36, 60, 30);
  }

  // ---- Drop 1b 1:01-1:12: diagonal chases over held DRLs --------------------
  s.fadeIn(DRL, 60.74, 500, 72.0);
  s.chase(DIAGONAL, s.grid(60.74, 72.32, 2), 250);
  s.downbeats(60.74, 72.32).forEach((d) => { s.hit([...OUTER, ...INNER], d, 100, 1000); s.flash(["brake", "reverse"], d, 200); });
  s.beats(60.74, 72.32).forEach((b, i) => s.flash(TAILS[i % 2], b, 150));
  s.color(ACCENTS, 60.74, 72.32, dim(P.accent, 0.15));
  ring(s.grid(60.74, 72.32, 2), P.accent, 450, dim(P.accent, 0.15));
  s.fadeOut(DRL, 72.0, 350);

  // ---- Drop 1c 1:12-1:24: half time, long decays, amber sweeps -------------
  s.downbeats(72.32, 83.63).forEach((d, i) => {
    s.hit([...INNER, ...DRL], d, 150, 2000);
    s.flash("brake", d, 250);
    const sweep = i % 2 ? ["turnFR", "turnFL"] : ["turnFL", "turnFR"];
    s.hit(sweep[0], d + bar / 2, 100, 1000).hit(sweep[1], d + bar / 2 + 0.35, 100, 1000);
    s.flash(i % 2 ? ["turnRL"] : ["turnRR"], d + bar / 2 + 0.7, 200);
  });
  s.color(ACCENTS, 72.32, 83.63, dim(P.mellow, 0.25));
  s.downbeats(72.32, 83.63).forEach((d) => {
    s.color(CABIN_LEFT, d, d + bar / 2, P.mellow, dim(P.mellow, 0.25));
    s.color(CABIN_RIGHT, d + bar / 2, d + bar, P.mellow, dim(P.mellow, 0.25));
    s.pulse("accentFront", [d], P.mellow, 1500, dim(P.mellow, 0.25));
  });
  // Pull back before drop 2.
  s.off(EXTERIOR, 82.9, 83.63);
  s.strobe(REPEATERS, 82.9, 83.6, 90, 40);

  // ---- Drop 2a 1:24-1:47: strobe texture ------------------------------------
  s.closure(MIRRORS, 83.63, "open");
  s.beats(83.63, 106.22).forEach((b, i) => {
    s.flash(OUTER, b, 90).flash("brake", b, 120);
    s.flash(TAILS[i % 2], b + 0.3525, 140);
    if (i % 4 === 0) s.hit(INNER, b, 100, 350);
  });
  s.grid(83.63, 106.22, 4).forEach((g, i) => s.flash(i % 2 ? "plate" : REPEATERS[(i >> 1) % 2], g, 40));
  s.color(ACCENTS, 83.63, 106.22, dim(P.cool, 0.1));
  sides(s.grid(83.63, 106.22, 2), P.cool, 260, dim(P.cool, 0.1));
  // Vocal chops around 1:40-1:45: the eyes blink with them.
  [100.23, 100.96, 101.64, 102.65, 103.4, 104.09, 104.8, 105.48].forEach((v) => s.flash(DRL, v, 120).pulse(CABIN_FRONT, [v], P.flash, 220, dim(P.cool, 0.1)));

  // ---- Drop 2b 1:47-2:09: melodic, room to breathe -------------------------
  s.downbeats(106.22, 128.81).forEach((d, i) => {
    s.fadeIn(DRL, d, 1000, d + bar * 0.6).fadeOut(DRL, d + bar * 0.6, 1000);
    if (i % 2 === 1) s.fadeIn(INNER, d, 1000, d + bar * 0.5).fadeOut(INNER, d + bar * 0.5, 2000);
    s.flash("brake", d, 160);
  });
  s.beats(106.22, 128.81).forEach((b, i) => {
    s.flash(i % 2 ? "turnFR" : "turnFL", b, 220);
    s.flash(i % 2 ? "turnRL" : "turnRR", b + 0.3525, 180);
  });
  s.color(ACCENTS, 106.22, 128.81, dim(P.cycle[0], 0.25));
  ring(s.beats(106.22, 128.81), P.cool, 1300, dim(P.cycle[0], 0.25));

  // ---- Drop 2c 2:09-2:23: climax ---------------------------------------------
  s.closure(CHARGE_PORT, 125.99, "open");
  s.closure(CHARGE_PORT, 128.81, "dance", 134.49);
  s.closure(CHARGE_PORT, 140.14, "close");
  s.beats(128.81, 141.2).forEach((b, i) => {
    s.on([...OUTER, ...INNER], b, b + 0.1).fadeOut(INNER, b + 0.1, 350);
    s.flash(["brake", "reverse", ...TAILS], b + (i % 2 ? 0.3525 : 0), 140).flash("rearFog", b + (i % 2 ? 0 : 0.3525), 120);
    s.flash(TURN_F, b + 0.3525, 90).flash(TURN_R, b, 90);
  });
  s.fadeIn(DRL, 128.81, 500, 141.2);
  s.grid(128.81, 141.2, 4).forEach((g, i) => s.flash(i % 2 ? REPEATERS : "plate", g, 40));
  s.color(ACCENTS, 128.81, 141.2, dim(P.pulse, 0.45));
  ring(s.grid(128.81, 141.2, 4), P.flash, 180, dim(P.pulse, 0.45), -1);
  s.pulse(ACCENTS, s.downbeats(128.81, 141.2), P.flash, 500, dim(P.pulse, 0.45));
  // Final bar of the climax: everything strobes faster and faster.
  t = 141.2; period = 200;
  while (t < 142.9) { s.flash([...OUTER, "brake", "reverse", ...REPEATERS], t, Math.max(40, period * 0.45)); t += period / 1000; period = Math.max(60, period * 0.88); }
  s.color(ACCENTS, 141.2, 142.9, P.pulse, P.flash);

  // ---- Breakdown 2:23-2:31: almost nothing ------------------------------------
  s.off([...EXTERIOR, ...INTERIOR], 142.9, 151.43);
  s.closure(MIRRORS, 142.97, "close");
  s.beats(142.97, 151.43).forEach((b) => s.flash("brake", b, 100));
  s.downbeats(142.97, 151.43).forEach((d) => s.fadeIn(DRL, d, 2000, d + bar / 2).fadeOut(DRL, d + bar / 2, 2000));
  s.color(ACCENTS, 142.97, 151.43, dim(P.calm, 0.2), dim(P.calm, 0.08));
  s.pulse(CABIN_REAR, s.beats(142.97, 151.43), dim(P.calm, 0.7), 400, dim(P.calm, 0.08));

  // ---- Final build 2:31-2:44: one layer returns per bar -----------------------
  const layers = s.downbeats(151.43, 164.2);
  s.beats(151.43, 164.2).forEach((b, i) => { s.flash("brake", b, 120); s.flash(TURN_F[i % 2], b, 160); });
  s.beats(layers[0] ?? 151.43, 164.2).forEach((b, i) => s.flash(TAILS[i % 2], b + 0.3525, 120));
  s.downbeats(layers[1] ?? 154.25, 164.2).forEach((d) => s.fadeIn(DRL, d, 500, d + 1).fadeOut(DRL, d + 1, 1000));
  s.chase(DIAGONAL, s.grid(layers[2] ?? 157.08, 164.2, 2), 250);
  s.beats(layers[3] ?? 159.9, 164.2).forEach((b) => s.hit([...OUTER, ...INNER], b, 90, 350));
  s.strobe([...REPEATERS, "plate"], 162.73, 164.2, 90, 40);
  s.color(ACCENTS, 151.43, 164.2, dim(P.pulse, 0.08), dim(P.pulse, 0.5));
  ring(s.beats(151.43, 157.08), P.pulse, 600, dim(P.pulse, 0.2));
  ring(s.grid(157.08, 162.73, 2), P.pulse, 300, dim(P.pulse, 0.35));
  ring(s.grid(162.73, 164.2, 4), P.flash, 150, dim(P.pulse, 0.5));
  s.off([...EXTERIOR, ...INTERIOR], 164.2, 166.85);

  // ---- Outro 2:47-2:51: the voice, a slow warm glow, then black ----------------
  s.closure(MIRRORS, 166.85, "open");
  s.fadeIn([...INNER, ...DRL], 166.85, 2000, 168.9).fadeOut([...INNER, ...DRL], 168.9, 2000);
  s.on([...TAILS, "plate"], 167.85, 169.9);
  s.color(ACCENTS, 166.85, 168.9, [0, 0, 0], P.glow).color(ACCENTS, 168.9, 171.0, P.glow, [0, 0, 0]);

  screenPart(s, bar);
  dancePart(s);
}

/**
 * Dance moves. The music only plays from the cabin speakers, so all four windows go
 * down at the start and stay down; they move by dancing (swinging partway up and back)
 * and close only after the music ends. Moves start early enough to land on their moment
 * (trunk 14 s to open, 4 s to close). Command counts: each window 5, trunk 2 (limits 6).
 */
function dancePart(s: Show) {
  const ALL_WINDOWS = [...FRONT_WINDOWS, ...REAR_WINDOWS];
  s.closure(ALL_WINDOWS, 0.1, "open");
  // Drop 1: the front windows shimmy through the stutters.
  s.closure(FRONT_WINDOWS, 52.79, "dance", 58.44);
  // Drop 2: the rear windows answer.
  s.closure(REAR_WINDOWS, 83.63, "dance", 88.5);
  // Climax: all four dance beside the charge port.
  s.closure(ALL_WINDOWS, 128.81, "dance", 133.8);
  // Final build: the trunk rises over 14 s and is fully up for the vocal outro,
  // then closes during the last fade.
  s.closure(TRUNK, 151.43, "open");
  s.closure(TRUNK, 168.9, "close");
  // The music has ended (2:51): now the windows can close.
  s.closure(ALL_WINDOWS, 171.5, "close");
}

/** The screen's own part: the color story and the biggest rhythmic moments. */
function screenPart(s: Show, bar: number) {
  const SCREEN = "screen";
  const P = s.palette(DEFAULT_PALETTE);
  const accelerate = (t0: number, t1: number, startMs: number, minMs: number, k: number, colors: RGB[], base: RGB) => {
    let t = t0, p = startMs, i = 0;
    while (t < t1) { s.pulse(SCREEN, [t], colors[i++ % colors.length], Math.max(40, p * 0.45), base); t += p / 1000; p = Math.max(minMs, p * k); }
  };

  // Intro: breathes deep blue, each stab a soft swell.
  s.color(SCREEN, 0, 1.72, [0, 0, 0], dim(P.calm, 0.25));
  s.pulse(SCREEN, s.beats(1.72, 10.43), dim(P.calm, 0.9), 650, dim(P.calm, 0.25));

  // Build: violet eighths, a little brighter every bar; then the riser strobes white.
  const eighths = s.grid(10.43, 19.02, 2);
  eighths.forEach((t, i) => { const k = 0.35 + 0.5 * (i / eighths.length); s.pulse(SCREEN, [t], dim(P.rise, k + 0.15), 300, dim(P.rise, k * 0.5)); });
  accelerate(19.02, 21.55, 300, 70, 0.86, [P.flash], dim(P.rise, 0.3));

  // Drums enter: a red kick on every beat.
  s.pulse(SCREEN, s.beats(21.85, 30.31), P.pulse, 450, dim(P.pulse, 0.05));

  // Groove up: red and orange alternate, white on each downbeat.
  s.beats(30.31, 41.61).forEach((b, i) => s.pulse(SCREEN, [b], i % 2 ? P.alt : P.pulse, 500, dim(P.pulse, 0.08)));
  s.pulse(SCREEN, s.downbeats(30.31, 41.61), P.flash, 250, dim(P.pulse, 0.08));

  // Pre-drop: red swells to full, then red/white strobe accelerates into the silence.
  s.color(SCREEN, 41.61, 44.27, dim(P.pulse, 0.1), P.pulse);
  accelerate(44.27, 46.75, 350, 60, 0.9, [P.flash, P.pulse], [0, 0, 0]);

  // Drop 1a: white on the front hits, red on the rear hits.
  s.beats(46.89, 60.74).forEach((b, i) => s.pulse(SCREEN, [b], i % 2 ? P.pulse : P.flash, 330, dim(P.pulse, 0.15)));

  // Drop 1b: magenta and purple on the eighths, with the chases.
  s.grid(60.74, 72.32, 2).forEach((g, i) => s.pulse(SCREEN, [g], i % 2 ? P.mellow : P.accent, 330, dim(P.accent, 0.12)));

  // Drop 1c: half time. A white hit on each downbeat that melts into a purple fade.
  s.downbeats(72.32, 83.63).forEach((d) => s.color(SCREEN, d, d + 0.15, P.flash).color(SCREEN, d + 0.15, d + bar, P.mellow, dim(P.mellow, 0.12)));

  // Drop 2a: cyan on the beat, white on the off-beat, full white on the vocal chops.
  s.beats(83.63, 106.22).forEach((b) => s.pulse(SCREEN, [b], P.cool, 300, dim(P.cool, 0.1)).pulse(SCREEN, [b + 0.3525], dim(P.flash, 0.6), 150, dim(P.cool, 0.1)));
  s.pulse(SCREEN, [100.23, 100.96, 101.64, 102.65, 103.4, 104.09, 104.8, 105.48], P.flash, 220, dim(P.cool, 0.1));

  // Drop 2b: the color slowly cycles one bar at a time, swelling on every beat.
  const cycle = P.cycle;
  s.beats(106.22, 128.81).forEach((b, i) => { const c = cycle[Math.floor(i / 4) % cycle.length]; s.pulse(SCREEN, [b], c, 650, dim(c, 0.3)); });

  // Climax: white on every beat over red, a red stab on each off-beat, then an
  // accelerating white strobe through the last bar.
  s.beats(128.81, 141.2).forEach((b) => s.pulse(SCREEN, [b], P.flash, 250, dim(P.pulse, 0.5)).pulse(SCREEN, [b + 0.3525], P.pulse, 150, dim(P.pulse, 0.5)));
  accelerate(141.2, 142.9, 200, 60, 0.88, [P.flash], [0, 0, 0]);

  // Breakdown: dark, with a deep blue kick.
  s.off(SCREEN, 142.9, 151.43);
  s.pulse(SCREEN, s.beats(142.97, 151.43), dim(P.calm, 0.45), 500, [0, 0, 0]);

  // Final build: red beats that grow, then eighths, then a white strobe.
  const fb = s.beats(151.43, 157.08);
  fb.forEach((b, i) => s.pulse(SCREEN, [b], dim(P.pulse, 0.4 + 0.6 * (i / fb.length)), 450, [0, 0, 0]));
  s.pulse(SCREEN, s.grid(157.08, 162.73, 2), P.pulse, 300, dim(P.pulse, 0.15));
  accelerate(162.73, 164.2, 140, 60, 0.9, [P.flash, P.pulse], [0, 0, 0]);

  // Outro: a warm swell with the voice, then the last fade to black.
  s.color(SCREEN, 166.85, 168.9, [0, 0, 0], P.glow).color(SCREEN, 168.9, 171.0, P.glow, [0, 0, 0]);

  // The deliberate silences stay black, and each drop-1 stutter ends in a white burst.
  for (const [a, b] of [[21.55, 21.85], [46.75, 47.15], [164.2, 166.85]]) s.off(SCREEN, a, b);
  for (const [gap, len] of STUTTERS) { s.off(SCREEN, gap, gap + len); accelerate(gap + len, gap + len + 0.36, 60, 60, 1, [P.flash], [0, 0, 0]); }
}
