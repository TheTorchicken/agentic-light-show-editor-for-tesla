// A probe is a list of tests. Each test is announced by voice while the car is dark,
// then runs one or more actions separated by short dark gaps. The build step turns
// this into an FSEQ, a WAV and a manifest of exact action times for video analysis.

export type Setter = (channel: number, value: number) => void;

export interface Action {
  label: string;
  durMs: number;
  channels: number[];
  /** Called for every frame; tMs is time since the action started. */
  render: (tMs: number, set: Setter) => void;
}

export interface Test {
  title: string;
  actions: Action[];
}

export interface Probe {
  slug: string;
  fileName: string;
  camera: string;
  /** Lights flashed at start and end so video and show can be aligned. */
  syncChannels: number[];
  tests: Test[];
}

export const hold = (label: string, channels: number[], value: number, durMs: number): Action => ({
  label, durMs, channels, render: (_t, set) => channels.forEach((c) => set(c, value)),
});

export const on = (label: string, channels: number[], durMs = 2000): Action => hold(label, channels, 255, durMs);

export const ramp = (label: string, channels: number[], from: number, to: number, durMs: number): Action => ({
  label, durMs, channels,
  render: (t, set) => channels.forEach((c) => set(c, from + ((to - from) * t) / durMs)),
});

/** 0 up to 255 and back down, each half lasting halfMs. */
export const triangle = (label: string, channels: number[], halfMs: number): Action => ({
  label, durMs: 2 * halfMs, channels,
  render: (t, set) => channels.forEach((c) => set(c, (255 * (t < halfMs ? t : 2 * halfMs - t)) / halfMs)),
});

/** Consecutive held values, e.g. Tesla's ramp command codes. */
export const steps = (label: string, channels: number[], parts: Array<[value: number, ms: number]>): Action => ({
  label, channels,
  durMs: parts.reduce((n, [, ms]) => n + ms, 0),
  render: (t, set) => {
    let at = 0;
    for (const [value, ms] of parts) {
      if (t < at + ms) return channels.forEach((c) => set(c, value));
      at += ms;
    }
  },
});

/** One channel at a time across a range: shows order, direction and per-pixel control. */
export const sweep = (label: string, first: number, count: number, perMs: number): Action => ({
  label, durMs: count * perMs,
  channels: Array.from({ length: count }, (_, i) => first + i),
  render: (t, set) => set(first + Math.min(count - 1, Math.floor(t / perMs)), 255),
});

/** Flashes of decreasing length, each repeated, to find the shortest visible flash. */
export const flashes = (label: string, channels: number[], lengthsMs: number[], repeats = 2, offMs = 400): Action => {
  const pulses: Array<[start: number, len: number]> = [];
  let at = 0;
  for (const len of lengthsMs) for (let r = 0; r < repeats; r++) { pulses.push([at, len]); at += len + offMs; }
  return {
    label, durMs: at, channels,
    render: (t, set) => {
      if (pulses.some(([s, len]) => t >= s && t < s + len)) channels.forEach((c) => set(c, 255));
    },
  };
};

export const range = (first: number, count: number): number[] => Array.from({ length: count }, (_, i) => first + i);
