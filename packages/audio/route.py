"""Suggest which genre skill(s) fit a song, from its stems.

Measures what leads the mix and how rhythmic it is, then prints the matching skills from
skills/genres/ with the reasons. It is a starting point for skills/routing/SKILL.md, not a
verdict: the owner's notes and your own listening of the overview plot win.

Usage:
  python route.py STEMS_DIR [--json]
"""

import argparse
import json
from pathlib import Path

import librosa
import numpy as np

SR = 22050


def rms(path):
    y, _ = librosa.load(path, sr=SR, mono=True)
    return y, librosa.feature.rms(y=y, hop_length=512)[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stems")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    stems = {n: rms(Path(a.stems) / f"{n}.wav") for n in ("drums", "bass", "vocals", "other")}
    power = {n: float(np.mean(r ** 2)) for n, (_, r) in stems.items()}
    total = sum(power.values()) or 1
    share = {n: p / total for n, p in power.items()}

    # How much of the song has each stem clearly present (above 20% of its own peak).
    present = {n: float(np.mean(r > 0.2 * r.max())) for n, (_, r) in stems.items()}

    drums_y = stems["drums"][0]
    onsets = librosa.onset.onset_detect(y=drums_y, sr=SR, units="time")
    signals = {
        "share": {k: round(v, 2) for k, v in share.items()},
        "present": {k: round(v, 2) for k, v in present.items()},
        "drumOnsetsPerSecond": round(len(onsets) / (len(drums_y) / SR), 2),
    }

    # Families, not final answers: rap over beats and a musical number look alike in
    # the stems, so voice-led songs are settled by what the song is (skills/routing).
    picks = []
    if share["other"] > 0.4 and share["vocals"] < 0.12:
        picks.append(("cinematic-orchestral", f"strings/brass/synths lead ({share['other']:.0%} of the mix) with little voice"))
    elif share["vocals"] >= 0.3 or (share["vocals"] >= 0.2 and present["vocals"] > 0.6):
        picks.append(("hip-hop-spoken | musical-theatre", f"voice leads ({share['vocals']:.0%}, present {present['vocals']:.0%} of the song); one speaker over beats -> hip-hop-spoken, a cast telling a story -> musical-theatre"))
    else:
        lead = "bass" if share["bass"] >= share["drums"] else "drums"
        picks.append(("electronic", f"{lead} leads ({share[lead]:.0%}) with {share['vocals']:.0%} voice"))
    if share["vocals"] >= 0.12 and picks[0][0] == "electronic":
        picks.append(("(vocal moments)", "voice is a real part of the mix; give it its own light (see design fundamentals)"))

    if a.json:
        print(json.dumps({"skills": [p[0] for p in picks], "reasons": [p[1] for p in picks], "signals": signals}, indent=2))
        return
    print("Suggested genre skills:")
    for skill, why in picks:
        print(f"  {skill}  ({why})")
    print("Signals:", json.dumps(signals))


if __name__ == "__main__":
    main()
