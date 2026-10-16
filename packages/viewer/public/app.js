// Show viewer: plays the song, renders what the car will do (from the simulated
// light levels in viewer.json), and records review notes on moments and lights.

import { Car3D } from "./car3d.js";

const params = new URLSearchParams(location.search);
const slug = params.get("show") ?? "grief";
const $ = (id) => document.getElementById(id);
const audio = $("audio");

let data, frames, stepS, lights, lightById, closures = [], notes = [], peaks = null;
const selected = new Set();
let range = null; // [t0, t1]
let car3d = null;
let mode = (() => { try { return localStorage.getItem("viewMode") ?? "3d"; } catch { return "3d"; } })();
const LANE_WINDOW = 12; // seconds visible in the lane view

// ---------------------------------------------------------------- loading

async function load() {
  data = await (await fetch(`/show/${slug}/viewer.json`, { cache: "no-store" })).json();
  stepS = data.stepMs / 1000;
  frames = data.frames;
  const decode = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  lights = data.profile.lights.map((l) => {
    const sim = data.lights.find((s) => s.id === l.id);
    return { ...l, level: decode(sim.level), rgb: sim.rgb?.map(decode) };
  });
  lightById = new Map(lights.map((l) => [l.id, l]));
  closures = (data.closures ?? []).map((c) => ({ id: c.id, position: decode(c.position), dancing: decode(c.dancing) }));
  $("title").textContent = data.title;
  $("carName").textContent = `${data.profile.modelYear} ${data.profile.car}`;
  document.title = `${data.title} · Show Viewer`;
  if (!audio.src.endsWith(data.audio)) audio.src = `/show/${slug}/${data.audio}`;
  await loadNotes();
  drawLanesBase();
  if (!car3d) {
    try { car3d = new Car3D($("car3d"), data.profile, (msg) => ($("modelStatus").textContent = msg)); setEnv(envName); }
    catch (e) { console.error(e); setMode("2d"); $("modelStatus").textContent = "3D view unavailable in this browser."; }
  }
  loadPeaks();
}

async function loadPeaks() {
  try {
    const buf = await (await fetch(`/show/${slug}/${data.audio}`)).arrayBuffer();
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const audioBuf = await ctx.decodeAudioData(buf);
    const ch = audioBuf.getChannelData(0);
    const n = 2000, per = Math.floor(ch.length / n);
    peaks = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = 0; for (let j = i * per; j < (i + 1) * per; j += 16) m = Math.max(m, Math.abs(ch[j])); peaks[i] = m; }
  } catch { peaks = null; }
}

async function loadNotes() {
  notes = await (await fetch(`/api/notes?show=${slug}`)).json();
  renderNotes();
}

// ---------------------------------------------------------------- helpers

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
const frameAt = (t) => Math.max(0, Math.min(frames - 1, Math.floor(t / stepS)));
const duration = () => frames * stepS;

function fit(canvas) {
  const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

function lightColor(l, f) {
  if (l.rgb) return [l.rgb[0][f], l.rgb[1][f], l.rgb[2][f]];
  const hex = l.color ?? "#ffffff";
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// ---------------------------------------------------------------- car stage

// Each view occupies a box on the stage canvas. Shapes use 0-1 coordinates in
// a box twice as wide as tall.
function viewBoxes(w) {
  const bw = w / 2 - 24, bh = bw / 2;
  return {
    front: { x: 12, y: 30, w: bw, h: bh, label: "FRONT", sub: "car's right is on the left" },
    rear: { x: w / 2 + 12, y: 30, w: bw, h: bh, label: "REAR", sub: "car's left is on the left" },
    interior: { x: w / 4 + 12, y: 30 + bh + 44, w: bw, h: bh, label: "INTERIOR", sub: "seen from above, front at top" },
  };
}

const toPx = (box, [x, y]) => [box.x + x * box.w, box.y + (y / (box.label === "INTERIOR" ? 1 : 0.5)) * box.h];
let hitTargets = [];

function drawCar() {
  const canvas = $("car");
  const { ctx, w, h } = fit(canvas);
  ctx.clearRect(0, 0, w, h);
  const f = frameAt(audio.currentTime);
  const boxes = viewBoxes(w);
  hitTargets = [];

  for (const [name, box] of Object.entries(boxes)) {
    ctx.font = "600 11px -apple-system, system-ui"; ctx.fillStyle = "#8a8f9c"; ctx.fillText(box.label, box.x, box.y - 12);
    const lw = ctx.measureText(box.label).width;
    ctx.font = "11px -apple-system, system-ui"; ctx.fillStyle = "#4d525e"; ctx.fillText(box.sub, box.x + lw + 8, box.y - 12);
    const outline = data.profile.views[name]?.outline;
    if (outline) {
      ctx.beginPath(); outline.forEach((p, i) => { const [x, y] = toPx(box, p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = "#2a2e37"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#0f1115"; ctx.fill();
    }
  }

  // Draw dim lights first, then lit ones on top with glow.
  const order = [...lights].sort((a, b) => a.level[f] - b.level[f]);
  for (const l of order) {
    const level = l.level[f] / 255;
    const [r, g, b] = lightColor(l, f);
    for (const s of l.shapes) {
      const box = boxes[s.view];
      if (!box) continue;
      const scale = box.w;
      ctx.save();
      const lit = level > 0.02;
      const col = lit ? `rgba(${r},${g},${b},${0.25 + 0.75 * level})` : "#2b2f38";
      ctx.shadowColor = lit ? `rgba(${r},${g},${b},${level})` : "transparent";
      ctx.shadowBlur = lit ? 8 + 30 * level : 0;
      ctx.strokeStyle = ctx.fillStyle = col;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (s.dot) {
        const [x, y] = toPx(box, s.dot);
        ctx.beginPath(); ctx.arc(x, y, s.r * scale, 0, Math.PI * 2); ctx.fill();
        hitTargets.push({ id: l.id, x, y, r: Math.max(10, s.r * scale + 4) });
      } else if (s.strip) {
        ctx.lineWidth = Math.max(2, s.w * scale);
        ctx.beginPath(); s.strip.forEach((p, i) => { const [x, y] = toPx(box, p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
        // Clickable along the whole strip, not just at its corners.
        for (let i = 0; i < s.strip.length - 1; i++) {
          const [ax, ay] = toPx(box, s.strip[i]), [bx, by] = toPx(box, s.strip[i + 1]);
          const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 10));
          for (let k = 0; k <= n; k++) hitTargets.push({ id: l.id, x: ax + ((bx - ax) * k) / n, y: ay + ((by - ay) * k) / n, r: 9 });
        }
      } else if (s.rect) {
        const [x, y] = toPx(box, [s.rect[0], s.rect[1]]);
        const [x2, y2] = toPx(box, [s.rect[0] + s.rect[2], s.rect[1] + s.rect[3]]);
        ctx.fillRect(x, y, x2 - x, y2 - y);
        hitTargets.push({ id: l.id, x: (x + x2) / 2, y: (y + y2) / 2, r: Math.max(14, (x2 - x) / 2) });
      }
      ctx.restore();
      if (selected.has(l.id)) {
        ctx.save(); ctx.strokeStyle = "#4cc3ff"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        if (s.strip) {
          ctx.lineWidth = Math.max(2, s.w * scale) + 8; ctx.globalAlpha = 0.5; ctx.lineCap = "round";
          ctx.beginPath(); s.strip.forEach((p, i) => { const [x, y] = toPx(box, p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
        } else {
          const t = hitTargets[hitTargets.length - 1];
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
}

$("car").addEventListener("click", (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bestD = Infinity;
  for (const t of hitTargets) { const d = Math.hypot(t.x - x, t.y - y); if (d < t.r && d < bestD) { best = t; bestD = d; } }
  if (!best) return;
  selected.has(best.id) ? selected.delete(best.id) : selected.add(best.id);
  renderSelection();
});

// ---------------------------------------------------------------- timeline

let lanesBase = null; // offscreen full-song lane image
const LANE_LABEL = 110;

/** Timeline rows: every light, then every closure that moves in this show. */
const laneRows = () => [...lights, ...closures.filter((c) => c.position.some((v, i) => i && v !== c.position[i - 1]))];

function drawLanesBase() {
  const all = laneRows(), rows = all.length;
  const c = document.createElement("canvas");
  c.width = frames; c.height = rows;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(frames, rows);
  all.forEach((l, row) => {
    for (let f = 0; f < frames; f++) {
      const i = (row * frames + f) * 4;
      if (l.position) { // closure: gray = how open, violet while dancing
        const k = l.position[f] / 255 * 0.8;
        const dance = l.dancing[f];
        img.data[i] = dance ? 170 : 200 * k; img.data[i + 1] = dance ? 90 : 200 * k; img.data[i + 2] = dance ? 255 : 210 * k; img.data[i + 3] = 255;
        continue;
      }
      const [r, g, b] = lightColor(l, f), k = l.level[f] / 255;
      img.data[i] = r * k; img.data[i + 1] = g * k; img.data[i + 2] = b * k; img.data[i + 3] = 255;
    }
  });
  ctx.putImageData(img, 0, 0);
  lanesBase = c;
}

function drawOverview() {
  const { ctx, w, h } = fit($("overview"));
  ctx.fillStyle = "#07080a"; ctx.fillRect(0, 0, w, h);
  const D = duration(), x = (t) => (t / D) * w;
  if (lanesBase) { ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 0.55; ctx.drawImage(lanesBase, 0, 0, frames, lanesBase.height, 0, 0, w, h); ctx.globalAlpha = 1; }
  if (peaks) {
    ctx.fillStyle = "rgba(220,225,235,0.55)";
    for (let i = 0; i < peaks.length; i++) { const ph = peaks[i] * h * 0.9; ctx.fillRect((i / peaks.length) * w, h / 2 - ph / 2, Math.max(1, w / peaks.length), ph); }
  }
  ctx.strokeStyle = "rgba(255,178,56,0.7)"; ctx.lineWidth = 1;
  for (const s of data.analysis.sections) { ctx.beginPath(); ctx.moveTo(x(s.start), 0); ctx.lineTo(x(s.start), h); ctx.stroke(); }
  for (const n of notes) { ctx.fillStyle = "#4cc3ff"; ctx.fillRect(x(n.t0), 0, Math.max(3, x(n.t1) - x(n.t0)), 5); }
  if (range) { ctx.fillStyle = "rgba(76,195,255,0.2)"; ctx.fillRect(x(range[0]), 0, x(range[1]) - x(range[0]), h); }
  ctx.fillStyle = "#fff"; ctx.fillRect(x(audio.currentTime) - 1, 0, 2, h);
}

function laneWindow() {
  const t = audio.currentTime, D = duration();
  const t0 = Math.max(0, Math.min(D - LANE_WINDOW, t - LANE_WINDOW / 3));
  return [t0, t0 + LANE_WINDOW];
}

function drawLanes() {
  const { ctx, w, h } = fit($("lanes"));
  ctx.fillStyle = "#07080a"; ctx.fillRect(0, 0, w, h);
  const [t0, t1] = laneWindow();
  const rows = laneRows();
  const rowH = h / rows.length, gx = (t) => LANE_LABEL + ((t - t0) / (t1 - t0)) * (w - LANE_LABEL);
  if (lanesBase) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lanesBase, t0 / stepS, 0, (t1 - t0) / stepS, rows.length, LANE_LABEL, 0, w - LANE_LABEL, h);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  for (const b of data.analysis.beats) if (b >= t0 && b <= t1) { ctx.beginPath(); ctx.moveTo(gx(b), 0); ctx.lineTo(gx(b), h); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  for (const b of data.analysis.downbeats) if (b >= t0 && b <= t1) { ctx.beginPath(); ctx.moveTo(gx(b), 0); ctx.lineTo(gx(b), h); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,178,56,0.8)";
  for (const s of data.analysis.sections) if (s.start >= t0 && s.start <= t1) { ctx.beginPath(); ctx.moveTo(gx(s.start), 0); ctx.lineTo(gx(s.start), h); ctx.stroke(); }
  for (const n of notes) {
    if (n.t1 < t0 || n.t0 > t1) continue;
    const rows = n.lights.length ? n.lights.map((id) => lights.findIndex((l) => l.id === id)) : lights.map((_, i) => i);
    ctx.fillStyle = "rgba(76,195,255,0.25)";
    for (const r of rows) if (r >= 0) ctx.fillRect(gx(n.t0), r * rowH, Math.max(4, gx(n.t1) - gx(n.t0)), rowH);
  }
  if (range) { ctx.fillStyle = "rgba(76,195,255,0.18)"; ctx.fillRect(gx(range[0]), 0, gx(range[1]) - gx(range[0]), h); }
  ctx.fillStyle = "#0b0c0f"; ctx.fillRect(0, 0, LANE_LABEL, h);
  ctx.font = `${Math.min(12, rowH - 2)}px -apple-system, system-ui`; ctx.textBaseline = "middle";
  rows.forEach((l, i) => {
    ctx.fillStyle = l.position ? "#b9a3ff" : selected.has(l.id) ? "#4cc3ff" : "#8a8f9c";
    ctx.fillText(l.id, 6, i * rowH + rowH / 2);
    ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(LANE_LABEL, (i + 1) * rowH - 0.5, w, 0.5);
  });
  ctx.fillStyle = "#fff"; ctx.fillRect(gx(audio.currentTime) - 1, 0, 2, h);
}

// Click to seek, shift-drag to select a range. Clicking a lane label selects that light.
function timelineInput(canvas, toTime) {
  let dragStart = null;
  canvas.addEventListener("mousedown", (e) => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (canvas.id === "lanes" && x < LANE_LABEL) {
      const row = laneRows()[Math.floor((y / r.height) * laneRows().length)];
      const id = row && !row.position ? row.id : null;
      if (id) { selected.has(id) ? selected.delete(id) : selected.add(id); renderSelection(); }
      return;
    }
    const t = toTime(x, r.width);
    if (e.shiftKey) { dragStart = t; range = [t, t]; } else { audio.currentTime = t; range = null; renderRange(); }
  });
  window.addEventListener("mousemove", (e) => {
    if (dragStart === null) return;
    const r = canvas.getBoundingClientRect(), t = toTime(e.clientX - r.left, r.width);
    range = [Math.min(dragStart, t), Math.max(dragStart, t)]; renderRange();
  });
  window.addEventListener("mouseup", () => { if (dragStart !== null) { dragStart = null; if (range && range[1] - range[0] < 0.05) range = null; renderRange(); } });
}
timelineInput($("overview"), (x, w) => Math.max(0, Math.min(duration(), (x / w) * duration())));
timelineInput($("lanes"), (x, w) => { const [t0, t1] = laneWindow(); return t0 + ((x - LANE_LABEL) / (w - LANE_LABEL)) * (t1 - t0); });

// ---------------------------------------------------------------- notes

function renderSelection() {
  const el = $("selection");
  el.replaceChildren(...[...selected].map((id) => Object.assign(document.createElement("span"), { className: "chip", textContent: id })));
  if (!selected.size) el.textContent = "No lights selected (note applies to the whole car)";
}
function renderRange() {
  $("range").textContent = range ? `Range ${fmt(range[0])} – ${fmt(range[1])}` : `At ${fmt(audio.currentTime)} (shift-drag the timeline for a range)`;
}
function renderNotes() {
  $("noteCount").textContent = notes.length ? `(${notes.length})` : "";
  $("notes").replaceChildren(...notes.map((n) => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="del" title="Delete note">×</button><div class="when mono"></div><div class="text"></div><div class="lights"></div>`;
    li.querySelector(".when").textContent = n.t1 > n.t0 ? `${fmt(n.t0)} – ${fmt(n.t1)}` : fmt(n.t0);
    li.querySelector(".text").textContent = n.text;
    li.querySelector(".lights").textContent = n.lights.length ? n.lights.join(", ") : "whole car";
    li.addEventListener("click", () => { audio.currentTime = Math.max(0, n.t0 - 1); selected.clear(); n.lights.forEach((id) => selected.add(id)); renderSelection(); });
    li.querySelector(".del").addEventListener("click", async (e) => {
      e.stopPropagation();
      await fetch(`/api/notes?show=${slug}&id=${n.id}`, { method: "DELETE" });
      await loadNotes();
    });
    return li;
  }));
}
async function addNote() {
  const text = $("noteText").value.trim();
  if (!text) { $("noteText").focus(); return; }
  const [t0, t1] = range ?? [audio.currentTime, audio.currentTime];
  await fetch(`/api/notes?show=${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), lights: [...selected], text }) });
  $("noteText").value = "";
  await loadNotes();
}
$("addNote").addEventListener("click", addNote);
$("noteText").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); });

// ---------------------------------------------------------------- transport

const togglePlay = () => (audio.paused ? audio.play() : audio.pause());
$("play").addEventListener("click", togglePlay);
audio.addEventListener("play", () => ($("play").textContent = "❚❚"));
audio.addEventListener("pause", () => ($("play").textContent = "▶"));
$("speed").addEventListener("change", (e) => (audio.playbackRate = Number(e.target.value)));
$("recompile").addEventListener("click", async () => {
  const b = $("recompile"); b.textContent = "Compiling…"; b.disabled = true;
  const r = await fetch(`/api/compile?show=${slug}`, { method: "POST" });
  b.textContent = r.ok ? "Recompile" : "Compile failed"; b.disabled = false;
  if (r.ok) { const t = audio.currentTime; await load(); audio.currentTime = t; }
  else console.error(await r.text());
});
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLTextAreaElement) return;
  const beat = 60 / data.analysis.tempo;
  if (e.code === "Space") { e.preventDefault(); togglePlay(); }
  else if (e.key === "ArrowRight") audio.currentTime = Math.min(duration(), audio.currentTime + (e.shiftKey ? beat * 4 : beat));
  else if (e.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - (e.shiftKey ? beat * 4 : beat));
  else if (e.key === "n") { e.preventDefault(); $("noteText").focus(); }
  else if (e.key === "Escape") { selected.clear(); range = null; renderSelection(); renderRange(); }
});

// ---------------------------------------------------------------- 3D view

// Test moves: preview a closure on the 3D car, outside the show. Each runs a short
// open-hold-close cycle at Tesla's speeds; the show's own closure data is ignored meanwhile.
let testMove = null; // { kind, start }
const TEST_MOVES = {
  mirrors: { ids: ["mirrorL", "mirrorR"], openMs: 2000, holdMs: 1500, closeMs: 2000, invert: true },
  windows: { ids: ["windowLF", "windowLR", "windowRF", "windowRR"], openMs: 4000, holdMs: 1500, closeMs: 4000 },
  windowDance: { ids: ["windowLF", "windowLR", "windowRF", "windowRR"], dance: 6000 },
  trunk: { ids: ["trunk"], openMs: 14000, holdMs: 2000, closeMs: 4000 },
  chargePort: { ids: ["chargePort"], openMs: 2000, dance: 6000, closeMs: 2000 },
};
function testMoveState() {
  if (!testMove) return null;
  const m = TEST_MOVES[testMove.kind], t = performance.now() - testMove.start;
  let pos = 0, dancing = false;
  if (m.dance && !m.openMs) { // window dance from closed
    if (t > m.dance) { testMove = null; return null; }
    pos = 0.05 + 0.35 * (0.5 - 0.5 * Math.cos((t / 1100) * Math.PI)); dancing = true;
  } else {
    const hold = m.holdMs ?? m.dance;
    const total = m.openMs + hold + m.closeMs;
    if (t > total) { testMove = null; return null; }
    pos = t < m.openMs ? t / m.openMs : t < m.openMs + hold ? 1 : 1 - (t - m.openMs - hold) / m.closeMs;
    dancing = !!m.dance && t >= m.openMs && t < m.openMs + hold;
  }
  if (m.invert) pos = 1 - pos; // mirrors: "open" is unfolded
  return Object.fromEntries(m.ids.map((id) => [id, { pos, dancing }]));
}
$("testMove").addEventListener("change", (e) => {
  if (e.target.value) testMove = { kind: e.target.value, start: performance.now() };
  if (e.target.value === "trunk") car3d?.setView("rear-corner");
  e.target.value = "";
});

function draw3d() {
  const f = frameAt(audio.currentTime), levels = {}, rgb = {};
  for (const l of lights) {
    levels[l.id] = l.level[f] / 255;
    if (l.rgb) rgb[l.id] = [l.rgb[0][f], l.rgb[1][f], l.rgb[2][f]];
  }
  const moves = {};
  for (const c of closures) moves[c.id] = { pos: c.position[f] / 255, dancing: !!c.dancing[f] };
  Object.assign(moves, testMoveState() ?? {});
  car3d.render(levels, rgb, selected, moves);
}

function setMode(m) {
  mode = m;
  try { localStorage.setItem("viewMode", m); } catch {}
  $("car3d").hidden = m !== "3d";
  $("car").hidden = m !== "2d";
  document.querySelector(".cams").style.visibility = m === "3d" ? "visible" : "hidden";
  document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
}
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
document.querySelectorAll("[data-cam]").forEach((b) => b.addEventListener("click", () => car3d?.setView(b.dataset.cam)));
let envName = (() => { try { return localStorage.getItem("viewEnv") ?? "studio"; } catch { return "studio"; } })();
function setEnv(name) {
  envName = name;
  try { localStorage.setItem("viewEnv", name); } catch {}
  car3d?.setEnvironment(name);
  document.querySelectorAll("[data-env]").forEach((b) => b.classList.toggle("on", b.dataset.env === name));
}
document.querySelectorAll("[data-env]").forEach((b) => b.addEventListener("click", () => setEnv(b.dataset.env)));
setMode(mode);

// Click (not drag) on the 3D view selects the light under the pointer.
let downAt = null;
$("car3d").addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
$("car3d").addEventListener("pointerup", (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4 || !car3d) return;
  const r = e.currentTarget.getBoundingClientRect();
  const id = car3d.pick(e.clientX - r.left, e.clientY - r.top);
  if (id) { selected.has(id) ? selected.delete(id) : selected.add(id); renderSelection(); }
});

function tick() {
  if (data) {
    if (mode === "3d" && car3d) draw3d(); else drawCar();
    drawOverview(); drawLanes();
    $("clock").textContent = fmt(audio.currentTime);
    if (!range) renderRange();
  }
  requestAnimationFrame(tick);
}

await load();
renderSelection();
tick();

// Hooks for automated checks.
window.viewer = { car3d: () => car3d, render3d: () => draw3d(), seek: (t) => (audio.currentTime = t), state: () => ({ t: audio.currentTime, frame: frameAt(audio.currentTime), selected: [...selected], notes: notes.length }) };
