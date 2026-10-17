# Top Gun Anthem (Harold Faltermeyer, guitar Steve Stevens): show plan

**Routing:** `skills/genres/cinematic-orchestral.md` leads, with `skills/genres/electronic.md`
for the pulse sections (plus design-fundamentals and the Model 3 file). `route.py`: "other"
(synth pads, brass synths, guitar) 54% of the mix, bass 44%, drums 2%, voice 0% (the
"vocals" stem is the lead guitar, present 83%). It is a film anthem: phrases and set pieces,
big moments out of darkness. The synth bass pulse and the sixteenth-note percussion give
some sections an electronic groove, so those borrow its kick/hat mapping and strobed builds.

Car: 2027 Model 3. Music 66.49 s at 107 BPM (0.56 s beat, 2.24 s bar; the analyzer is right,
checked against the drum stem's steady sixteenths). Its downbeats are one beat late: the
real bar lines are 0.13, 2.37, 4.61, 6.85 ... (every bar is 2.24 s).

## How the music was read (bass pitch from the stem, RMS at 0.1 s)

| Time | Event |
|---|---|
| 0.00-4.58 | Intro: quiet synth percussion, sixteenths with a few strong hits |
| 4.60 | Groove enters: synth bass pedal on C, chords |
| 9.09 | Chord swell |
| 11.3-13.5 | Chords drop out, bass and ticks only |
| **13.52** | **Guitar melody enters (BIG 1)** |
| 22.54 | Second half of the theme (bass hit) |
| 29.25 | Bass to B flat: one-bar lift |
| 31.49 | Key change up a half step (C sharp) |
| 40.45 | Bass climbs D#, F#, C#, E (peak at 41.0) |
| 49.41 | Back to C, guitar at its highest (peak 53.5) |
| 58.37 | A, then B flat (61.0): the music pulls back |
| 62.84 | G pedal: the dominant, a 2.7 s build |
| **65.60** | **Final chord (C)** (BIG 2); the edit cuts dead at 66.49 |

The edit stops on the final chord with no tail, so there was no time "after the music" for
the windows to close. `workspace/top-gun/pad.py` appends 5 s of silence for the show audio
(`workspace/top-gun/show-audio/TopGunAnthem.wav`) and extends the analysis with zeros
(`analysis-show.json`). The music is unchanged.

## Interior palette (no theme given)

Sunset over the carrier deck: deck navy `#08145a` (calm), afterburner orange `#ff6e0a`
(rise), sunset amber `#ff8c1e` (pulse), squadron blue `#1432c8` (alt), white (flash),
sunset crimson `#ff323c` (accent), dusk violet `#5a1e8c` (mellow), afterburner-cone blue
`#78b4ff` (cool), sunset gold `#ffaa50` (glow). Set through `s.palette(defaults)`.

## Set pieces

| # | Set piece | Time | Motif (unique to it) |
|---|---|---|---|
| 0 | Radar | 0:00-0:04.6 | One U segment sweeps the cabin per beat like a radar; strong hits ping the screen blue and blink one DRL with the opposite tail |
| 1 | Engines spool | 0:04.6-0:13.5 | Rear heartbeat (brake on 1 and 3, tails on 2 and 4); DRL eyes breathe once per bar; the U swaps sides per beat; screen pulses sunset per beat |
| 2 | Wingmen | 0:14.6-0:22.5 | Each guitar note lights one whole side (DRL, front turn, repeater, rear turn), sides trading like two jets in formation; strong notes add that side's outer beam |
| 3 | Formation | 0:22.5-0:29.2 | Diagonal ping-pong one per beat (FL, RR, FR, RL: front turn + DRL + repeater, or rear turn + tail); inner beams swell on the two bass hits; U front arc answers rear pair |
| 4 | The climb | 0:29.2-0:31.5 | DRL 2 s ramp, front/rear strobe accelerating, U converging outside-in, black |
| 5 | Afterburner | 0:31.5-0:40.4 | Rear two-stage burn every beat (reverse + plate core, brake a sixteenth later, fog + tails on downbeats, an amber flame on beat 3); DRLs on the bar line and backbeats; outer beams blink with the guitar; screen flickers orange/blue in eighths; U fires inside-out |
| 6 | Barrel roll | 0:40.4-0:49.4 | One corner of the car per beat travelling around it (front corner: outer beam, DRL, turn, repeater; rear corner: tail and rear turn), direction flipping on each bass change, eighths then sixteenths at the end; one U segment travels with it |
| 7 | The soar | 0:49.4-0:58.4 | Main beams carry it: inner beams held per phrase, outer beams on the guitar accents and held through the highest notes (53.9-56.1), tails held a bar per side; screen gold, U racing in eighths |
| 8 | Approach | 0:58.4-1:02.8 | Landing lights: amber + DRL washes trading sides per half bar, plate/fog and tail/rear-turn ticks at the rear; screen dusk violet |
| 9 | Final approach | 1:02.8-1:05.3 | Inner beams 2 s swell, rear rolls tail to tail accelerating, last bar strobes front against rear, black |

The two biggest moments are not set pieces; each is "darkness, then everything":
- **Guitar entrance 13.52**: black 12.95-13.52, then the whole car and cabin white 0.4 s, a
  0.7 s strobe over held beams, 2 s ring-out. Mirrors fold onto it, all windows swing.
- **Final chord 65.60**: black 65.30-65.60, then everything held solid for the chord. At the
  cut (66.49) the on/off lights snap off and the beams, DRL and cabin ring out over 2 s.

Smaller structural hits: groove entry 4.60, key change 31.49, return to C 49.41.

## Sections

| Time | Section | Int. | Light mapping | Interior color |
|---|---|---|---|---|
| 0.0-4.6 | Radar | 2 | DRL blink + opposite tail on strong hits; repeater/rear-turn pickups; black 4.42 | Screen navy, blue pings; U radar sweep in cone blue |
| 4.6-13.5 | Engines spool | 4 | Entry hit; heartbeat at the rear; DRL breath per bar; inner swell 9.09; thin from 11.3; ticks; black 12.95 | Screen sunset per beat on navy; U side swap in squadron blue |
| 13.52 | BIG 1 | 10 | Everything, strobe, ring-out | White, strobe white/orange, settle to sunset |
| 14.6-22.5 | Wingmen | 6 | Side per guitar note; tails on bar lines | Screen follows the guitar in sunset; lit side of the U in crimson |
| 22.5-29.2 | Formation | 6 | Diagonals per beat; inner swells; brake on bass hits | Screen alternates navy/sunset per bar, white on bar lines; U front vs rear in gold/blue |
| 29.2-31.5 | Climb | 5→8 | DRL ramp, accelerating strobe, black 31.15 | Screen navy → white; U converges |
| 31.49 | Key change | 8 | Beams, brake, tails, reverse, fog 0.2 s | White → afterburner orange |
| 31.7-40.4 | Afterburner | 7 | Rear burn per beat; outer blinks with guitar | Screen orange/blue eighths with the bass; U inside-out in blue |
| 40.4-49.4 | Barrel roll | 7 | Corner per beat, flips at bass changes; inner swell 40.45; black 48.85 | Screen hue per bass chord (crimson, violet, blue, sunset); U single segment travels |
| 49.4-58.4 | Soar | 8 | Return hit; inner held; outer + rear turns on accents; tails per bar; brake on bar lines | Screen gold with white beats; U eighth-note race |
| 58.4-62.8 | Approach | 3 | Amber washes, plate/fog ticks | Dusk violet breathing |
| 62.8-65.3 | Final approach | 5→9 | Inner swell, rear roll, front/rear strobe, black 65.30 | Screen orange → white; U converges |
| 65.60 | BIG 2 | 10 | Everything solid; snap off at 66.49; 2 s ring-out | White, then gold, then black |

## Dance moves (closures, unverified on this car)

Windows go down at 0:00 and stay down while music plays; they move only by dancing. They
close at 66.8, after the music has ended, and are shut at 70.8 before the audio ends (71.49).

| Time | Move | Lands on |
|---|---|---|
| 0.0 → 4.0 | All four windows down | The intro |
| 0.2 → 2.2 | Mirrors fold | Wings folded on deck |
| 2.6 → 4.6 | Mirrors unfold | The groove entry |
| 11.52 → 13.52 | Mirrors fold | Guitar entrance |
| 13.52-15.72 | All four windows swing | Guitar entrance |
| 15.82 → 17.82 | Mirrors unfold | Wingmen |
| 29.49 / 29.75 | Mirrors fold, left then right (a nod) | Key change 31.49 |
| 31.49-33.69 | Front windows swing | Key change |
| 33.73 | Mirrors unfold | |
| 35.41 → 49.41 | Trunk opens (14 s) | Return to C |
| 47.41 → 49.41 | Mirrors fold; charge port opens | Return to C |
| 51.65 | Mirrors unfold | |
| 51.65-55.0 | Charge port dances | The soar |
| 53.89-56.13 | Trunk bobs; rear windows swing | Guitar peak |
| 56.13 | Charge port closes | |
| 58.37 → 62.37 | Trunk closes | Approach |
| 63.6 → 65.6 | Mirrors fold | Final chord |
| 65.6-66.7 | All four windows half swing | Final chord |
| 66.8 → 68.8 | Mirrors unfold | After the music |
| 66.8 → 70.8 | All four windows up | After the music; ends closed, mirrors out |

Counts: front windows 5, rear windows 5 (limit 6); mirrors 10 each (20); trunk 3 (6); charge
port 3 (3). Dancing: 10 window swings ≈ 19 s, trunk 2.2 s, port 3.4 s: about 25 s.

## Checks

`npm run show shows/top-gun`: validation OK, no warnings, only the correlation note. Exterior
duty 15% (busiest light: inner beams 27%), dynamic range 4.1x. Light energy by section:
radar 0.05, engines 0.08, guitar + wingmen 0.28, formation 0.14, climb 0.08, afterburner 0.13,
barrel roll 0.16, soar 0.21, approach 0.07, final approach 0.09, final chord 1.00.

`workspace/top-gun/lanes.py top-gun workspace/top-gun/lanes.png` draws the lanes. Brightest
1 s windows: final chord 0.93, guitar entrance 0.79, then 0.32 (barrel-roll peak), 0.29 (soar).

The older community show (2021, 48 channels, 50 ms frames): exterior duty 60%, every beam
and DRL on 72-90% of the time, validation fails (falcon-door and liftgate budgets), ends
with mirrors folded and the trunk open. The compiler reads its 50 ms frames as 20 ms (see
`workspace/top-gun-community/resample.py`); resampled to 20 ms its dynamic range is 3.5x.
