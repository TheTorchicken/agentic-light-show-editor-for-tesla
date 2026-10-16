// The four probes, one per camera position. Each test answers one question about
// what a car really does with a channel. See docs/PROBE.md for the filming guide.

import { CLOSURE, RAMP, RANGES, channelLabel } from "@lightshow/core";
import { flashes, hold, on, ramp, range, steps, sweep, triangle, type Probe, type Test } from "./timeline.ts";

const identity = (channels: number[]): Test[] =>
  channels.map((c) => ({ title: `${channelLabel(c)}, channel ${c}`, actions: [on("on", [c])] }));

// Smooth ramp, a held mid value, then each of Tesla's six ramp codes (held 700 ms
// past the ramp so it completes). Run on left-side channels only: right is the same part.
const fade = (c: number): Test => ({
  title: `Fade test, ${channelLabel(c)}`,
  actions: [
    triangle("smooth ramp 0 to 255 to 0, 2 s each way", [c], 2000),
    hold("half brightness, 128", [c], 128, 2000),
    // Raw byte values in ascending order, so results stay comparable across probe
    // versions whatever the codes turn out to mean.
    steps("ramp codes: 179/26, 204/51, 230/77", [c], [
      [179, 1200], [RAMP.off500, 1200],
      [204, 1700], [RAMP.off1000, 1700],
      [230, 2700], [RAMP.off2000, 2700],
    ]),
  ],
});

const flashTest = (c: number): Test => ({
  title: `Short flashes, ${channelLabel(c)}`,
  actions: [flashes("flashes 300, 150, 80, 40, 20 ms, twice each", [c], [300, 150, 80, 40, 20])],
});

const barTests = (name: string, bar: { first: number; count: number }): Test[] => {
  const all = range(bar.first, bar.count);
  const half = bar.count / 2;
  return [
    { title: `${name} light bar, one LED at a time`, actions: [sweep(`sweep ch ${bar.first}-${bar.first + bar.count - 1}`, bar.first, bar.count, 160)] },
    { title: `${name} light bar, brightness ramp`, actions: [
      ramp("all LEDs 0 to 255 over 3 s", all, 0, 255, 3000),
      ramp("all LEDs 255 to 0 over 3 s", all, 255, 0, 3000),
    ] },
    { title: `${name} light bar, halves`, actions: [
      on(`first half, ch ${bar.first}-${bar.first + half - 1}`, range(bar.first, half), 1500),
      on(`second half, ch ${bar.first + half}-${bar.first + bar.count - 1}`, range(bar.first + half, half), 1500),
    ] },
  ];
};

const L = { outer: 1, inner: 3, signature: 5, ch4: 7, ch5: 9, ch6: 11, turn: 13, fog: 15, auxPark: 17, sideMarker: 19, repeater: 21 };

export const front: Probe = {
  slug: "front",
  fileName: "Probe_1_Front",
  camera: "Front of the car, slightly off-center, 3-5 m away. Both headlamps and the front bar in frame.",
  syncChannels: [...range(1, 22), ...range(RANGES.frontBar.first, RANGES.frontBar.count)],
  tests: [
    ...identity(range(1, 22)),
    { title: "Channels 4, 5 and 6 together, left", actions: [
      on("4 and 5", [L.ch4, L.ch5]),
      on("4, 5 and 6", [L.ch4, L.ch5, L.ch6]),
    ] },
    { title: "Channel 4 slow fade with channel 5 instant, left", actions: [
      { label: "ch 4 = ramp on 1000 ms, ch 5 = instant on", durMs: 2500, channels: [L.ch4, L.ch5],
        render: (_t, set) => { set(L.ch4, RAMP.on1000); set(L.ch5, 255); } },
    ] },
    ...[L.outer, L.inner, L.signature, L.ch4, L.turn, L.fog].map(fade),
    ...[L.outer, L.signature, L.turn].map(flashTest),
    ...barTests("Front", RANGES.frontBar),
    { title: "Unmapped front channels", actions: [
      on("ch 107-110", range(RANGES.frontBarExtra.first, RANGES.frontBarExtra.count)),
      on("offroad bar ch 167-172", range(RANGES.offroadBar.first, RANGES.offroadBar.count)),
      on("ch 173-174", [173, 174]),
    ] },
  ],
};

const R = { repeater: 21, rearTurn: 23, brake: 25, tail: 26, reverse: 28, rearFog: 29, license: 30 };

export const rear: Probe = {
  slug: "rear",
  fileName: "Probe_2_Rear",
  camera: "Rear of the car, slightly off-center, 3-5 m away. Both tail lamps, license plate and rear bar in frame.",
  syncChannels: [...range(21, 10), ...range(RANGES.rearBar.first, RANGES.rearBar.count)],
  tests: [
    ...identity(range(21, 10)),
    ...[R.rearTurn, R.brake, R.tail, R.reverse].map(fade),
    ...[R.brake, R.tail].map(flashTest),
    ...barTests("Rear", RANGES.rearBar),
    { title: "Unmapped rear channels", actions: [on("ch 163-166", range(RANGES.rearBarExtra.first, RANGES.rearBarExtra.count))] },
  ],
};

const rgbGroups = Array.from({ length: 8 }, (_, i) => RANGES.interiorRgb.first + i * 3);

export const interior: Probe = {
  slug: "interior",
  fileName: "Probe_3_Interior",
  camera: "Inside the cabin or through the windshield, showing the dash, door and rear accent strips and the screen.",
  syncChannels: range(RANGES.interiorRgb.first, RANGES.interiorRgb.count),
  tests: [
    ...rgbGroups.map((g, i): Test => ({
      title: `Interior segment ${i + 1}, channels ${g} to ${g + 2}`,
      actions: [
        on(`ch ${g} only (expect red)`, [g], 1200),
        on(`ch ${g + 1} only (expect green)`, [g + 1], 1200),
        on(`ch ${g + 2} only (expect blue)`, [g + 2], 1200),
        on("all three (expect white)", [g, g + 1, g + 2], 1200),
      ],
    })),
    { title: "Channel 200", actions: [on("ch 200", [200])] },
    { title: "All interior segments, white brightness ramp", actions: [
      ramp("0 to 255 over 4 s", range(RANGES.interiorRgb.first, RANGES.interiorRgb.count), 0, 255, 4000),
      ramp("255 to 0 over 4 s", range(RANGES.interiorRgb.first, RANGES.interiorRgb.count), 255, 0, 4000),
    ] },
  ],
};

// A command is held briefly then returned to idle, like Tesla's own examples.
// Totals stay inside every per-show limit: mirrors 4 each, windows 2 each, charge port 3.
// The liftgate is left out on purpose: it takes 14 s and needs clearance.
const command = (label: string, channels: number[], value: number, waitMs: number) =>
  steps(label, channels, [[value, 600], [CLOSURE.idle, waitMs]]);

export const closures: Probe = {
  slug: "closures",
  fileName: "Probe_4_Closures",
  camera: "Wide shot of the whole car from the front corner, so mirrors, a window and the charge port are visible.",
  syncChannels: [1, 2, 3, 4, 25, 26, 27],
  tests: [
    { title: "Left mirror", actions: [command("fold (close)", [35], CLOSURE.close, 3000), command("unfold (open)", [35], CLOSURE.open, 3000)] },
    { title: "Right mirror", actions: [command("fold (close)", [36], CLOSURE.close, 3000), command("unfold (open)", [36], CLOSURE.open, 3000)] },
    { title: "Both mirrors", actions: [command("fold", [35, 36], CLOSURE.close, 3000), command("unfold", [35, 36], CLOSURE.open, 3000)] },
    { title: "Left front window", actions: [command("open", [37], CLOSURE.open, 5000), command("close", [37], CLOSURE.close, 5000)] },
    { title: "Right front window dance", actions: [
      steps("dance for 5 s", [39], [[CLOSURE.dance, 5000], [CLOSURE.idle, 500]]),
      command("close", [39], CLOSURE.close, 5000),
    ] },
    { title: "Charge port", actions: [
      command("open", [46], CLOSURE.open, 3000),
      steps("dance for 6 s", [46], [[CLOSURE.dance, 6000], [CLOSURE.idle, 500]]),
      command("close", [46], CLOSURE.close, 3000),
    ] },
  ],
};

export const PROBES: Probe[] = [front, rear, interior, closures];
