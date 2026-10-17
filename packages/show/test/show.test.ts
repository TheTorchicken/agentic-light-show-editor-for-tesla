import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { getValue, RAMP, validate } from "@lightshow/core";
import { Show, loadProfile, simulate, type Analysis } from "../src/index.ts";

const profile = loadProfile(fileURLToPath(new URL("../../../profiles/model3-2027.json", import.meta.url)));
const analysis: Analysis = {
  duration: 10, tempo: 120, beats: [0, 0.5, 1, 1.5, 2, 2.5, 3], downbeats: [0, 2], onsets: {},
  energy: [0], curveStep: 0.05, sections: [{ start: 0, end: 10, energy: 0.5 }],
};
const level = (show: Show, id: string, t: number) => {
  const sim = simulate(show.toSequence(), profile).find((s) => s.id === id)!;
  return sim.level[show.frame(t)];
};

test("fadeIn on a ramp light uses the measured code and ramps over that time", () => {
  const s = new Show(profile, analysis);
  s.fadeIn("innerL", 1, 1000, 4);
  assert.equal(getValue(s.toSequence(), s.frame(1.5), 3), RAMP.on1000);
  assert.ok(Math.abs(level(s, "innerL", 1.5) - 0.5) < 0.05, "half way through a 1 s ramp");
  assert.equal(level(s, "innerL", 2.5), 1);
  assert.equal(level(s, "innerL", 4.5), 0);
});

test("fadeIn on an on/off light becomes a switch and warns", () => {
  const s = new Show(profile, analysis);
  s.fadeIn("brake", 1, 1000, 3);
  assert.equal(level(s, "brake", 1.2), 0);
  assert.equal(level(s, "brake", 1.6), 1);
  assert.equal(s.warnings.length, 1);
});

test("strobe flashes stay distinct", () => {
  const s = new Show(profile, analysis);
  s.strobe("outerL", 1, 2, 100, 90);
  const seq = s.toSequence();
  let flashes = 0;
  for (let f = s.frame(1); f < s.frame(2); f++) if (getValue(seq, f, 1) && !getValue(seq, f - 1, 1)) flashes++;
  assert.equal(flashes, 10);
});

test("later calls override earlier ones", () => {
  const s = new Show(profile, analysis);
  s.on("tailL", 0, 5).off("tailL", 2, 3);
  assert.equal(level(s, "tailL", 1), 1);
  assert.equal(level(s, "tailL", 2.5), 0);
  assert.equal(level(s, "tailL", 3.5), 1);
});

test("RGB colors land on the right channels", () => {
  const s = new Show(profile, analysis);
  s.color("screen", 0, 1, [255, 0, 128]);
  const seq = s.toSequence();
  assert.deepEqual([176, 177, 178].map((c) => getValue(seq, 10, c)), [255, 0, 128]);
});

test("an empty show still validates", () => {
  assert.ok(validate(new Show(profile, analysis).toSequence()).ok);
});

test("unknown light ids fail loudly", () => {
  assert.throws(() => new Show(profile, analysis).on("fogL", 0, 1), /Unknown light/);
});

test("critique flags one end of the car going dark while music plays", async () => {
  const { critique } = await import("../src/index.ts");
  const loud: Analysis = { ...analysis, energy: Array(200).fill(0.5) };
  const s = new Show(profile, loud);
  s.strobe("brake", 0, 10, 500, 200); // rear busy, front dark the whole time
  const c = critique(simulate(s.toSequence(), profile), profile, loud, s.stepMs);
  assert.ok(c.darkViews.some((d) => d.view === "front"));
  assert.ok(!c.darkViews.some((d) => d.view === "rear"));
});

test("a theme replaces the script's interior palette and the critique checks it", async () => {
  const { critique } = await import("../src/index.ts");
  const defaults = { calm: [0, 0, 255], rise: [0, 0, 255], pulse: [0, 0, 255], alt: [0, 0, 255], flash: [0, 0, 255], accent: [0, 0, 255], mellow: [0, 0, 255], cool: [0, 0, 255], cycle: [[0, 0, 255]], glow: [0, 0, 255] } as const;
  const red: [number, number, number] = [255, 0, 0];
  const themed = new Show(profile, analysis, 10, [red, [255, 255, 255]]);
  assert.deepEqual(themed.palette(defaults as never).pulse, red);
  assert.deepEqual(new Show(profile, analysis).palette(defaults as never).pulse, [0, 0, 255]);

  const s = new Show(profile, analysis, 10, [red, [255, 255, 255]]);
  s.color("screen", 0, 5, [0, 0, 255]); // blue is off a red/white theme
  s.color("screen", 5, 10, [255, 128, 128]); // a red-white blend is on it
  const c = critique(simulate(s.toSequence(), profile), profile, analysis, s.stepMs, [red, [255, 255, 255]]);
  assert.ok(c.offTheme! > 0.4 && c.offTheme! < 0.6, `offTheme ${c.offTheme}`);
});

test("closure simulation follows Tesla's command rules", async () => {
  const { simulateClosures } = await import("../src/index.ts");
  const { CLOSURE } = await import("@lightshow/core");
  const s = new Show(profile, analysis);
  s.closure(35, 1, "close"); // fold the left mirror (2 s)
  s.closure(46, 1, "open"); // charge port open (2 s)
  s.closure(46, 4, "dance", 6);
  s.closure(37, 1, "dance", 3); // windows dance from closed
  const sim = Object.fromEntries(simulateClosures(s.toSequence(), profile).map((c) => [c.id, c]));
  const at = (id: string, t: number) => sim[id].position[s.frame(t)];
  assert.equal(at("mirrorL", 0.5), 1, "mirrors start unfolded");
  assert.ok(at("mirrorL", 2) > 0.4 && at("mirrorL", 2) < 0.6, "halfway through a 2 s fold");
  assert.equal(at("mirrorL", 3.5), 0, "fold completes after the command returns to idle");
  assert.equal(at("chargePort", 3.5), 1);
  assert.equal(sim.chargePort.dancing[s.frame(5)], 1);
  assert.equal(sim.windowLF.dancing[s.frame(2)], 1);
  assert.equal(CLOSURE.dance, 127);
});

test("a lowered window dances around where it is instead of snapping shut", async () => {
  const { simulateClosures } = await import("../src/index.ts");
  const s = new Show(profile, analysis);
  s.closure(37, 0.2, "open"); // fully down by ~4.2 s
  s.closure(37, 5, "dance", 7);
  const w = simulateClosures(s.toSequence(), profile).find((c) => c.id === "windowLF")!;
  const during = Array.from(w.position.slice(s.frame(5), s.frame(7)));
  assert.ok(Math.min(...during) > 0.6, `stays mostly open while dancing (min ${Math.min(...during).toFixed(2)})`);
  assert.ok(Math.max(...during) - Math.min(...during) > 0.2, "but visibly moves");
});

test("RGB moves take a color instead of always writing white", () => {
  const s = new Show(profile, analysis);
  s.flash("screen", 1, 200, [255, 180, 0]).hit("accentFront", 2, 100, 400, [0, 200, 255]);
  const seq = s.toSequence();
  assert.deepEqual([176, 177, 178].map((c) => getValue(seq, s.frame(1.05), c)), [255, 180, 0]);
  assert.deepEqual([185, 186, 187].map((c) => getValue(seq, s.frame(2.02), c)), [0, 200, 255]);
});

test("accelerate speeds up and keeps flashes distinct", () => {
  const s = new Show(profile, analysis);
  const times = s.accelerate([["outerL"], ["brake"]], 1, 3, { startMs: 300, minMs: 60 });
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  assert.ok(gaps[0] > gaps[gaps.length - 1] * 2, "gets faster");
  const lv = simulate(s.toSequence(), profile).find((x) => x.id === "outerL")!.level;
  let flashes = 0;
  for (let f = s.frame(1); f < s.frame(3); f++) if (lv[f] > 0.5 && lv[f - 1] <= 0.5) flashes++;
  assert.equal(flashes, Math.ceil(times.length / 2), "every outer-beam flash is separate");
});

test("sweep bounces along an ordered list", () => {
  const s = new Show(profile, analysis);
  const order = ["tailL", "brake", "tailR"];
  s.sweep(order, [1, 1.5, 2, 2.5, 3], { onMs: 100 });
  const sim = simulate(s.toSequence(), profile);
  const lit = (t: number) => order.filter((id) => sim.find((x) => x.id === id)!.level[s.frame(t + 0.02)] > 0.5);
  assert.deepEqual([1, 1.5, 2, 2.5, 3].map((t) => lit(t)[0]), ["tailL", "brake", "tailR", "brake", "tailL"]);
});

test("repeated window dances don't drift the glass up", async () => {
  const { simulateClosures } = await import("../src/index.ts");
  const s = new Show(profile, analysis, 30);
  s.closure(37, 0.1, "open");
  s.closure(37, 5, "dance", 6.3);
  s.closure(37, 8, "dance", 9.7);
  s.closure(37, 12, "dance", 13.1);
  const w = simulateClosures(s.toSequence(), profile).find((c) => c.id === "windowLF")!;
  const after = Array.from(w.position.slice(s.frame(5), s.frame(20)));
  assert.ok(Math.min(...after) >= 0.64, `stays at least ~2/3 open (min ${Math.min(...after).toFixed(2)})`);
});
