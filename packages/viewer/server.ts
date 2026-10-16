// Local review server: serves the viewer, a compiled show, and its notes.
//
//   GET  /                         home: every show, grouped by car
//   GET  /view.html?show=<slug>    the viewer for one show
//   GET  /api/shows                show list with status
//   GET  /show/<slug>/<file>       files from workspace/<slug>/build
//   GET  /api/notes?show=<slug>    review notes
//   POST /api/notes?show=<slug>    add a note { t0, t1, lights, text }
//   DELETE /api/notes?show=<slug>&id=<id>
//   POST /api/compile?show=<slug>  recompile shows/<slug> and reload
//
// Notes live in workspace/<slug>/notes.json, where an agent reads them.
// Usage: node packages/viewer/server.ts [slug] [port]

import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "../show/src/compile.ts";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const defaultShow = process.argv[2] ?? "grief";
const port = Number(process.argv[3] ?? process.env.PORT ?? 4173);
const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".png": "image/png", ".jpg": "image/jpeg" };

interface Note { id: string; t0: number; t1: number; lights: string[]; text: string; created: string }

/** Every show in shows/, with its car and whether it has been built and reviewed. */
function listShows() {
  const dir = join(root, "shows");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((slug) => slugOk(slug) && existsSync(join(dir, slug, "show.json"))).map((slug) => {
    const config = JSON.parse(readFileSync(join(dir, slug, "show.json"), "utf8"));
    const profile = existsSync(join(root, config.profile)) ? JSON.parse(readFileSync(join(root, config.profile), "utf8")) : null;
    const viewer = join(root, "workspace", slug, "build", "viewer.json");
    const built = existsSync(viewer);
    const analysisPath = join(root, config.analysis ?? "");
    const duration = config.analysis && existsSync(analysisPath) ? JSON.parse(readFileSync(analysisPath, "utf8")).duration : null;
    return {
      slug, title: config.title, artist: config.artist ?? null, theme: config.theme?.colors ?? null,
      car: profile ? `${profile.modelYear} ${profile.car}` : config.profile, profile: config.profile,
      built, builtAt: built ? statSync(viewer).mtime.toISOString() : null, duration,
      notes: readNotes(slug).length, hasPlan: existsSync(join(dir, slug, "PLAN.md")), imported: !!config.fseq,
    };
  });
}

const slugOk = (s: string) => /^[a-z0-9-]+$/.test(s);
const notesPath = (slug: string) => join(root, "workspace", slug, "notes.json");
const readNotes = (slug: string): Note[] => (existsSync(notesPath(slug)) ? JSON.parse(readFileSync(notesPath(slug), "utf8")) : []);
const body = (req: import("node:http").IncomingMessage) =>
  new Promise<string>((ok, fail) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b)); req.on("error", fail); });

function sendFile(res: import("node:http").ServerResponse, path: string, req: import("node:http").IncomingMessage) {
  if (!existsSync(path) || !statSync(path).isFile()) { res.writeHead(404).end("Not found"); return; }
  const size = statSync(path).size;
  const type = types[extname(path)] ?? "application/octet-stream";
  // Range support so the browser can seek in the audio.
  const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  if (range) {
    const start = Number(range[1]), end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
    res.end(readFileSync(path).subarray(start, end + 1));
    return;
  }
  res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
  res.end(readFileSync(path));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const slug = url.searchParams.get("show") ?? defaultShow;
    if (!slugOk(slug)) { res.writeHead(400).end("Bad show name"); return; }

    if (url.pathname === "/api/shows") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(listShows()));
      return;
    }
    // three.js, served from node_modules so the viewer works offline.
    if (url.pathname.startsWith("/vendor/three/")) {
      const base = join(root, "node_modules", "three");
      const file = normalize(join(base, decodeURIComponent(url.pathname.slice("/vendor/three/".length))));
      if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
      sendFile(res, file, req);
      return;
    }
    // Car models live in workspace/models (they are not committed; see profiles/README.md).
    if (url.pathname.startsWith("/model/")) {
      const base = join(root, "workspace", "models");
      const file = normalize(join(root, decodeURIComponent(url.pathname.slice("/model/".length))));
      if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
      if (req.method === "HEAD") { res.writeHead(existsSync(file) ? 200 : 404).end(); return; }
      sendFile(res, file, req);
      return;
    }
    if (url.pathname === "/api/notes") {
      if (req.method === "GET") { res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(readNotes(slug))); return; }
      if (req.method === "POST") {
        const n = JSON.parse(await body(req)) as Partial<Note>;
        if (typeof n.t0 !== "number" || typeof n.text !== "string" || !n.text.trim()) { res.writeHead(400).end("Note needs t0 and text"); return; }
        const note: Note = { id: Date.now().toString(36), t0: n.t0, t1: typeof n.t1 === "number" ? n.t1 : n.t0, lights: Array.isArray(n.lights) ? n.lights.map(String) : [], text: n.text.trim(), created: new Date().toISOString() };
        const notes = [...readNotes(slug), note].sort((a, b) => a.t0 - b.t0);
        writeFileSync(notesPath(slug), JSON.stringify(notes, null, 2) + "\n");
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(note));
        return;
      }
      if (req.method === "DELETE") {
        const id = url.searchParams.get("id");
        writeFileSync(notesPath(slug), JSON.stringify(readNotes(slug).filter((n) => n.id !== id), null, 2) + "\n");
        res.writeHead(204).end();
        return;
      }
    }
    if (url.pathname === "/api/compile" && req.method === "POST") {
      const r = await compile(join("shows", slug), root);
      res.writeHead(r.ok ? 200 : 500, { "Content-Type": "text/plain" }).end(r.text);
      return;
    }
    if (url.pathname.startsWith("/show/")) {
      const [, , s, ...rest] = url.pathname.split("/");
      if (!slugOk(s)) { res.writeHead(400).end(); return; }
      const dir = join(root, "workspace", s, "build");
      const file = normalize(join(dir, decodeURIComponent(rest.join("/"))));
      if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
      // Serve viewer.json with the car profile as it is on disk now, so viewer and
      // profile improvements show up without recompiling every show.
      if (rest.join("/") === "viewer.json" && existsSync(file)) {
        const viewer = JSON.parse(readFileSync(file, "utf8"));
        const config = JSON.parse(readFileSync(join(root, "shows", s, "show.json"), "utf8"));
        const profilePath = join(root, config.profile);
        if (existsSync(profilePath)) viewer.profile = JSON.parse(readFileSync(profilePath, "utf8"));
        res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(viewer));
        return;
      }
      sendFile(res, file, req);
      return;
    }
    const pub = join(root, "packages", "viewer", "public");
    const file = normalize(join(pub, url.pathname === "/" ? "index.html" : url.pathname));
    if (!file.startsWith(pub)) { res.writeHead(403).end(); return; }
    sendFile(res, file, req);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end(String(e instanceof Error ? e.stack : e));
  }
}).listen(port, "127.0.0.1", () => console.log(`Viewer: http://localhost:${port}/`));
