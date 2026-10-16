# Tidal Wave: show plan

Car: 2027 Model 3. 184.5 s file, music ends ~179.5 s.

## Tempo (measured, not the analyzer's)

`analysis.json` says 100 BPM. That is a 2:3 octave error: the analyzer's 0.6 s beats
land on every third sixteenth. Fitting the drum stem gives **150 BPM exactly**, beat
0.400 s, bar 1.6 s, grid `t = 0.16 + 0.4 k`, constant for the whole song (checked in
10 s windows, drift < 15 ms). Downbeats are `k % 4 == 0`. The analyzer's downbeats
(2.0-2.6 s apart) and its section starts are not on this grid, so show.ts builds its
own grid and ignores `s.beats()` / `s.downbeats()`. Its beats also stop at 172.4 s.

Drum patterns (drum stem, per eighth note):
- Drops: four-on-the-floor kick every beat, clap/snare on beats 2 and 4.
- Verses: syncopated kick on the bar start and 1.5 beats later (0, +0.6 s), strongest
  every other bar.
- Breakdown and outro: half-time, kick on each bar start, snare on eighths 3/6/10/13.

## Light mapping (consistent all song)

| Musical element | Lights |
|---|---|
| Kick (drops) | Outer main beams, left on beat 1, right on beat 3; tails on the same side at the rear |
| Clap (beats 2, 4) | Brake (+ reverse or plate), DRL blink at the front |
| Verse kick | Brake on the first kick, a tail (alternating sides) on the second |
| Vocals | DRL strips, breathing on each phrase, alternating sides; both on long notes |
| Bass swells | Front turns as slow amber washes, inner beams on the biggest swells |
| Hats / eighths in drops | Amber diagonal chase (turnFL → turnRR → turnFR → turnRL), repeaters |
| Risers / snare rolls | Accelerating strobe, front vs rear, then darkness |
| Screen | Lead: cyan/purple color story, beat pulses, strobes at peaks, every section |
| Accents (U) | The "wave": a crest that travels along the U and bounces; side swaps; front/back answers |

Interior uses only the theme (cyan `#00e5ff`, purple `#8a2be2`) and blends; variety
from brightness, timing and movement. Exterior is unthemed.

## Sections

| Time | Section | Int. | Motif | Light mapping | Interior |
|---|---|---|---|---|---|
| 0:00-0:13 | Intro (vocal + pad) | 7 | Surge + ripples | Whole car surges on at 0:00.16; DRL ping-pong every beat; one inner beam surges per vocal phrase with an outer blink; front turns swell per bar, rear turns answer on beat 4; brake on bars, tails on beats 2/3; repeater roll into the verse | Screen: full cyan surge per phrase, purple ripples every beat, cyan/purple strobe in the last bar. U: bright crest on every beat over purple |
| 0:13-0:26 | Verse 1 | 7 | Surf: kick crosses the car | Kick 1 brake + outer (side alternates per bar), kick 2 tail + opposite outer, rear turn and reverse fill the bar; amber diagonal on beats; repeaters on the hat eighths; DRL breathes with the voice; inner beam every 2 bars | Screen: full cyan on kick 1, full purple on kick 2, eighth flicker. U: side swaps, center follows the voice |
| 0:26-0:37 | Build 1 | 7→8 | Rising tide: front answers rear | Beats then eighths alternate front (DRL+turn, side alternating) and rear (brake, tails); inner beam each bar; 16th repeaters/plate in the second half | Screen eighths drift cyan → purple, brighter. U front arc answers rear pair |
| 0:37-0:39 | Riser | 7 | Acceleration | Front/rear strobe accelerates with the snare roll | Screen purple strobe accelerates |
| 0:38.6 | Hit, then dark | 7→0 | Crash, then nothing | Everything snaps on at 38.56; black 39.4-41.1 (only small screen flickers) | Screen flickers on the stray hits, black for the last beat |
| 0:41-1:04 | Drop 1 | 9 | Breakers: kicks walk L→R, claps hit the rear | Kick outerL/tailL, clap brake+DRL, kick outerR/tailR, clap brake+plate. 2nd phrase adds amber chase + repeaters. Fill bar 49.8 strips down. Mirrors fold at the drop | Screen cyan on kicks, purple on claps; full strobe in the fill. U crest on eighths |
| 1:04-1:15 | Breakdown (bass) | 4→2 | The tide goes out | Brake on bar kicks, tails on the snare, front turns swell with the bass, inner beams decay from the 64.16 hit. Layers drop out after 72 s. Mirrors unfold | Purple, swelling once per bar. U crest one segment per beat |
| 1:15-1:17 | Hush | 1 | Breath | Almost black, DRL glows with the voice | Faint cyan |
| 1:17-1:30 | Verse 2 | 4 | Verse 1, purple-led | Same mapping as verse 1; rear turns answer each vocal phrase end | Screen purple pulses, cyan answers. U front/back answers |
| 1:30-1:41 | Build 2 | 5→7 | Wave circles the other way | Chase reversed, outer beams on downbeats, repeaters join | Purple → cyan |
| 1:41-1:43 | Riser | 7 | Acceleration | As before | |
| 1:43-1:45 | A cappella | 3→0 | Only the voice | After the 102.56 hit, only DRL and screen follow the voice; black just before the drop | Screen tracks the vocal envelope |
| 1:45.8-2:10 | Drop 2 (with vocals; 105.14/105.33 pickups stay dark, slam on the 105.76 downbeat) | 9 | Riptide: diagonal front/rear | Kick outerL+tailR, clap brake+reverse, kick outerR+tailL, clap brake+plate; amber chase on off-beats; DRL sings with the vocal; inner beam swell each 8 bars. Fill bar 113.8 strips down | Screen alternates cyan/purple per beat with vocal brightness. U side swaps on claps |
| 2:09-2:11 | Break | 2 | Inhale | Exterior black; one rising swell | Screen rises purple → cyan, black before the slam |
| 2:11-2:24 | Drop 3a | 10 | Everything | Drop 1 mapping + chase + repeaters, mirrors fold. Fill bar 139.4 | Screen 8th strobes cyan/purple |
| 2:24-2:37 | Drop 3b | 9 | The wave sweeps around the car | Per beat a sweep front-left → front-right → rear-right → rear-left; inner beams each bar | Screen strobes, U crest sweeps |
| 2:37-2:46 | Drop 3c, climax | 10 | Densest | 16th repeaters/plate, outer beams every beat, DRL held, brake on claps, accelerating strobe in the last bar | Screen 16th strobe cyan/purple |
| 2:46-2:58 | Outro | 5→2 | The tide goes out again | Half-time: brake on kicks, tails on snare, DRL on vocals, front turns with bass; layers leave; mirrors unfold | Purple → cyan, dimming |
| 2:58-3:00 | Final image | 2→0 | Last glow | DRL, inner beams and tails fade/hold on the last vocal, then a 2 s fade to black | Screen and U glow cyan/purple blend, fade out |

Intensity shape: 7 → 7 → 8 → 0 → **9** → 3 → 1 → 4 → 7 → 0 → **9** → 2 → **10** → 4 → 0.
The song starts strong (owner's note), so the opening runs near drop level with its own motifs
(ripples, surf, rising tide) and no four-on-the-floor outer beams; the drop steps up through the
dark pocket, the kick/clap mapping and density. Three peaks, each preceded by a dark pocket; two
valleys; a quiet ending. The critique's correlation drops because the analyzer rates the intro low.

## Dance moves (closures; unverified on this car, timings from Tesla docs)

| Time | Move |
|---|---|
| 37.1 | All four windows down (~4 s), open as drop 1 lands at 41.1 |
| 41.13 | Mirrors fold on the drop |
| 64.16 | Mirrors unfold, windows up through the breakdown |
| 101.1 | Windows down again for drop 2 (105.1) |
| 129.0 | Windows up in the break |
| 131.33 | Mirrors fold on drop 3 |
| 142.96 | Trunk opens (14 s), fully up at the climax 156.96 |
| 155.0 | Charge port opens |
| 156.96-160.16 | Window dance, all four, 2 bars |
| 156.96-163.36 | Charge port dance (4 bars) |
| 166.56 | Mirrors unfold, charge port closes |
| 174.56 | Trunk closes (4 s), shut by 178.6 before the final fade |

Per window: 2 open, 2 close, 1 dance (limit 6). Trunk 2, charge port 3, mirrors 4. Dancing:
4 x 3.2 s windows + 6.4 s port = 19.2 s. Ends with everything closed and mirrors unfolded.
