# The probe: measuring what a car really does

Tesla's public docs stop at 2024 and do not cover the newest Model 3 and Model Y
hardware. The probe answers that from the car itself: four short shows that test one
thing at a time, announced by voice, filmed by you, analyzed afterwards against the
exact timeline in each probe's manifest.

## The four files

| File | Camera | Tests | Length |
|---|---|---|---|
| `Probe_1_Front` | Front, slightly off-center, 3-5 m away. Both headlamps and any front light bar in frame. | Every front light alone (ch 1-22), channels 4-6 combinations, fade behavior on six lights, short flashes, front light bar sweep/ramp/halves, unmapped channels | ~6:10 |
| `Probe_2_Rear` | Rear, slightly off-center, 3-5 m away. Both tail lamps, plate and any rear light bar in frame. | Every rear light alone (ch 21-30), fades on four lights, short flashes, rear light bar | ~3:40 |
| `Probe_3_Interior` | Inside the cabin, or through the windshield. Dash, door strips and screen visible. | Each interior RGB segment in red, green, blue, white; brightness ramp | ~2:20 |
| `Probe_4_Closures` | Wide shot from a front corner: mirrors, a front window and the charge port visible. | Mirrors fold/unfold, front windows open/close/dance, charge port open/dance/close | ~1:35 |

Build them with `npm run probe`. Output lands in `build/probes/`.

## Before you start

- Park somewhere dark and open, with nothing near the mirrors, windows or charge port.
- Car in Park, lights set to Auto or Off, doors closed.
- Copy each `Probe_N_*.fseq` and its matching `.wav` into `LightShow/` on the USB drive.
- Phone on a tripod or a steady surface. **The camera must not move during a run.**

## Camera settings (iPhone)

1. Video at **1080p, 120 fps**.
2. Frame the car, then **long-press on the car until "AE/AF Lock" appears**.
3. Drag the exposure (sun icon) down a little, so the brightest headlight is not pure white.
4. Start recording *before* you start the show, and stop after "Probe complete."

Exposure lock matters most. Without it the phone re-adjusts brightness every time a
light changes, and fade measurements become meaningless.

## Running a probe

1. Start recording.
2. On the car's screen: Toybox → Light Show → pick the probe.
3. Walk out of frame. The show waits a few seconds before the sync flashes.
4. Each test is announced ("Test 14. Left signature."), then runs. A soft tick marks
   the start of each action. Between tests the car is dark.
5. Three beeps with three flashes start and end each probe. Those align the video.

Run the front and rear probes from their own camera positions. You can skip the
closures probe if you are not ready for things to move; it stays well inside every
per-show command limit and leaves the liftgate out entirely.

Do the full set on each car. File names: `<car>-<probe>.mov`, e.g. `model3-front.mov`.

## What happens after

Put the videos in `workspace/probe-videos/<car>/`. The analysis lines each video up
with the sync flashes, then for every action in the manifest compares a dark frame to
a lit frame to see what lit up, and tracks brightness frame by frame for the fade and
flash tests. Anything ambiguous comes back as a short list of timestamps for you to
check by eye.

The results become the car's profile in `profiles/`, and a public table of what each
channel does on that car.

Each probe also has a `.cues.md` cue sheet if you want to note things as you watch.
