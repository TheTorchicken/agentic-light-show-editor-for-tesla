// Top Gun Anthem (Harold Faltermeyer, guitar Steve Stevens): choreography for a 2027 Model 3.
// See PLAN.md. Routed to cinematic-orchestral (phrases, set pieces, big moments out of
// darkness) with electronic borrowings for the pulse sections. The two biggest moments
// are the guitar entrance (13.52) and the final chord (65.60).

import type { Palette, RGB, Show } from "@lightshow/show";
import { MELODY } from "./data.ts";

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
const FADERS = [...INNER, ...DRL, ...TURN_F];
/** One whole side of the car (0 = left, 1 = right). */
const WING = [
  { drl: "drlL", turn: "turnFL", rep: "repeaterL", rear: "turnRL", outer: "outerL", tail: "tailL" },
  { drl: "drlR", turn: "turnFR", rep: "repeaterR", rear: "turnRR", outer: "outerR", tail: "tailR" },
];

// Cabin: five accents in one upside-down U, the screen below its center.
const U = ["accentLeftRear", "accentLeftFront", "accentFront", "accentRightFront", "accentRightRear"];
const U_SIDE = [["accentLeftRear", "accentLeftFront"], ["accentRightFront", "accentRightRear"]];
const U_FRONT = ["accentLeftFront", "accentFront", "accentRightFront"];
const U_REAR = ["accentLeftRear", "accentRightRear"];
const U_PAIR = ["accentLeftFront", "accentRightFront"];
const SCREEN = "screen";
const INTERIOR = [SCREEN, ...U];
const ALL = [...EXT, ...INTERIOR];

// Closures
const MIRROR_L = 35, MIRROR_R = 36;
const MIRRORS = [MIRROR_L, MIRROR_R];
const WIN_FRONT = [37, 39];
const WIN_REAR = [38, 40];
const WINDOWS = [...WIN_FRONT, ...WIN_REAR];
const TRUNK = 41;
const CHARGE_PORT = 46;
/** One full window-dance swing (open → partway up → open) in the simulator. */
const SWING = 2.2;

// No theme given. Sunset over the carrier deck, afterburner, navy.
const DEFAULT_PALETTE: Palette = {
  calm: [8, 20, 90], // deck navy
  rise: [255, 110, 10], // afterburner orange
  pulse: [255, 140, 30], // sunset amber
  alt: [20, 50, 200], // squadron blue
  flash: [255, 255, 255],
  accent: [255, 50, 60], // sunset crimson
  mellow: [90, 30, 140], // dusk violet
  cool: [120, 180, 255], // afterburner cone blue
  cycle: [[255, 50, 60], [90, 30, 140], [20, 50, 200], [255, 140, 30]],
  glow: [255, 170, 80], // sunset gold
};
const BLACK: RGB = [0, 0, 0];
const dim = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const blend = (a: RGB, b: RGB, k: number): RGB => {
  const t = Math.max(0, Math.min(1, k));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};

// ---- Key moments (s), read from the stems (see PLAN.md) -----------------------
const T = {
  groove: 4.6,
  thin: 11.33, ticks: 12.46, dark1: 12.95,
  guitar: 13.52, // BIG 1: the guitar melody enters
  wingmen: 14.6,
  formation: 22.54,
  climb: 29.25, dark2: 31.15,
  key: 31.49, // key change up a half step
  roll: 40.45, rollFast: 47.17, rollFaster: 48.29, dark3: 48.85,
  soar: 49.41, soar2: 53.89,
  approach: 58.37,
  final: 62.84, lastBar: 64.53, dark4: 65.3,
  chord: 65.6, // BIG 2: the final chord
  cut: 66.49, // the edit stops dead here
};

export default function topGun(s: Show) {
  const P = s.palette(DEFAULT_PALETTE);
  const beats = s.analysis.beats;
  // The analyzer's downbeats are one beat late; the real bar lines start at the first beat.
  const bars = beats.filter((_, i) => i % 4 === 0);
  const beatsIn = (a: number, b: number) => beats.filter((t) => t >= a - 1e-3 && t < b - 1e-3);
  const barsIn = (a: number, b: number) => bars.filter((t) => t >= a - 1e-3 && t < b - 1e-3);
  const beatNo = (t: number) => beats.findIndex((b) => Math.abs(b - t) < 0.02) % 4;
  const eighths = (a: number, b: number) => s.grid(a, b, 2);
  const melody = (a: number, b: number, min = 0) => MELODY.filter(([t, k]) => t >= a && t < b && k >= min).map(([t]) => t);
  const strength = (t: number) => MELODY.find(([x]) => x === t)?.[1] ?? 0;
  const accel = (t0: number, t1: number, startMs: number, minMs: number, k: number) => {
    const out: number[] = [];
    for (let t = t0, p = startMs; t < t1 - 0.03; t += p / 1000, p = Math.max(minMs, p * k)) out.push(t);
    return out;
  };
  const paint = (ids: string | string[], t0: number, t1: number, fn: (t: number) => RGB) => {
    for (let t = t0; t < t1 - 1e-3; t += 0.04) s.color(ids, t, Math.min(t1, t + 0.04), fn(t), fn(Math.min(t1, t + 0.04)));
  };
  const scr = (times: number[], color: RGB, decayMs: number, base: RGB) => s.pulse(SCREEN, times, color, decayMs, base);
  const stem = (t: number, name: string) => {
    let sum = 0;
    for (let k = -2; k <= 2; k++) sum += s.energyAt(Math.max(0, t + k * 0.05), name);
    return sum / 5;
  };
  /** Snap on, then the lights that can fade ring out. */
  const slam = (ids: string[], t: number, holdMs: number, decayMs: number) => {
    s.on(ids, t, t + holdMs / 1000);
    const fading = ids.filter((id) => FADERS.includes(id));
    if (fading.length) s.fadeOut(fading, t + holdMs / 1000, decayMs);
  };

  // =====================================================================
  // 0:00-0:04.6  RADAR. Quiet synth percussion. One U segment sweeps the cabin
  // per beat like a radar; the strong hits ping the screen and blink one DRL
  // with the opposite tail, so both ends answer.
  // =====================================================================
  {
    const a = 0, b = 4.42;
    const hits = s.onsets("kick", 0, 3.6, 1.0);
    s.color(SCREEN, a, b, dim(P.calm, 0.35));
    beatsIn(0.13, 3.7).forEach((t, i) => {
      const w = WING[i % 2], o = WING[1 - (i % 2)];
      s.hit(w.drl, t, 120, 350);
      s.flash(o.tail, t + 0.28, 140);
    });
    hits.forEach((t) => scr([t], P.cool, 600, dim(P.calm, 0.35)));
    // Radar sweep across the U, one segment per beat, eighths in the last beat.
    const sweepTimes = [...beatsIn(0.13, 3.7), ...eighths(3.7, 4.4)];
    s.sweep(U, sweepTimes, { bounce: true, color: P.cool, decayMs: 520 });
    // Pickups into the groove: the percussion cluster at 3.7-4.4 alternates front/rear.
    s.onsets("drums", 3.7, 4.4).forEach((t, i) => s.flash(i % 2 ? TURN_R : REP, t, 70));
    s.flash("plate", 2.37, 140).flash("plate", 1.26, 120);
    s.off(ALL, b, T.groove);
  }

  // =====================================================================
  // 0:04.6-0:13.5  ENGINES SPOOL. The synth bass pedal. Rear heartbeat (brake on
  // 1 and 3, tails on 2 and 4); the DRL eyes breathe once per bar; the screen
  // pulses sunset on every beat; the U swaps sides per beat. The chords drop out
  // at 11.3: the car thins with them, ticks, then black before the guitar.
  // =====================================================================
  {
    const a = T.groove, b = T.thin;
    slam([...OUTER, ...INNER, "brake", ...TAILS], a, 150, 1000);
    s.color(SCREEN, a, T.dark1, dim(P.calm, 0.3));
    scr([a], P.flash, 700, dim(P.calm, 0.3));
    s.pulse(U, [a], P.flash, 700, BLACK);
    beatsIn(a + 0.5, b).forEach((t) => {
      const n = beatNo(t);
      s.flash(n % 2 === 0 ? "brake" : TAILS, t, 120);
      scr([t], n === 0 ? P.rise : P.pulse, 420, dim(P.calm, 0.3));
      s.pulse(U_SIDE[n % 2], [t], P.alt, 480, BLACK);
    });
    // Eyes: one breath per bar; the swell at 9.09 opens the inner beams too.
    [6.85, 9.09].forEach((d) => s.fadeIn(DRL, d, 1000, d + 1.0).fadeOut(DRL, d + 1.0, 1000));
    s.fadeIn(INNER, 9.09, 500, 9.75).fadeOut(INNER, 9.75, 1000);
    s.hit(TURN_F, 9.09, 120, 1000);
    // Thinning: one heartbeat per bar, one short DRL breath, then accelerating ticks.
    s.flash("brake", T.thin, 140).flash(TAILS, 12.46, 120);
    s.fadeIn(DRL, T.thin, 500, 11.8).fadeOut(DRL, 11.8, 350);
    scr([T.thin], P.pulse, 900, dim(P.calm, 0.2));
    s.pulse("accentFront", [T.thin], P.alt, 900, BLACK);
    paint(SCREEN, 11.9, T.dark1, (t) => dim(P.calm, 0.2 * (1 - (t - 11.9) / (T.dark1 - 11.9))));
    accel(12.5, 12.93, 150, 60, 0.8).forEach((t, i) => s.flash(i % 2 ? "plate" : REP, t, 40));
    s.off(ALL, T.dark1, T.guitar);
  }

  // =====================================================================
  // 0:13.52  BIG 1. THE GUITAR ENTERS. Out of black, the whole car and cabin
  // white, a strobe over held beams, then a 2 s ring-out. Mirrors fold onto it,
  // all four windows swing.
  // =====================================================================
  {
    const t = T.guitar, h = t + 0.4, e = t + 1.08;
    s.on(EXT, t, h);
    s.strobe([...OUTER, "brake", "reverse", ...TAILS, ...TURN_R, ...REP, "plate", "rearFog"], h, e, 90, 45);
    s.on([...INNER, ...DRL, ...TURN_F], h, e).fadeOut([...INNER, ...DRL], e, 2000).fadeOut(TURN_F, e, 1000);
    s.color(INTERIOR, t, h, P.flash);
    accel(h, e, 90, 90, 1).forEach((x, i) => scr([x], i % 2 ? P.rise : P.flash, 60, dim(P.rise, 0.5)));
    s.color(U, h, e + 1.2, P.flash, dim(P.pulse, 0.15));
    paint(SCREEN, e, T.wingmen, (x) => blend(P.flash, dim(P.pulse, 0.5), (x - e) / (T.wingmen - e)));
  }

  // =====================================================================
  // 0:14.6-0:22.5  WINGMEN. Each guitar note lights one whole side of the car
  // (DRL, front turn, repeater, rear turn), sides trading like two jets in
  // formation; strong notes add that side's outer beam. Tails mark the bar lines.
  // =====================================================================
  {
    const a = T.wingmen, b = T.formation;
    const notes = melody(a, 21.5, 0.5);
    notes.forEach((t, i) => {
      const w = WING[i % 2];
      const len = Math.min(0.32, (notes[i + 1] ?? t + 0.4) - t - 0.04);
      s.hit([w.drl, w.turn], t, len * 1000, 350);
      s.flash([w.rep, w.rear], t, len * 1000);
      if (strength(t) >= 0.85) s.flash(w.outer, t, 110);
      s.pulse(U_SIDE[i % 2], [t], P.accent, 650, dim(P.calm, 0.25));
    });
    barsIn(a, b).forEach((d) => s.flash(TAILS, d, 220));
    // Screen sings with the guitar: sunset brightness follows the lead stem.
    paint(SCREEN, a, b, (t) => dim(blend(P.calm, P.pulse, Math.min(1, stem(t, "vocals") * 1.6)), 0.35 + 0.55 * Math.min(1, stem(t, "vocals") * 1.4)));
    melody(a, 21.5, 0.9).forEach((t) => scr([t], P.flash, 260, dim(P.pulse, 0.6)));
    s.color("accentFront", a, b, dim(P.calm, 0.25));
    // The last half bar thins to the tails so the formation can open on the bass hit.
    s.off([...FADERS, ...REP, ...OUTER], 21.6, b);
  }

  // =====================================================================
  // 0:22.5-0:29.2  FORMATION. Amber diagonal ping-pong, one per beat
  // (FL, RR, FR, RL). Inner beams swell on the two bass hits; the U front arc
  // answers the rear pair; the screen alternates navy and sunset per bar.
  // =====================================================================
  {
    const a = T.formation, b = T.climb;
    const diag = [["turnFL"], ["turnRR"], ["turnFR"], ["turnRL"]];
    beatsIn(a, b).forEach((t, i) => {
      const g = diag[i % 4];
      const k = g[0].endsWith("L") ? 0 : 1;
      if (g[0].startsWith("turnF")) s.hit([...g, WING[k].drl], t, 260, 350).flash(WING[k].rep, t, 200);
      else s.flash([...g, WING[k].tail], t, 300);
      s.pulse(i % 2 ? U_REAR : U_FRONT, [t], i % 2 ? P.alt : P.glow, 450, BLACK);
    });
    [a, 27.02].forEach((t) => {
      s.flash(["brake", ...TAILS], t, 200);
      s.fadeIn(INNER, t, 1000, t + 1.3).fadeOut(INNER, t + 1.3, 1000);
    });
    barsIn(a, b).forEach((d, i) => {
      const c = i % 2 ? P.pulse : P.alt;
      s.color(SCREEN, d, Math.min(b, d + 2.24), dim(c, 0.65));
      scr([d], P.flash, 500, dim(c, 0.65));
    });
    // Guitar accents on the plate and repeaters, small.
    melody(a, b, 0.75).forEach((t, i) => s.flash(i % 2 ? "plate" : REP, t, 80));
  }

  // =====================================================================
  // 0:29.2-0:31.5  THE CLIMB. B flat: one bar of lift. DRL 2 s ramp, an
  // accelerating strobe front against rear, the U converging outside-in, the
  // screen climbing to white. Then black for the key change.
  // =====================================================================
  {
    const a = T.climb, b = T.dark2;
    s.fadeIn(DRL, a, 2000, b);
    const acc = accel(a, b, 300, 60, 0.88);
    acc.forEach((t, i) => s.flash(i % 2 ? ["brake", "reverse"] : [...OUTER, ...REP], t, 40));
    s.color(U, a, b, BLACK);
    s.color(U_REAR, a, b, dim(P.cool, 0.2), P.cool);
    s.color(U_PAIR, a + 0.56, b, dim(P.cool, 0.2), P.cool);
    s.color("accentFront", a + 1.12, b, dim(P.cool, 0.3), P.flash);
    paint(SCREEN, a, b, (t) => dim(blend(P.calm, P.flash, (t - a) / (b - a)), 0.25 + 0.7 * (t - a) / (b - a)));
    acc.filter((_, i) => i % 3 === 0).forEach((t) => scr([t], P.flash, 60, dim(blend(P.calm, P.flash, (t - a) / (b - a)), 0.25 + 0.7 * (t - a) / (b - a))));
    s.off(ALL, b, T.key);
  }

  // =====================================================================
  // 0:31.49  KEY CHANGE. The afterburner lights: beams, brake, tails, reverse,
  // fog for 0.2 s; screen white into afterburner orange. Mirrors nod into it,
  // front windows swing.
  // =====================================================================
  {
    const t = T.key;
    slam([...OUTER, ...INNER, ...DRL, "brake", ...TAILS, "reverse", "rearFog"], t, 220, 1000);
    s.color(INTERIOR, t, t + 0.22, P.flash);
    paint(SCREEN, t + 0.22, t + 0.8, (x) => blend(P.flash, dim(P.rise, 0.4), (x - t - 0.22) / 0.58));
    s.color(U, t + 0.22, t + 0.8, P.rise, BLACK);
  }

  // =====================================================================
  // 0:31.7-0:40.4  AFTERBURNER. A rear two-stage burn every beat: white core
  // (reverse + plate) then the red flame (brake) a sixteenth later; fog and
  // tails on the bar lines. The outer beams blink with the guitar. The screen
  // flickers orange and blue in eighths with the bass; the U fires inside-out.
  // =====================================================================
  {
    const a = 31.8, b = T.roll;
    beatsIn(32.05, 39.85).forEach((t) => {
      s.flash(["reverse", "plate"], t, 90);
      s.flash("brake", t + 0.14, 200);
    });
    barsIn(a, 39.85).forEach((d) => {
      s.flash(["rearFog", ...TAILS], d, 260);
      s.hit(TURN_F, d + 1.12, 200, 1000); // an amber flame on beat 3
    });
    melody(a, 39.85, 0.6).forEach((t) => s.flash(OUTER, t, 100));
    // Front, every beat: the DRLs flare on the bar line like a burner lighting, then
    // trade sides on the backbeats.
    beatsIn(a, 39.85).forEach((t) => {
      const n = beatNo(t);
      if (n === 0) s.hit(DRL, t, 140, 350);
      else if (n % 2 === 1) s.hit(DRL[(n - 1) / 2], t, 120, 350);
    });
    eighths(a, b).forEach((t, i) => {
      const k = 0.35 + 0.65 * Math.min(1, stem(t, "bass") * 1.5);
      scr([t], dim(i % 2 ? P.cool : P.rise, k), 240, dim(P.rise, 0.18));
    });
    barsIn(a, b).forEach((d) => {
      s.pulse("accentFront", [d], P.cool, 500, BLACK);
      s.pulse(U_PAIR, [d + 0.28], P.cool, 500, BLACK);
      s.pulse(U_REAR, [d + 0.56], P.cool, 500, BLACK);
      s.pulse("accentFront", [d + 1.12], P.rise, 400, BLACK);
    });
    // The last half bar breathes: only the screen, a tail and a turn.
    s.off(ALL.filter((id) => id !== SCREEN), 39.85, b);
    s.flash("tailL", 39.89, 150).hit("turnFR", 40.17, 100, 350);
    paint(SCREEN, 39.85, b, (t) => dim(P.rise, 0.18 * (1 - (t - 39.85) / (b - 39.85))));
  }

  // =====================================================================
  // 0:40.4-0:49.4  BARREL ROLL. The bass climbs. One corner of the car per beat
  // travelling around it, the direction flipping on each bass change; eighths
  // then sixteenths at the end. One U segment travels with it; the screen takes a
  // new hue on every bass chord.
  // =====================================================================
  {
    const a = T.roll, b = T.soar;
    const corners = [
      { ids: ["outerL", "drlL", "turnFL", "repeaterL"], fade: true, cab: "accentLeftFront" },
      { ids: ["outerR", "drlR", "turnFR", "repeaterR"], fade: true, cab: "accentRightFront" },
      { ids: ["tailR", "turnRR"], fade: false, cab: "accentRightRear" },
      { ids: ["tailL", "turnRL"], fade: false, cab: "accentLeftRear" },
    ];
    const flips = [a, 42.69, 44.93, T.rollFast];
    const times = [...beatsIn(a, T.rollFast), ...eighths(T.rollFast, T.rollFaster), ...s.grid(T.rollFaster, T.dark3, 4)];
    let pos = 0, dir = 1;
    times.forEach((t, i) => {
      if (i && flips.some((f) => Math.abs(f - t) < 0.02)) dir = -dir;
      const c = corners[((pos % 4) + 4) % 4];
      const step = (times[i + 1] ?? t + 0.3) - t;
      const on = Math.max(60, Math.min(420, step * 1000 - 60));
      if (c.fade) s.hit(c.ids, t, on, 350);
      else s.flash(c.ids, t, on);
      s.pulse(c.cab, [t], P.glow, Math.max(150, step * 900), BLACK);
      pos += dir;
    });
    // The peak of the climb: inner beams swell, brake on the two bass hits.
    s.fadeIn(INNER, a, 500, 41.3).fadeOut(INNER, 41.3, 1000);
    s.flash(["brake", "reverse"], a, 180).flash("brake", 41.01, 180);
    // The plate ticks the strongest guitar notes.
    melody(a, T.rollFast, 0.75).forEach((t) => s.flash("plate", t, 90));
    const hues = [P.accent, P.mellow, P.alt, P.pulse];
    flips.forEach((f, i) => {
      const end = flips[i + 1] ?? T.dark3;
      s.color(SCREEN, f, end, dim(hues[i], 0.5));
      scr(beatsIn(f, end), hues[i], 450, dim(hues[i], 0.5));
    });
    scr(s.grid(T.rollFaster, T.dark3, 4), P.flash, 70, dim(P.pulse, 0.5));
    // Black, one drum-fill pickup, black.
    s.off(ALL, T.dark3, b);
    s.flash(["brake", ...OUTER], 49.0, 80);
    scr([49.0], P.flash, 120, BLACK);
  }

  // =====================================================================
  // 0:49.4-0:58.4  THE SOAR. Back to C, the guitar at its highest. The main beams
  // carry it: inner beams held per phrase, outer beams and rear turns on the
  // guitar accents, tails held a bar per side, brake on the bar lines. Screen
  // gold with white beats; the U races in eighths. Trunk up, charge port dancing.
  // =====================================================================
  {
    const a = T.soar, b = T.approach;
    slam([...OUTER, "brake", ...TAILS, ...TURN_R, "reverse"], a, 250, 0);
    s.on(INNER, a, 53.4).fadeOut(INNER, 53.4, 350);
    s.fadeIn(INNER, T.soar2, 500, 57.3).fadeOut(INNER, 57.3, 1000);
    melody(a + 0.3, 57.6, 0.55).forEach((t) => s.flash(OUTER, t, 90).flash(TURN_R, t, 120));
    // The guitar's highest notes (53.9-56.1): the outer beams join and hold.
    s.on(OUTER, T.soar2, 56.05);
    barsIn(a + 2, 57.6).forEach((d, i) => { s.on(WING[i % 2].tail, d, d + 2.0); s.flash("brake", d, 150); });
    // Front amber: one slow wash per phrase half, left then right.
    [[51.65, 0], [56.13, 1]].forEach(([d, k]) => s.fadeIn(TURN_F[k], d, 1000, d + 1.1).fadeOut(TURN_F[k], d + 1.1, 1000));
    s.color(SCREEN, a, 57.6, dim(P.glow, 0.75));
    scr(beatsIn(a, 57.6), P.flash, 300, dim(P.glow, 0.75));
    scr([a], P.flash, 800, dim(P.glow, 0.75));
    s.color(U, a, 57.6, dim(P.glow, 0.2));
    s.sweep(U, eighths(a, 57.6), { bounce: true, color: P.flash, decayMs: 260, base: dim(P.glow, 0.2) });
    // The last beat lets go into the approach.
    s.off(ALL.filter((id) => !INNER.includes(id)), 57.6, b);
    paint(SCREEN, 57.6, b, (t) => blend(dim(P.glow, 0.6), dim(P.mellow, 0.3), (t - 57.6) / (b - 57.6)));
  }

  // =====================================================================
  // 0:58.4-1:02.8  APPROACH. A, then B flat: the music pulls back. Landing
  // lights: slow amber washes trading sides per half bar, plate and fog ticks at
  // the rear. Screen dusk violet, breathing per bar.
  // =====================================================================
  {
    const a = T.approach, b = T.final;
    beatsIn(a, b).filter((_, i) => i % 2 === 0).forEach((t, i) => {
      const k = i % 2;
      s.fadeIn([TURN_F[k], DRL[k]], t, 500, t + 0.6).fadeOut([TURN_F[k], DRL[k]], t + 0.6, 350);
      s.flash(i % 2 ? [TURN_R[1 - k], TAILS[1 - k]] : ["plate", "rearFog"], t + 0.28, 160);
    });
    barsIn(a, b).forEach((d) => {
      paint(SCREEN, d, d + 1.12, (t) => dim(P.mellow, 0.3 + 0.5 * (t - d) / 1.12));
      paint(SCREEN, d + 1.12, Math.min(b, d + 2.24), (t) => dim(P.mellow, 0.8 - 0.5 * (t - d - 1.12) / 1.12));
    });
    beatsIn(a, b).forEach((t, i) => s.pulse(i % 2 ? U_REAR : "accentFront", [t], dim(P.glow, 0.6), 520, dim(P.mellow, 0.15)));
  }

  // =====================================================================
  // 1:02.8-1:05.3  FINAL APPROACH. The G pedal. Inner beams swell over 2 s,
  // the rear rolls tail to tail and accelerates, the last bar strobes front
  // against rear, the U converges, the screen climbs to white. Then black.
  // =====================================================================
  {
    const a = T.final, b = T.dark4;
    s.fadeIn(INNER, a, 2000, b);
    accel(a, T.lastBar, 560, 140, 0.86).forEach((t, i) => s.flash(i % 2 ? ["tailR", "turnRR"] : ["tailL", "turnRL"], t, 90));
    accel(T.lastBar, b, 180, 60, 0.85).forEach((t, i) => s.flash(i % 2 ? ["brake", "reverse"] : [...OUTER, ...REP], t, 40));
    s.color(U, a, b, BLACK);
    s.color(U_REAR, a, b, dim(P.rise, 0.2), P.rise);
    s.color(U_PAIR, 63.97, b, dim(P.rise, 0.3), P.flash);
    s.color("accentFront", T.lastBar, b, dim(P.flash, 0.4), P.flash);
    paint(SCREEN, a, b, (t) => dim(blend(P.rise, P.flash, (t - a) / (b - a)), 0.3 + 0.65 * (t - a) / (b - a)));
    s.off(ALL, b, T.chord);
  }

  // =====================================================================
  // 1:05.6  BIG 2. THE FINAL CHORD. Out of black, everything held solid for the
  // chord. The edit cuts dead at 66.49: the on/off lights snap off with it, the
  // beams, DRLs and cabin ring out like the chord into the silence.
  // =====================================================================
  {
    const t = T.chord, c = T.cut;
    s.on(EXT, t, c);
    s.fadeOut([...INNER, ...DRL], c, 2000).fadeOut(TURN_F, c, 1000);
    s.color(INTERIOR, t, c, P.flash);
    paint(SCREEN, c, c + 2.6, (x) => { const k = (x - c) / 2.6; return k < 0.4 ? blend(P.flash, P.glow, k / 0.4) : dim(P.glow, 1 - (k - 0.4) / 0.6); });
    paint(U_REAR, c, c + 1.2, (x) => dim(P.glow, 1 - (x - c) / 1.2));
    paint(U_PAIR, c, c + 1.8, (x) => dim(P.glow, 1 - (x - c) / 1.8));
    paint("accentFront", c, c + 2.4, (x) => dim(P.glow, 1 - (x - c) / 2.4));
  }

  // =====================================================================
  // DANCE MOVES (closures; unverified on this car). Windows down at the start and
  // down while music plays; they move by dancing and close after the music.
  // =====================================================================
  s.closure(WINDOWS, 0.0, "open");
  s.closure(MIRRORS, 0.2, "close");
  s.closure(MIRRORS, 2.6, "open");
  s.closure(MIRRORS, T.guitar - 2.0, "close");
  s.closure(WINDOWS, T.guitar, "dance", T.guitar + SWING);
  s.closure(MIRRORS, 15.82, "open");
  s.closure(MIRROR_L, T.key - 2.0, "close");
  s.closure(MIRROR_R, T.key - 1.74, "close");
  s.closure(WIN_FRONT, T.key, "dance", T.key + SWING);
  s.closure(MIRRORS, 33.73, "open");
  s.closure(TRUNK, T.soar - 14.0, "open");
  s.closure(MIRRORS, T.soar - 2.0, "close");
  s.closure(CHARGE_PORT, T.soar - 2.0, "open");
  s.closure(MIRRORS, 51.65, "open");
  s.closure(CHARGE_PORT, 51.65, "dance", 55.0);
  s.closure(TRUNK, T.soar2, "dance", 56.13);
  s.closure(WIN_REAR, T.soar2, "dance", T.soar2 + SWING);
  s.closure(CHARGE_PORT, 56.13, "close");
  s.closure(TRUNK, T.approach, "close");
  s.closure(MIRRORS, T.chord - 2.0, "close");
  s.closure(WINDOWS, T.chord, "dance", T.chord + 1.1);
  s.closure(MIRRORS, 66.8, "open");
  s.closure(WINDOWS, 66.8, "close");
}
