"""Song analysis for choreography.

Writes analysis.json with everything a show designer needs to place moments:
tempo, beats, downbeats, onsets split by frequency band (kick / snare / hats),
an energy curve, sections, and per-stem activity when Demucs stems are given.

Usage:
  python analyze.py song.wav out/analysis.json [--stems DIR]
"""

import argparse
import json
from pathlib import Path

import librosa
import numpy as np

SR = 44100
HOP = 441  # 10 ms


def band_onsets(S, freqs, lo, hi, times, delta):
    """Onsets from spectral flux restricted to one frequency band."""
    band = S[(freqs >= lo) & (freqs < hi)]
    flux = np.maximum(0, np.diff(np.log1p(band), axis=1)).sum(axis=0)
    flux = np.concatenate([[0], flux])
    flux = flux / (np.percentile(flux, 99) + 1e-9)
    peaks = librosa.util.peak_pick(flux, pre_max=3, post_max=3, pre_avg=10, post_avg=10, delta=delta, wait=8)
    return [{"t": round(float(times[p]), 3), "s": round(float(min(flux[p], 1.5)), 3)} for p in peaks]


def curve(x, times, step=0.05):
    """Resample a per-frame curve to a fixed 50 ms grid, normalized to 0-1."""
    grid = np.arange(0, times[-1], step)
    y = np.interp(grid, times, x)
    y = (y - y.min()) / (np.ptp(y) + 1e-9)
    return [round(float(v), 3) for v in y]


def sections(y, beats, downbeats, duration):
    """Segment on beat-synced timbre + harmony + loudness, snapped to downbeats."""
    chroma = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=HOP * 4)
    mfcc = librosa.feature.mfcc(y=y, sr=SR, hop_length=HOP * 4, n_mfcc=13)
    rms = librosa.feature.rms(y=y, hop_length=HOP * 4)
    beat_frames = librosa.time_to_frames(beats, sr=SR, hop_length=HOP * 4)
    feats = np.vstack([librosa.util.normalize(chroma, axis=1), librosa.util.normalize(mfcc, axis=1), 3 * rms / rms.max()])
    sync = librosa.util.sync(feats, beat_frames, aggregate=np.median)
    k = max(4, min(14, int(duration / 14)))
    bounds = librosa.segment.agglomerative(sync, k)
    starts = sorted({0.0, *[float(beats[min(b, len(beats) - 1)]) for b in bounds[1:]]})
    # Snap to the nearest downbeat so sections start on the bar.
    snapped = sorted({min(downbeats, key=lambda d: abs(d - s)) if s > 0 else 0.0 for s in starts})
    out = []
    full_rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    rms_t = librosa.frames_to_time(np.arange(len(full_rms)), sr=SR, hop_length=HOP)
    for i, s in enumerate(snapped):
        e = snapped[i + 1] if i + 1 < len(snapped) else duration
        m = (rms_t >= s) & (rms_t < e)
        out.append({"start": round(s, 3), "end": round(e, 3), "energy": round(float(full_rms[m].mean() / full_rms.max()), 3)})
    return out


def track_beats(y_rhythm):
    """Beat grid robust to the classic 2x and 3:2 tempo errors.

    librosa's first guess is often a multiple off (Tidal Wave: 100 instead of 150 BPM).
    Try the related tempos and keep the grid whose beats land on strong onsets while the
    points halfway between them stay weak.
    """
    env = librosa.onset.onset_strength(y=y_rhythm, sr=SR, hop_length=HOP)
    first = float(np.atleast_1d(librosa.feature.tempo(onset_envelope=env, sr=SR, hop_length=HOP))[0])
    candidates = sorted({round(first * k, 2) for k in (0.5, 2 / 3, 1, 1.5, 2) if 60 <= first * k <= 200})
    best = None
    for bpm in candidates:
        _, frames = librosa.beat.beat_track(onset_envelope=env, sr=SR, hop_length=HOP, start_bpm=bpm, tightness=300, trim=False, units="frames")
        if len(frames) < 8:
            continue
        mids = ((frames[:-1] + frames[1:]) // 2).astype(int)
        on, off = env[frames].mean(), env[mids].mean()
        period = float(np.median(np.diff(frames))) * HOP / SR
        # Half-time grids also have weak off-beats, so weigh in where real songs sit:
        # a gentle preference for tempos near 120 BPM, one octave either side.
        prior = np.exp(-(np.log2((60 / period) / 120) ** 2) / (2 * 0.5 ** 2))
        score = (on - off) / (env.mean() + 1e-9) * prior
        if best is None or score > best[0]:
            best = (score, 60 / period, frames)
    _, tempo, frames = best
    return tempo, frames, [round(c, 1) for c in candidates]


def drum_hits(drums_path, times):
    """Kick, snare and hat hits from the drum stem, split by frequency band, with strengths."""
    y, _ = librosa.load(drums_path, sr=SR, mono=True)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP))
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    t = librosa.frames_to_time(np.arange(S.shape[1]), sr=SR, hop_length=HOP)
    return {
        "kick": band_onsets(S, freqs, 30, 150, t, 0.2),
        "snare": band_onsets(S, freqs, 1500, 5000, t, 0.2),
        "hats": band_onsets(S, freqs, 7000, 16000, t, 0.2),
    }


def vocal_phrases(vocals_path):
    """Vocal phrases (start/end) where the voice stem is clearly present."""
    y, _ = librosa.load(vocals_path, sr=SR, mono=True)
    r = librosa.feature.rms(y=y, hop_length=HOP)[0]
    r = np.convolve(r, np.ones(15) / 15, mode="same")  # 150 ms smoothing
    on = r > 0.15 * np.percentile(r, 99)
    t = librosa.frames_to_time(np.arange(len(r)), sr=SR, hop_length=HOP)
    phrases, start = [], None
    for i, v in enumerate(on):
        if v and start is None:
            start = t[i]
        elif not v and start is not None:
            phrases.append([start, t[i]]); start = None
    if start is not None:
        phrases.append([start, t[-1]])
    merged = []
    for p in phrases:  # merge breaths shorter than 0.35 s
        if merged and p[0] - merged[-1][1] < 0.35:
            merged[-1][1] = p[1]
        else:
            merged.append(p)
    return [{"start": round(float(a), 3), "end": round(float(b), 3)} for a, b in merged if b - a >= 0.4]


def silences(y):
    """Gaps where the whole mix is near silent for 80 ms or more."""
    r = librosa.feature.rms(y=y, hop_length=HOP)[0]
    quiet = r < 0.06 * np.percentile(r, 99)
    t = librosa.frames_to_time(np.arange(len(r)), sr=SR, hop_length=HOP)
    out, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        elif not q and start is not None:
            if i - start >= 8:
                out.append({"start": round(float(t[start]), 3), "length": round(float(t[i] - t[start]), 3)})
            start = None
    return out


def stem_activity(stem_dir, times_ref):
    out = {}
    for name in ("drums", "bass", "vocals", "other"):
        path = Path(stem_dir) / f"{name}.wav"
        if not path.exists():
            continue
        y, _ = librosa.load(path, sr=SR, mono=True)
        rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
        t = librosa.frames_to_time(np.arange(len(rms)), sr=SR, hop_length=HOP)
        on = librosa.onset.onset_detect(y=y, sr=SR, hop_length=HOP, units="time", backtrack=False)
        out[name] = {"energy": curve(rms, t), "onsets": [round(float(x), 3) for x in on]}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("out")
    ap.add_argument("--stems")
    a = ap.parse_args()

    y, _ = librosa.load(a.audio, sr=SR, mono=True)
    duration = len(y) / SR

    stem_dir = Path(a.stems) if a.stems else None
    drums_path = stem_dir / "drums.wav" if stem_dir else None
    rhythm = librosa.load(drums_path, sr=SR, mono=True)[0] if drums_path and drums_path.exists() else y
    tempo, beat_frames, tried = track_beats(rhythm)
    beats = librosa.frames_to_time(beat_frames, sr=SR, hop_length=HOP)

    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP))
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    times = librosa.frames_to_time(np.arange(S.shape[1]), sr=SR, hop_length=HOP)

    # Downbeat phase: the beat position (of 4) with the strongest low-end onsets.
    low = S[freqs < 150].sum(axis=0)
    low_at_beats = low[np.minimum(beat_frames, len(low) - 1)]
    phase = int(np.argmax([low_at_beats[p::4].mean() for p in range(4)]))
    downbeats = beats[phase::4]

    rms = librosa.feature.rms(S=S)[0]
    centroid = librosa.feature.spectral_centroid(S=S, sr=SR)[0]

    result = {
        "duration": round(duration, 3),
        "tempo": round(float(tempo), 2),
        "beats": [round(float(b), 3) for b in beats],
        "downbeats": [round(float(b), 3) for b in downbeats],
        "tempoCandidates": tried,
        "onsets": drum_hits(drums_path, times) if drums_path and drums_path.exists() else {
            "kick": band_onsets(S, freqs, 30, 150, times, 0.12),
            "snare": band_onsets(S, freqs, 1500, 5000, times, 0.12),
            "hats": band_onsets(S, freqs, 7000, 16000, times, 0.10),
        },
        "silences": silences(y),
        "energy": curve(rms, times),
        "brightness": curve(centroid, times),
        "curveStep": 0.05,
        "sections": sections(y, beats, list(downbeats), duration),
    }
    if a.stems:
        result["stems"] = stem_activity(a.stems, times)
        if (stem_dir / "vocals.wav").exists():
            result["vocalPhrases"] = vocal_phrases(stem_dir / "vocals.wav")

    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(result))
    print(f"tempo {result['tempo']} bpm (tried {tried}), {len(beats)} beats, {len(result['sections'])} sections, "
          f"kick {len(result['onsets']['kick'])}, snare {len(result['onsets']['snare'])}, hats {len(result['onsets']['hats'])}")
    for s in result["sections"]:
        print(f"  {s['start']:7.2f} - {s['end']:7.2f}  energy {s['energy']:.2f}")


if __name__ == "__main__":
    main()
