# Writing shows

A show is a folder in `shows/<slug>/`:

| File | What |
|---|---|
| `PLAN.md` | The design: routing decision, sections with motifs and intensity, light mapping, interior colors, dance moves. Write this first. |
| `show.json` | Settings (below). |
| `show.ts` | The choreography: a function that receives a `Show` and calls the vocabulary. |
| `data.ts` | Optional measured data (hit lists, phrase times) the script imports. |

Compile with `npm run show shows/<slug>`. Output goes to `workspace/<slug>/build/`: the
`.fseq` and `.wav` for the car, `viewer.json` for the viewer, and `report.md` with validation
and the critique.

## show.json

```json
{
  "title": "Grief",
  "artist": "KzX",
  "profile": "profiles/model3-2027.json",
  "audio": "workspace/grief/Grief.wav",
  "analysis": "workspace/grief/analysis.json",
  "theme": { "colors": ["#ff0000", "#ffffff"], "note": "Red and black: red and white in light." },
  "sections": [{ "start": 0, "name": "intro" }, { "start": 46.89, "name": "drop 1" }]
}
```

- `theme` (optional) recolors the interior only (screen and accents). Black means darkness, so a
  "red and black" theme is red and white in light.
- `sections` (optional) replaces the analyzer's sections for the critique.
- `fseq` (optional) imports an existing show file instead of running `show.ts`, for comparison.

## The vocabulary

Times are in seconds, durations in milliseconds, lights by id from the profile. Later calls
override earlier ones where they overlap, so lay down a base and paint accents and
blackouts on top. Methods that light RGB interior lights take an optional `color`.

| Method | Does |
|---|---|
| `on(ids, t0, t1, color?)` / `off(ids, t0, t1)` | Hold on, or force dark |
| `flash(ids, t, ms, color?)` | Short flash (respects each light's minimum visible flash) |
| `strobe(ids, t0, t1, periodMs, onMs?, color?)` | Even strobe with at least 40 ms dark between flashes |
| `accelerate(groups, t0, t1, { startMs, minMs, factor, duty, color })` | Strobe that speeds up, groups taking turns. Returns the times |
| `fadeIn(ids, t, ms, holdUntil?, color?)` / `fadeOut(ids, t, ms)` | Ramps. Ramp lights snap to the car's 0.5 / 1 / 2 s codes |
| `hit(ids, t, holdMs, decayMs, color?)` | On, then fade (on/off lights just flash) |
| `chase(groups, times, onMs)` | Each group in turn |
| `sweep(order, times, { bounce, onMs, color, decayMs, base })` | Move along an ordered list (e.g. the cabin U), bouncing at the ends |
| `sides(a, b, times, opts)` | Alternate two groups |
| `color(ids, t0, t1, from, to?)` | RGB hold or gradient |
| `pulse(ids, times, color, decayMs, base?)` | RGB hit that decays to `base` |
| `follow(ids, t0, t1, stem, color, floor?)` | RGB brightness follows a stem's energy |
| `palette(defaults)` | Interior colors by role; the song's theme overrides them |
| `closure(channels, t, "open" \| "close" \| "dance" \| "stop", until?)` | Mirrors, windows, trunk, charge port |

Time helpers: `beats`, `downbeats`, `grid(t0, t1, div)`, `onsets(kind, t0, t1, minStrength)`,
`energyAt(t, stem?)`, `phrases(t0, t1)` (vocal phrases), `silences(t0, t1)`.

## What the compiler checks

- **Validation**: the file loads on the car (format, 200 channels, closure command limits).
- **Warnings**: fades on lights that can't fade, closures left open at the end.
- **Critique** (from `skills/design-fundamentals`):
  - exterior lights on more than 40% of the time;
  - any light on more than 35% of the time (a background glow);
  - the front or rear completely dark for more than a bar while music plays (the screen counts for the front);
  - no darkening before a section that hits;
  - neighboring sections that look alike;
  - dynamic range under 2.5x between the quietest and brightest playing sections;
  - interior colors off the song's theme;
  - lights never used.

Aim for no notes except the correlation line. The critique measures; the human's review
decides.
