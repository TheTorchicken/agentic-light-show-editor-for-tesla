# Agent guide

This repo builds Tesla light shows with an AI agent in the loop. Any agent can work
here; nothing depends on a specific one. Humans can do every step by hand too.

## Facts to respect

- A show is an FSEQ v2.0 uncompressed file with exactly 200 channels (48 is legal but
  cannot reach light bars or interior RGB), 20 ms frames, plus a 44.1 kHz WAV or MP3
  with the same base name. Channel map: `packages/core/src/channels.ts`.
- Most Model 3/Y lights are on/off with three ramp speeds (`RAMP` in channels.ts). A
  steady mid brightness is not possible on them. Interior RGB takes full color.
- Closures (mirrors, windows, charge port, trunk) have per-show command limits. The
  validator enforces them; the compiler warns if a show ends with anything open.
- Car capabilities that are not confirmed by a probe run are unverified. Say so.

## Working rules

- Run `npm test` and `npx tsc --noEmit` before calling work done.
- Never commit audio, car models or other creators' show files. `workspace/` and
  `reference-shows/` are gitignored for that reason.
- Keep everything usable without an agent: plain files, plain CLIs.

## Making a show

1. **Audio.** Put the song in `workspace/<slug>/` as a 44.1 kHz WAV:
   `ffmpeg -i in.mp3 -ar 44100 -ac 2 workspace/<slug>/<Name>.wav`.
2. **Stems.** `packages/audio/.venv/bin/python -m demucs -n htdemucs -d mps -o workspace/<slug>/stems <wav>`
   (`-d cpu` without Apple silicon).
3. **Analysis.** `packages/audio/.venv/bin/python packages/audio/analyze.py <wav> workspace/<slug>/analysis.json --stems workspace/<slug>/stems/htdemucs/<name>`.
   Check the reported tempo against the drums; the analyzer can be off by 2/3x or 2x.
4. **Route.** Read `skills/routing/SKILL.md` and run its `route.py`. Load the genre skill(s) it
   leads you to, plus `skills/design-fundamentals/SKILL.md` and `skills/vehicles/<car>.md`.
5. **Plan.** Write `shows/<slug>/PLAN.md`: the routing decision, sections (time, intensity,
   motif, light mapping, interior color) and a dance-moves table. Name a distinct motif for
   every section.
6. **Choreograph.** Write `shows/<slug>/show.json` and `show.ts` (see `docs/SHOWS.md`). If the
   owner gives the song a color theme, put it in show.json as
   `"theme": { "colors": ["#rrggbb", ...] }`; it applies to the interior only, through
   `s.palette(defaults)`.
7. **Compile and critique.** `npm run show shows/<slug>`. Fix every note and warning; the only
   acceptable note left is the correlation line.
8. **Review.** `npm run view` and open http://localhost:4173/. The human's notes land in
   `workspace/<slug>/notes.json` with times and light ids. Address every note, recompile, and
   say what changed for each.
9. **Deliver.** Copy `workspace/<slug>/build/<Title>.fseq` and `.wav` into `LightShow/` on the USB
   drive.

## Comparing with other shows

To review an existing `.fseq` (an older version, another tool's output) in the viewer, make
`shows/<slug>/show.json` with `"fseq": "workspace/<slug>/<file>.fseq"` and no `show.ts`. It
compiles, simulates and critiques like any show. Keep imported `.fseq` files in `workspace/`.

## Where things are

- Writing shows (vocabulary, show.json, critique): `docs/SHOWS.md`
- Car profiles and 3D models: `profiles/README.md`
- Measuring a car with the probe: `docs/PROBE.md`
- What we have learned so far: `docs/findings/`
- Skills: `skills/routing/` first, then `skills/genres/`, `skills/design-fundamentals/`, `skills/vehicles/`
