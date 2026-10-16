---
name: light-show-routing
description: Start here for every new show. Decides which genre skill(s) to load for a song, from its stems and the owner's notes.
---

# Routing: which skills does this song need?

Every show uses `skills/design-fundamentals/SKILL.md` and the car's file in
`skills/vehicles/`. On top of that, load one genre skill (sometimes two) from
`skills/genres/`. This file decides which.

## 1. Measure

After stems are separated, run:

```bash
packages/audio/.venv/bin/python packages/audio/route.py workspace/<slug>/stems/htdemucs/<name>
```

It reports what leads the mix (each stem's share of the power, and how much of the song
each is present) and suggests a family:

| Signal | Family |
|---|---|
| strings / brass / synth pads lead ("other" > 40%), little voice | `cinematic-orchestral` |
| bass or drums lead, voice under ~30% | `electronic` |
| voice leads (≥ 30%, or ≥ 20% and present most of the song) | voice-led: `hip-hop-spoken` or `musical-theatre` |

## 2. Decide

The numbers only name a family. Settle it with what the song *is*:

- **Voice-led**: one speaker or rapper over a beat → `hip-hop-spoken`. A cast of characters
  telling a story, ensemble numbers, a narrative arc → `musical-theatre`.
- **Mixed songs** load two skills and say which section uses which. Trailer music is
  `cinematic-orchestral` with `electronic` drops; a pop song with a big orchestral bridge
  is `electronic` with a `cinematic-orchestral` bridge.
- **The owner's notes win.** If they say "this starts strong", "this is a slow burn" or name a
  color theme, that overrides anything the measurements suggest.

Write the routing decision at the top of `shows/<slug>/PLAN.md`: the skills you loaded and why,
in one or two lines.

## 3. Learn

When a song doesn't fit any genre skill well, or the owner's review shows a skill was wrong:

- Fix the genre skill with what you learned, in plain words, with the song as the example.
- If it's a new kind of music (country, metal, lo-fi, a cappella...), add
  `skills/genres/<name>.md` with the same shape as the others: why shows of this kind fail,
  how to choreograph it, and what to check before finishing. Add it to the table above.

## Genre skills

| Skill | For | Learned from |
|---|---|---|
| `genres/electronic.md` | EDM, bass music, dance pop, anything built on drops | Grief, Tidal Wave |
| `genres/cinematic-orchestral.md` | film scores, orchestral, epic/trailer music | Test Drive (its first draft failed) |
| `genres/hip-hop-spoken.md` | rap, spoken word, voice over beats | a spoken-word track over trap drums |
| `genres/musical-theatre.md` | musicals, narrative songs, casts and ensembles | Alexander Hamilton |
