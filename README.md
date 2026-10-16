# Agentic Light Show Editor for Tesla

An open-source, agent-native light show editor for Tesla vehicles.

Give it a song and a few notes. An AI agent (or you, by hand) studies the music, picks a
choreography style that fits it, designs the show with real lighting craft, and compiles a
file your car plays from USB. You review it in a 3D browser viewer on a model of your car,
mark the moments and lights you want changed, and the agent revises.

Not affiliated with, endorsed by, or sponsored by Tesla, Inc. "Tesla" and "Model 3" are
trademarks of Tesla, Inc., used here only to say which cars the files are for.

## Why

Tesla's custom light shows are built in xLights, a desktop sequencer meant for a person
dragging effects onto a timeline. Driving it with an AI agent produces flat shows: lights
blinking on the beat, headlights on most of the time, left and right always identical.
This project replaces the editor with plain files and tools an agent can reason about,
measured car behavior, and written design knowledge, so the shows come out feeling
designed.

## What's here

| Part | What it does |
|---|---|
| `packages/audio` | Song analysis: tempo (robust to the usual 2x and 3:2 errors), beats, sections, drum hits, vocal phrases, silences, stem energy. Stems via Demucs. A router that suggests which genre skill fits. |
| `packages/show` | The choreography vocabulary (`on`, `flash`, `strobe`, `fadeIn`, `hit`, `chase`, `sweep`, `accelerate`, `color`, `pulse`, `follow`, closures...), a simulation of how the car really renders it, a critique against the design rules, and the compiler to `.fseq`. |
| `packages/core` | FSEQ v2 reader/writer, the 200-channel map, and a validator with Tesla's per-show closure limits. |
| `packages/viewer` | A local web app: pick a show, watch it in 3D on a model of the car (lights, cabin, screen, mirrors, windows, trunk, charge port), in a studio or a night parking garage, with a per-light timeline and review notes that land in a file the agent reads. |
| `packages/probe` | Voice-announced test shows that measure what a specific car does with each channel, so profiles come from evidence instead of guesses. |
| `profiles/` | One file per car: lights, what each can do, where it sits in 2D and 3D, its moving parts. |
| `skills/` | Design knowledge as plain Markdown: a routing skill, genre skills, fundamentals, per-car technique. |
| `shows/` | Example shows: plans and choreography (no audio). |
| `docs/` | How to write shows, run the probe, and what the probes found. |

## Quick start

Requirements: Node 23.6 or newer, Python 3.11+ with ffmpeg for audio analysis, macOS for
the probe's spoken announcements (optional).

```bash
npm install
npm test
```

Audio tools (once):

```bash
python3 -m venv packages/audio/.venv
packages/audio/.venv/bin/pip install -r packages/audio/requirements.txt
```

Make a show: follow the nine steps in [AGENTS.md](AGENTS.md#making-a-show). They are the
same whether an agent or a person does them. Then review:

```bash
npm run view          # http://localhost:4173/
```

To see the real car in 3D, download the model credited in [profiles/README.md](profiles/README.md)
into `workspace/models/`. Without it the viewer uses a stand-in body.

Put the compiled `workspace/<slug>/build/<Title>.fseq` and `.wav` in a `LightShow/` folder on
a USB drive, plug it into the car, and pick it from Toybox → Light Show.

## Supported cars

| Car | Status |
|---|---|
| 2027 Model 3 | Lights measured with the probe (front, rear, interior). Closure timings from Tesla's docs, not yet measured. |
| Others | Add a profile: run the probe on your car and contribute the results. See [CONTRIBUTING.md](CONTRIBUTING.md). |

Things we learned the hard way, with evidence, are in [docs/findings/](docs/findings/). For
example: on the Model 3 the "turn on" ramp codes run in the opposite order from the table in
Tesla's README.

## Ground rules

- **No audio in the repo.** Shows reference songs; you bring your own audio file.
- **No other creators' shows in the repo.** Import them locally to compare
  ([AGENTS.md](AGENTS.md#comparing-with-other-shows)); publish only what you learn.
- **Car capabilities come from evidence.** Anything a probe hasn't confirmed is marked unverified.

## Safety

Light shows only run while parked. Closures move: keep people, pets and objects clear of
mirrors, windows, the trunk and the charge port, and check the area before starting a show
that opens them. Total closure dancing is kept short because of thermal limits.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for third-party credits.
