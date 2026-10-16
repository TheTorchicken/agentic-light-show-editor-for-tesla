// The 200-channel layout every Tesla custom show uses. Channel numbers are 1-based,
// matching xLights and Tesla's docs. Shows are vehicle-agnostic: a car ignores
// channels it has no hardware for.
//
// Sources: Tesla's public xLights layout (teslamotors/light-show, Dec 2024) and its
// README. Anything not in those sources is marked `unverified` and must be confirmed
// with the probe before a car profile relies on it.

export const CHANNEL_COUNT = 200;

export type ChannelKind = "light" | "closure" | "pixel" | "rgb" | "mechanical" | "unassigned";

export interface ChannelInfo {
  channel: number;
  name: string;
  kind: ChannelKind;
  side?: "L" | "R";
  unverified?: boolean;
}

const named: Array<[number, string, ChannelKind, ("L" | "R")?]> = [
  [1, "Outer Main Beam", "light", "L"], [2, "Outer Main Beam", "light", "R"],
  [3, "Inner Main Beam", "light", "L"], [4, "Inner Main Beam", "light", "R"],
  [5, "Signature", "light", "L"], [6, "Signature", "light", "R"],
  [7, "Channel 4", "light", "L"], [8, "Channel 4", "light", "R"],
  [9, "Channel 5", "light", "L"], [10, "Channel 5", "light", "R"],
  [11, "Channel 6", "light", "L"], [12, "Channel 6", "light", "R"],
  [13, "Front Turn", "light", "L"], [14, "Front Turn", "light", "R"],
  [15, "Front Fog", "light", "L"], [16, "Front Fog", "light", "R"],
  [17, "Aux Park", "light", "L"], [18, "Aux Park", "light", "R"],
  [19, "Side Marker", "light", "L"], [20, "Side Marker", "light", "R"],
  [21, "Side Repeater", "light", "L"], [22, "Side Repeater", "light", "R"],
  [23, "Rear Turn", "light", "L"], [24, "Rear Turn", "light", "R"],
  [25, "Brake Lights", "light"],
  [26, "Tail", "light", "L"], [27, "Tail", "light", "R"],
  [28, "Reverse Lights", "light"],
  [29, "Rear Fog", "light"],
  [30, "License Plate", "light"],
  [31, "Falcon Door", "closure", "L"], [32, "Falcon Door", "closure", "R"],
  [33, "Front Door", "closure", "L"], [34, "Front Door", "closure", "R"],
  [35, "Mirror", "closure", "L"], [36, "Mirror", "closure", "R"],
  [37, "Front Window", "closure", "L"], [38, "Rear Window", "closure", "L"],
  [39, "Front Window", "closure", "R"], [40, "Rear Window", "closure", "R"],
  [41, "Liftgate", "closure"],
  [42, "Front Door Handle", "closure", "L"], [43, "Rear Door Handle", "closure", "L"],
  [44, "Front Door Handle", "closure", "R"], [45, "Rear Door Handle", "closure", "R"],
  [46, "Charge Port", "closure"],
  [175, "Suspension", "mechanical"],
];

export const RANGES = {
  frontBar: { first: 47, count: 60 },
  frontBarExtra: { first: 107, count: 4 },
  rearBar: { first: 111, count: 52 },
  rearBarExtra: { first: 163, count: 4 },
  offroadBar: { first: 167, count: 6 },
  // 176-199 as eight RGB triplets. Segment names differ between Tesla's layout and
  // community maps, so the probe identifies them by position, not by name.
  interiorRgb: { first: 176, count: 24 },
} as const;

export const CHANNELS: ChannelInfo[] = (() => {
  const out: ChannelInfo[] = [];
  for (let c = 1; c <= CHANNEL_COUNT; c++) out.push({ channel: c, name: `Unassigned ${c}`, kind: "unassigned" });
  for (const [c, name, kind, side] of named) out[c - 1] = { channel: c, name, kind, side };
  const fill = (first: number, count: number, label: string, kind: ChannelKind, unverified = false) => {
    for (let i = 0; i < count; i++) out[first + i - 1] = { channel: first + i, name: `${label} ${i}`, kind, unverified };
  };
  fill(RANGES.frontBar.first, RANGES.frontBar.count, "Front Bar LED", "pixel");
  fill(RANGES.frontBarExtra.first, RANGES.frontBarExtra.count, "Front Bar Extra", "pixel", true);
  fill(RANGES.rearBar.first, RANGES.rearBar.count, "Rear Bar LED", "pixel");
  fill(RANGES.rearBarExtra.first, RANGES.rearBarExtra.count, "Rear Bar Extra", "pixel", true);
  fill(RANGES.offroadBar.first, RANGES.offroadBar.count, "Offroad Bar Segment", "pixel");
  fill(RANGES.interiorRgb.first, RANGES.interiorRgb.count, "Interior RGB", "rgb", true);
  return out;
})();

export const channelLabel = (c: number): string => {
  const info = CHANNELS[c - 1];
  if (!info) throw new RangeError(`Channel ${c} is outside 1-${CHANNEL_COUNT}`);
  return info.side ? `${info.side === "L" ? "Left" : "Right"} ${info.name}` : info.name;
};

// Ramp command values for lights without full brightness control, as xLights
// brightness percentages of 255. The turn-on codes are the reverse of the table in
// Tesla's README (which says 70% = 500 ms). Probe run 1 on a 2027 Model 3 measured
// 70% ramping over ~2 s and 90% over ~0.5 s, which matches Tesla's own xLights key
// bindings (E = 90% = "Turn on; 500 ms"). See docs/findings/2026-10-probe-run-1.md.
export const RAMP = {
  offInstant: 0,
  off500: 26, // 10%
  off1000: 51, // 20%
  off2000: 77, // 30%
  on2000: 179, // 70%
  on1000: 204, // 80%
  on500: 230, // 90%
  onInstant: 255, // 100%
} as const;

// Closure commands (Tesla README; byte values match Tesla's own example shows).
// Only open, dance and close count toward the per-show limits.
export const CLOSURE = {
  idle: 0,
  open: 63, // 25%
  dance: 127, // 50%
  close: 191, // 75%
  stop: 255, // 100%
} as const;

export const CLOSURE_LIMITS: Record<string, number> = {
  Liftgate: 6,
  Mirror: 20,
  "Charge Port": 3,
  Window: 6,
  "Door Handle": 20,
  "Front Door": 6,
  "Falcon Door": 6,
};
