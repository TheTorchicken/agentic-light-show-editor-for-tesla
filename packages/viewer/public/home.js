// Home: every show in the repo, grouped by car. Built shows open in the viewer.

const fmtDur = (s) => (s == null ? "" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

const shows = await (await fetch("/api/shows", { cache: "no-store" })).json();
const byCar = Map.groupBy ? Map.groupBy(shows, (s) => s.car) : shows.reduce((m, s) => m.set(s.car, [...(m.get(s.car) ?? []), s]), new Map());
const root = document.getElementById("cars");
root.replaceChildren();

if (!shows.length) root.innerHTML = '<p class="muted">No shows yet. Create one in <code>shows/&lt;slug&gt;/</code> (see AGENTS.md).</p>';

for (const [car, list] of [...byCar].sort()) {
  const section = document.createElement("section");
  section.className = "car";
  section.innerHTML = `<h2></h2><div class="grid"></div>`;
  section.querySelector("h2").textContent = car;
  const grid = section.querySelector(".grid");
  for (const s of list.sort((a, b) => a.title.localeCompare(b.title))) {
    const card = document.createElement(s.built ? "a" : "div");
    card.className = `card${s.built ? "" : " unbuilt"}`;
    if (s.built) card.href = `/view.html?show=${encodeURIComponent(s.slug)}`;
    card.innerHTML = `<div><div class="name"></div><div class="artist"></div></div><div class="swatches"></div><div class="meta"></div>`;
    card.querySelector(".name").textContent = s.title;
    card.querySelector(".artist").textContent = s.artist ?? "";
    const sw = card.querySelector(".swatches");
    if (s.theme) for (const c of s.theme) sw.append(Object.assign(document.createElement("span"), { style: `background:${c}` }));
    else sw.remove();
    const meta = card.querySelector(".meta");
    const tag = (text, cls = "") => meta.append(Object.assign(document.createElement("span"), { className: `tag ${cls}`, textContent: text }));
    if (s.imported) tag("imported", "notes");
    if (s.duration) tag(fmtDur(s.duration));
    if (s.built) tag(`built ${ago(s.builtAt)}`); else meta.append(Object.assign(document.createElement("code"), { textContent: `npm run show shows/${s.slug}` }));
    if (s.notes) tag(`${s.notes} note${s.notes > 1 ? "s" : ""}`, "notes");
    grid.append(card);
  }
  root.append(section);
}
