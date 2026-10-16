import { test } from "node:test";
import assert from "node:assert/strict";
import { CLOSURE, createSequence, getValue, readFseq, setValue, validate, writeFseq } from "../src/index.ts";

test("round-trips channel data and metadata", () => {
  const s = createSequence(200, 20, 1000);
  s.meta = { mf: "probe.wav", sp: "agentic-light-show-editor-for-tesla" };
  setValue(s, 0, 1, 255);
  setValue(s, 49, 200, 128);
  const back = readFseq(writeFseq(s));
  assert.equal(back.channelCount, 200);
  assert.equal(back.stepMs, 20);
  assert.equal(back.data.length, 50 * 200);
  assert.equal(getValue(back, 0, 1), 255);
  assert.equal(getValue(back, 49, 200), 128);
  assert.deepEqual(back.meta, s.meta);
});

test("header matches what Tesla's validator checks", () => {
  const bytes = writeFseq(createSequence(200, 20, 200));
  const dv = new DataView(bytes.buffer);
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 4)), "PSEQ");
  assert.ok(dv.getUint16(4, true) >= 24);
  assert.equal(dv.getUint8(6), 0);
  assert.equal(dv.getUint8(7), 2);
  assert.equal(dv.getUint32(10, true), 200);
  assert.equal(dv.getUint32(14, true), 10);
  assert.equal(dv.getUint8(18), 20);
  assert.equal(dv.getUint8(20), 0);
});

test("validator counts closure commands on changes, not frames", () => {
  const s = createSequence(200, 20, 10_000);
  for (let f = 0; f < 50; f++) setValue(s, f, 46, CLOSURE.open); // one held command
  for (let f = 100; f < 150; f++) setValue(s, f, 46, CLOSURE.dance);
  for (let f = 200; f < 210; f++) setValue(s, f, 46, CLOSURE.close);
  const r = validate(s);
  assert.equal(r.closureCommands[46], 3);
  assert.ok(r.ok);
  for (let f = 300; f < 310; f++) setValue(s, f, 46, CLOSURE.open);
  assert.ok(!validate(s).ok, "a 4th charge port command exceeds the limit of 3");
});

test("rejects channel counts the car will not load", () => {
  assert.ok(!validate(createSequence(100, 20, 1000)).ok);
});
