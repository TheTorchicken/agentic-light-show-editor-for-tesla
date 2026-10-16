# Contributing

Thanks for helping. The most valuable contributions are evidence about real cars and
design knowledge from real shows.

## Ways to help

### Measure your car (most wanted)

Every car profile should come from a probe run, not guesses. You need the car, a USB drive,
a phone on a tripod and about 15 minutes.

1. `npm run probe` builds four test shows into `build/probes/`.
2. Follow [docs/PROBE.md](docs/PROBE.md) to film them.
3. Open an issue with the **Probe results** template, or analyze the videos yourself (the
   findings doc shows how) and send a pull request with:
   - `profiles/<car>.json` (copy an existing one; every light needs `channels`, `behavior`,
     `shapes` for 2D and `shapes3d` for 3D),
   - `docs/findings/<date>-<car>-probe.md` with what you saw,
   - `skills/vehicles/<car>.md` with how to use that car's lights.

Mark anything you didn't film as unverified.

### Add or improve a genre skill

If a kind of music keeps producing weak shows, write down why and how to do better in
`skills/genres/<name>.md` (same shape as the others: why shows fail, how to choreograph it,
what to check), add it to the table in `skills/routing/SKILL.md`, and include the show that
taught you.

### Share a show

Add `shows/<slug>/` with `PLAN.md`, `show.json` and `show.ts`. Never commit the audio: the
show references the song, and each user brings their own copy. Put any measured data your
script needs (hit lists and so on) in a `data.ts` next to it.

### Code

- TypeScript runs directly on Node (type stripping), so keep to erasable syntax (no enums,
  no parameter properties).
- Run `npm test` and `npx tsc --noEmit` before opening a pull request. CI runs both.
- Keep tools usable without an agent: plain files, plain CLIs, no hidden state.

## Ground rules

- No audio, car models or other creators' show files in the repo. `workspace/` is
  gitignored for your local copies.
- Be honest about evidence: say what was measured and what was assumed.
- Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
