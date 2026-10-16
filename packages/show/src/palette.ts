// Interior color by role. A show script asks for colors by what they do in the song
// (calm, rise, pulse...). With a theme, every role is built from the theme colors
// only; without one, the script's own defaults are used. Exterior lights have fixed
// colors and are never themed.

export type RGB = [number, number, number];

export interface Palette {
  /** Quiet sections, breathing. */
  calm: RGB;
  /** Builds and risers. */
  rise: RGB;
  /** The main beat color. */
  pulse: RGB;
  /** Alternates with pulse. */
  alt: RGB;
  /** The biggest hits and strobes. */
  flash: RGB;
  /** Second accent color for chases. */
  accent: RGB;
  /** Slow, emotional sections. */
  mellow: RGB;
  /** Bright, airy sections. */
  cool: RGB;
  /** Colors to cycle through, one per bar. */
  cycle: RGB[];
  /** The final glow. */
  glow: RGB;
}

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`Theme color must be #rrggbb, got "${hex}"`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export const mix = (a: RGB, b: RGB, k: number): RGB => {
  const t = Math.max(0, Math.min(1, k));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};

/** Roles from 1-3 theme colors: the first leads, the second contrasts, the third (or a blend) fills in. */
export function themePalette(theme: RGB[]): Palette {
  const a = theme[0];
  const b = theme[1] ?? [255, 255, 255];
  const c = theme[2] ?? mix(a, b, 0.5);
  return {
    calm: a,
    rise: a,
    pulse: a,
    alt: b,
    flash: b,
    accent: c,
    mellow: a,
    cool: b,
    cycle: [a, c, a, b],
    glow: mix(b, a, 0.35),
  };
}
