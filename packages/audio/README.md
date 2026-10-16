# Audio analysis

Python tools that turn a song into what a choreographer needs.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

| Script | Does |
|---|---|
| `analyze.py song.wav out.json --stems STEMS_DIR` | Tempo (checked against 2x and 3:2 errors), beats, downbeats, sections, kick/snare/hat hits from the drum stem, vocal phrases, silent gaps, energy and per-stem activity |
| `route.py STEMS_DIR` | Which genre skill fits the song (see `skills/routing/SKILL.md`) |

Stems come from Demucs: `python -m demucs -n htdemucs -d mps -o OUT song.wav` (`-d cpu`
without Apple silicon). Always work on 44.1 kHz audio; the car drifts out of sync with 48 kHz.
