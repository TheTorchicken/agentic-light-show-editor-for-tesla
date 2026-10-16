import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANNELS, frameCount, getValue, validate } from "@lightshow/core";
import { renderSequence } from "../src/build.ts";
import { PROBES } from "../src/probes.ts";

for (const probe of PROBES) {
  const { seq, manifest } = renderSequence(probe);
  const frames = frameCount(seq);
  const step = manifest.stepMs;

  test(`${probe.fileName} passes validation`, () => {
    assert.deepEqual(validate(seq).errors, []);
  });

  test(`${probe.fileName} lights only the channels each action declares`, () => {
    // Frames a channel may be non-zero in: its actions' windows, plus the sync flashes.
    const allowed = new Map<number, Array<[number, number]>>();
    const allow = (c: number, start: number, end: number) => {
      if (!allowed.has(c)) allowed.set(c, []);
      allowed.get(c)!.push([start / step, Math.ceil(end / step)]);
    };
    for (const t of manifest.tests) for (const a of t.actions) for (const c of a.channels) allow(c, a.startMs, a.endMs);
    for (const at of manifest.syncFlashesMs) for (const c of probe.syncChannels) allow(c, at, at + 150);

    for (let f = 0; f < frames; f++) {
      for (let c = 1; c <= seq.channelCount; c++) {
        if (!getValue(seq, f, c)) continue;
        const ok = (allowed.get(c) ?? []).some(([s, e]) => f >= s && f < e);
        assert.ok(ok, `ch ${c} is ${getValue(seq, f, c)} at ${f * step} ms outside any action that declares it`);
      }
    }
  });

  test(`${probe.fileName} only commands closures if it is the closure probe`, () => {
    if (probe.slug === "closures") return;
    const closureChannels = CHANNELS.filter((i) => i.kind === "closure" || i.kind === "mechanical").map((i) => i.channel);
    for (let f = 0; f < frames; f++) for (const c of closureChannels) assert.equal(getValue(seq, f, c), 0, `ch ${c} at frame ${f}`);
  });
}
