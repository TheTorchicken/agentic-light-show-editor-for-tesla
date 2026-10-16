// Measures a show against the design fundamentals (skills/design-fundamentals),
// using the simulated car output. Numbers, not taste: the human still judges.

import type { RGB } from "./palette.ts";
import type { Analysis } from "./show.ts";
import type { Profile } from "./profile.ts";
import type { SimLight } from "./simulate.ts";

export interface Critique {
  exteriorDuty: number;
  perLight: Array<{ id: string; duty: number; changes: number }>;
  idle: string[];
  sections: Array<{ start: number; end: number; musicEnergy: number; lightEnergy: number; activeLights: number }>;
  contrastBeforeSections: Array<{ at: number; before: number; after: number }>;
  /** Stretches where everything visible from one end of the car is dark while music plays. */
  darkViews: Array<{ view: string; start: number; end: number }>;
  /** Share of lit interior frames whose color is outside the song's theme (blends of theme colors count as in). */
  offTheme?: number;
  /** Texture difference between each section and the next (0 = identical, 1 = completely different). */
  sectionContrast: Array<{ at: number; difference: number }>;
  /** Brightest section's light energy divided by the quietest playing section's. */
  dynamicRange: number;
  notes: string[];
}

export function critique(sim: SimLight[], profile: Profile, analysis: Analysis, stepMs: number, theme?: RGB[]): Critique {
  const exterior = sim.filter((s) => profile.lights.find((l) => l.id === s.id)!.behavior !== "rgb");
  const frames = sim[0].level.length;
  const at = (t: number) => Math.min(frames, Math.max(0, Math.round((t * 1000) / stepMs)));
  const mean = (s: SimLight, a: number, b: number) => {
    let sum = 0;
    for (let f = at(a); f < at(b); f++) sum += s.level[f];
    return sum / Math.max(1, at(b) - at(a));
  };
  const perLight = sim.map((s) => {
    let on = 0, changes = 0;
    for (let f = 0; f < frames; f++) { if (s.level[f] > 0.5) on++; if (f && (s.level[f] > 0.5) !== (s.level[f - 1] > 0.5)) changes++; }
    return { id: s.id, duty: on / frames, changes };
  });
  const extIds = new Set(exterior.map((s) => s.id));
  const exteriorDuty = perLight.filter((p) => extIds.has(p.id)).reduce((n, p) => n + p.duty, 0) / exterior.length;
  const idle = perLight.filter((p) => p.changes === 0).map((p) => p.id);
  const sections = analysis.sections.map((sec) => ({
    start: sec.start, end: sec.end, musicEnergy: sec.energy,
    lightEnergy: exterior.reduce((n, s) => n + mean(s, sec.start, sec.end), 0) / exterior.length,
    activeLights: sim.filter((s) => mean(s, sec.start, sec.end) > 0.02).length,
  }));
  // Bar length from the beats themselves, which are more reliable than the tempo number.
  const beatGaps = analysis.beats.slice(1).map((b, i) => b - analysis.beats[i]).sort((x, y) => x - y);
  const bar = 4 * (beatGaps.length ? beatGaps[Math.floor(beatGaps.length / 2)] : 60 / analysis.tempo);
  const contrastBeforeSections = analysis.sections.slice(1).map((sec) => ({
    at: sec.start,
    before: exterior.reduce((n, s) => n + mean(s, sec.start - bar / 2, sec.start), 0) / exterior.length,
    after: exterior.reduce((n, s) => n + mean(s, sec.start, sec.start + bar), 0) / exterior.length,
  }));

  // A viewer standing at one end should always see something while the music is
  // playing. Scan each exterior view in 50 ms steps for dark runs longer than a bar.
  const darkViews: Critique["darkViews"] = [];
  // Music energy averaged over a second, so gaps between drum hits don't count as silence.
  const music = (t: number) => {
    const c = analysis.energy, i = Math.round(t / analysis.curveStep), w = Math.round(0.5 / analysis.curveStep);
    let sum = 0, n = 0;
    for (let k = Math.max(0, i - w); k <= Math.min(c.length - 1, i + w); k++) { sum += c[k]; n++; }
    return n ? sum / n : 0;
  };
  for (const view of ["front", "rear"]) {
    // The screen shows through the windshield, so it counts for the front.
    const inView = sim.filter((s) => s.id === "screen" && view === "front" || profile.lights.find((l) => l.id === s.id)!.shapes.some((sh) => sh.view === view));
    let runStart: number | null = null;
    for (let t = 0; t <= analysis.duration; t += stepMs / 1000) {
      const f = at(t);
      const dark = f >= frames || inView.every((s) => s.level[f] < 0.05);
      const quiet = music(t) < 0.08;
      if (dark && !quiet) runStart ??= t;
      else if (runStart !== null) {
        if (t - runStart >= bar) darkViews.push({ view, start: runStart, end: t });
        runStart = null;
      }
    }
    if (runStart !== null && analysis.duration - runStart >= bar) darkViews.push({ view, start: runStart, end: analysis.duration });
  }

  // Theme: compare hue only (brightness is free), against each theme color and the
  // blends between any two of them.
  let offTheme: number | undefined;
  if (theme?.length) {
    const norm = (c: ArrayLike<number>): RGB => { const m = Math.max(c[0], c[1], c[2], 1); return [c[0] / m, c[1] / m, c[2] / m]; };
    const anchors = theme.map(norm);
    const distToSegment = (p: RGB, a: RGB, b: RGB) => {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const len = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      const t = len ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len)) : 0;
      return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
    };
    let lit = 0, off = 0;
    for (const s of sim) {
      if (!s.rgb) continue;
      for (let f = 0; f < frames; f++) {
        const c = [s.rgb[0][f], s.rgb[1][f], s.rgb[2][f]];
        if (Math.max(...c) < 30) continue;
        lit++;
        const p = norm(c);
        let best = Infinity;
        for (const a of anchors) for (const b of anchors) best = Math.min(best, distToSegment(p, a, b));
        if (best > 0.2) off++;
      }
    }
    offTheme = lit ? off / lit : 0;
  }

  // Texture per section: for each light group, how much it is on and how often it changes.
  const groups: Record<string, string[]> = {};
  for (const l of profile.lights) {
    const g = l.behavior === "rgb" ? (l.id === "screen" ? "screen" : "accents")
      : /outer|inner/.test(l.id) ? "beams" : /drl/.test(l.id) ? "drl" : /turn|repeater/.test(l.id) ? "amber" : "rear";
    (groups[g] ??= []).push(l.id);
  }
  const byId = new Map(sim.map((s) => [s.id, s]));
  const texture = (a: number, b: number) => Object.values(groups).flatMap((ids) => {
    let on = 0, chg = 0, n = 0;
    for (const id of ids) {
      const lv = byId.get(id)!.level;
      for (let f = Math.max(1, at(a)); f < at(b); f++, n++) { on += lv[f]; if (Math.abs(lv[f] - lv[f - 1]) > 0.3) chg++; }
    }
    const secs = Math.max(0.5, b - a);
    return [n ? on / n : 0, Math.min(1, chg / ids.length / secs / 4)]; // changes capped at 4 per second per light
  });
  const textures = analysis.sections.map((s) => texture(s.start, s.end));
  const sectionContrast = analysis.sections.slice(1).map((sec, i) => ({
    at: sec.start,
    difference: textures[i].reduce((n, v, k) => n + Math.abs(v - textures[i + 1][k]), 0) / textures[i].length,
  }));
  const playing = sections.filter((s) => s.musicEnergy > 0.15 && s.end - s.start > 4);
  const dynamicRange = playing.length ? Math.max(...playing.map((s) => s.lightEnergy)) / Math.max(0.01, Math.min(...playing.map((s) => s.lightEnergy))) : 1;

  const notes: string[] = [];
  for (const p of perLight) {
    const l = profile.lights.find((x) => x.id === p.id)!;
    if (l.behavior !== "rgb" && p.duty > 0.35) notes.push(`${p.id} is on ${(p.duty * 100).toFixed(0)}% of the time; a light that is always on reads as background and flattens hits.`);
  }
  for (let i = 0; i < sectionContrast.length; i++) {
    const c = sectionContrast[i], a = analysis.sections[i], b = analysis.sections[i + 1];
    if (c.difference < 0.04 && a.end - a.start > 6 && b.end - b.start > 6) notes.push(`Sections before and after ${c.at.toFixed(1)}s look alike (texture difference ${c.difference.toFixed(2)}); give each its own motif.`);
  }
  if (dynamicRange < 2.5) notes.push(`Dynamic range is ${dynamicRange.toFixed(1)}x between the quietest and brightest playing sections; aim for 3x or more.`);
  if (offTheme !== undefined && offTheme > 0.02) notes.push(`${(offTheme * 100).toFixed(0)}% of lit interior frames are off the song's color theme.`);
  for (const d of darkViews) notes.push(`The ${d.view} is completely dark ${d.start.toFixed(1)}-${d.end.toFixed(1)}s while music plays.`);
  if (exteriorDuty > 0.4) notes.push(`Exterior lights are on ${(exteriorDuty * 100).toFixed(0)}% of the time; aim well under 40%.`);
  if (idle.length) notes.push(`Never used: ${idle.join(", ")}.`);
  for (const s of sections) if (s.musicEnergy > 0.35 && s.activeLights < 6) notes.push(`${s.start.toFixed(1)}s section is energetic but only ${s.activeLights} lights are active.`);
  for (const c of contrastBeforeSections) if (c.after > 0.15 && c.before > c.after * 0.8) notes.push(`No build-up contrast before ${c.at.toFixed(1)}s (before ${c.before.toFixed(2)}, after ${c.after.toFixed(2)}).`);
  const corr = pearson(sections.map((s) => s.musicEnergy), sections.map((s) => s.lightEnergy));
  notes.push(`Light energy follows music energy across sections with correlation ${corr.toFixed(2)}.`);
  return { exteriorDuty, perLight, idle, sections, contrastBeforeSections, darkViews, offTheme, sectionContrast, dynamicRange, notes };
}

function pearson(a: number[], b: number[]): number {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db || 1);
}

export function critiqueReport(c: Critique): string {
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  return [
    `Exterior duty: ${pct(c.exteriorDuty)}`,
    `Dynamic range: ${c.dynamicRange.toFixed(1)}x`,
    ...(c.offTheme !== undefined ? [`Interior on theme: ${pct(1 - c.offTheme)}`] : []),
    "",
    "Per light (duty, changes):",
    ...c.perLight.map((p) => `  ${p.id.padEnd(15)} ${pct(p.duty).padStart(4)}  ${String(p.changes).padStart(5)}`),
    "",
    "Sections (music energy -> light energy, active lights):",
    ...c.sections.map((s) => `  ${s.start.toFixed(1).padStart(6)}-${s.end.toFixed(1).padEnd(6)} ${s.musicEnergy.toFixed(2)} -> ${s.lightEnergy.toFixed(2)}  ${s.activeLights}`),
    "",
    "Notes:",
    ...c.notes.map((n) => `  - ${n}`),
  ].join("\n");
}
