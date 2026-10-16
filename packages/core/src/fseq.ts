// FSEQ v2.0 uncompressed, the only format Tesla accepts. Layout follows xLights'
// fseq v2 spec: a 32-byte fixed header, variable headers, then frame-major channel
// data (frame 0 ch 1..N, frame 1 ch 1..N, ...).

export interface Sequence {
  channelCount: number;
  stepMs: number;
  /** frameCount * channelCount bytes, frame-major. */
  data: Uint8Array;
  /** Optional variable headers, e.g. { mf: "song.wav", sp: "agentic-light-show-editor-for-tesla" }. */
  meta?: Record<string, string>;
}

export const frameCount = (s: Sequence): number => s.data.length / s.channelCount;

export function createSequence(channelCount: number, stepMs: number, durationMs: number): Sequence {
  const frames = Math.ceil(durationMs / stepMs);
  return { channelCount, stepMs, data: new Uint8Array(frames * channelCount) };
}

export function setValue(s: Sequence, frame: number, channel: number, value: number): void {
  if (channel < 1 || channel > s.channelCount) throw new RangeError(`Channel ${channel} out of range`);
  s.data[frame * s.channelCount + channel - 1] = Math.max(0, Math.min(255, Math.round(value)));
}

export function getValue(s: Sequence, frame: number, channel: number): number {
  return s.data[frame * s.channelCount + channel - 1];
}

export function writeFseq(s: Sequence): Uint8Array {
  const enc = new TextEncoder();
  const vars = Object.entries(s.meta ?? {}).map(([code, text]) => {
    if (code.length !== 2) throw new Error(`Variable header code must be 2 chars: ${code}`);
    const body = enc.encode(text + "\0");
    const out = new Uint8Array(4 + body.length);
    new DataView(out.buffer).setUint16(0, out.length, true);
    out.set(enc.encode(code), 2);
    out.set(body, 4);
    return out;
  });
  const varLen = vars.reduce((n, v) => n + v.length, 0);
  // Channel data starts on a 4-byte boundary, as xLights writes it.
  const dataOffset = Math.ceil((32 + varLen) / 4) * 4;
  const frames = frameCount(s);
  if (!Number.isInteger(frames)) throw new Error("Data length is not a whole number of frames");

  const out = new Uint8Array(dataOffset + s.data.length);
  const dv = new DataView(out.buffer);
  out.set(enc.encode("PSEQ"), 0);
  dv.setUint16(4, dataOffset, true);
  dv.setUint8(6, 0); // minor
  dv.setUint8(7, 2); // major
  dv.setUint16(8, 32, true); // variable header offset
  dv.setUint32(10, s.channelCount, true);
  dv.setUint32(14, frames, true);
  dv.setUint8(18, s.stepMs);
  dv.setUint8(19, 0); // flags
  dv.setUint8(20, 0); // compression: none
  dv.setUint8(21, 0); // compression blocks
  dv.setUint8(22, 0); // sparse ranges
  dv.setUint8(23, 0);
  dv.setBigUint64(24, BigInt(Date.now()) * 1000n, true); // unique id
  let at = 32;
  for (const v of vars) { out.set(v, at); at += v.length; }
  out.set(s.data, dataOffset);
  return out;
}

export function readFseq(bytes: Uint8Array): Sequence {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = new TextDecoder().decode(bytes.subarray(0, 4));
  if (magic !== "PSEQ") throw new Error("Not an FSEQ file");
  if (dv.getUint8(7) !== 2) throw new Error(`Unsupported FSEQ major version ${dv.getUint8(7)}`);
  if (dv.getUint8(20) & 0x0f) throw new Error("Compressed FSEQ files are not supported");
  const dataOffset = dv.getUint16(4, true);
  const channelCount = dv.getUint32(10, true);
  const frames = dv.getUint32(14, true);
  const stepMs = dv.getUint8(18);
  const meta: Record<string, string> = {};
  for (let at = dv.getUint16(8, true); at + 4 <= dataOffset; ) {
    const len = dv.getUint16(at, true);
    if (len < 4) break;
    const code = new TextDecoder().decode(bytes.subarray(at + 2, at + 4));
    meta[code] = new TextDecoder().decode(bytes.subarray(at + 4, at + len)).replace(/\0+$/, "");
    at += len;
  }
  const data = bytes.slice(dataOffset, dataOffset + channelCount * frames);
  return { channelCount, stepMs, data, meta };
}
