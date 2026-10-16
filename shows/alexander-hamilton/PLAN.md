# Alexander Hamilton (Hamilton, Original Broadway Cast): show plan

Car: 2027 Model 3. File 236.8 s; music ends with the last hit at 3:53.4.

## How the music was read

- **Tempo changes.** The analyzer reports 136 BPM for the whole song. That holds only from
  about 1:50: the first half runs at **128 BPM** (one snap per bar every 1.87 s on the drum
  stem, 0:05-1:45), the second at **136 BPM** (bar 1.77 s). The analyzer's beat list follows
  the change, and strong drum-stem hits land within ±10 ms of its beats in every 10 s
  window. So show.ts uses `s.beats()`/`s.downbeats()`, and treats the 136 figure as a
  label only.
- **Drum hits** come from the drum stem (`data.ts`, generated once): kicks from a low-band
  onset curve, snares/hats from a high band with kicks removed, and all strong peaks
  (the once-a-bar snap, the stabs, the rolls). In the groove the snare backbeat falls on
  beat 3 of the analyzer's bar (half-time feel).
- **Voices**: pitch and level of the vocal stem (pyin) mark where the narrator changes
  (median pitch moves 180 → 205 → 130-160 → 200 → 250-350 Hz), the long held note
  (steady ~370 Hz, 1:34-1:44), and the four solo voices of the roll call near the end.
- **Silences/darkness**: 1:45.7-1:49.5 is nearly silent; the drums stop for one bar at
  2:57; 3:31.6-3:32.5 and 3:46.0-3:46.4 are breaths before the roll call and the finale.

## Casting (kept across the song)

| Who | Lights |
|---|---|
| Narrator 1 (0:03-0:20) | Left side: left DRL breathes each bar, left tail and amber answer; left half of the cabin U |
| Narrator 2 (0:20-0:34) | The same on the right side |
| Narrator 3, bass enters (0:34-0:44) | The rear: tails lub-dub on every beat, brake + reverse on the snap; front breathes both DRLs |
| Narrator 4, "the hurricane" (0:44-0:56) | Amber travelling diagonally round the car on every beat |
| Hamilton (0:56-1:14) | The headlights: eyes open on his entrance, then DRL blinks and inner-beam swells alternate by bar; screen white |
| The company / ensemble | Everything: whole sides swap on kicks, all ends strobe |
| Roll call voices (3:32-3:46) | Voice 1 the left side, voice 2 the right side, voice 3 the eyes (DRL + inner), voice 4 the rear in red, with one "shot" at the front |

Musical mapping inside that: snap/snare → brake (rear) and DRL or amber (front); kick →
outer beam + same-side tail, alternating sides; eighths → amber diagonal; 16ths → repeaters
and plate (only in the dense sections); stabs → whole-car slams with black in between;
rolls and risers → accelerating strobes front vs rear.

Interior: only the owner's theme, gold `#ffb81c` and white (gold and black; black is
darkness). Gold is the story, white is Hamilton and the biggest hits, the gold-white blend
fills in. The screen leads every section; the five accents move (along the U, side swaps,
front/rear answers, outside-in on Hamilton's bars), never as one block except on single
downbeat flashes.

## Sections

| Time | Section | Int. | Motif | Light mapping | Interior color |
|---|---|---|---|---|---|
| 0:00-0:03.5 | Overture stabs + pickup | 8 | Four slams | Each stab a different big group (front, rear, beams+brake, everything), snare pickup on repeaters/brake | Screen white slams over gold; accents converge/diverge per stab |
| 0:03.5-0:20 | Narrator 1 | 3 | Left side speaks | Left DRL breathes per bar, brake + left amber on the snap, piano on plate / left rear amber | Screen gold following the voice, white on snaps; left U pulses on beats |
| 0:20-0:34 | Narrator 2 | 3 | Right side speaks | Mirror of the above | Screen gold→blend following the voice |
| 0:34-0:44 | Narrator 3 (bass in) | 4 | The rear speaks | Tails every beat, brake+reverse on snap, DRLs breathe, amber each bar | Screen gold beat pulses, white snaps; front/rear U answers |
| 0:44-0:56 | Narrator 4 | 5 | Hurricane | Amber diagonal per beat, outer+brake on snap, DRL per bar alternating | Screen gold/blend beats, white snaps; U ring |
| 0:56-1:14 | Hamilton's build | 6 | Eyes open | DRL opens on the entrance then blinks every other bar, inner swells between, outer+brake+reverse on snaps, tails per beat, repeaters eighths in last 4 bars | Screen white rising with his voice; U outside-in each bar |
| 1:14.2-1:14.5 | Breath | 0 | Black | — | Black |
| 1:14.5-1:19.5 | "Just you wait" | 8 | Six stabs | Front, rear, left side, right side, beams+rear, everything; black between | Screen white/gold hits from black |
| 1:19.5-1:30.7 | Childhood | 2 | Bare | DRL per vocal phrase, one rear amber per bar | Dim gold following the voice; U side to side |
| 1:30.7-1:34.5 | Illness stabs | 6 | Hits | Beams + rear, side-to-side stabs | White hits |
| 1:34.5-1:45.7 | The held note | 3 | Long glow | DRL 2 s fade in, hold, 2 s fade out; tails on snaps | Screen breathing gold→white each bar; U converge/diverge |
| 1:45.7-1:49.5 | Silence | 0 | Darkness | All off | Gold ember fades to black |
| 1:49.5-2:00.6 | Bass swells | 6 | Three surges | Each swell: inner+DRL+brake+tails on, 2 s decay; DRL per bar between | Screen white flash, gold decay, then follows the voice |
| 2:00.6-2:04.2 | Drums enter | 7 | Front/rear hits | Outer vs brake+tails alternating | White/gold hits |
| 2:04.2-2:14.6 | Build | 5→8 | Layers arrive | Brake on bars, repeaters on hats, tails/repeaters eighths, plate 16ths, inner swell, accelerating strobe | Screen kicks brighter each bar, white snares, white strobe |
| 2:14.6-2:14.8 | Breath | 0 | Black | | |
| 2:14.8-2:29 | Groove A1 | 8 | Kick crosses the car | Everything on at the drop (mirrors fold); kicks outer+tail alternate; snare brake + DRL; diagonal per beat; DRL breathes per bar | Gold kicks, white snares; U ring on eighths |
| 2:29-2:43 | Groove A2 | 8 | Faster | Diagonal on eighths, repeaters, reverse on snare, inner on bars | Plus white downbeats; U side swaps |
| 2:43-2:57 | Groove B | 9 | Sides swap | Whole left/right side on kicks, inner on snares, DRL breathes per bar alternating sides, 16ths | Screen cycles gold→blend→gold→white per bar |
| 2:57-2:59 | Company shout (drums out) | 5→ | Dark, rising strobe | Accelerating repeaters/brake, DRL fades in | Screen climbs to white, strobe |
| 2:59-3:00.7 | Peak | 10 | Whole-car strobe | 16th strobe of everything, then breath | White/gold strobe |
| 3:00.7-3:15 | Company | 9 | All in | Side swaps on kicks, inner on snares, DRL hit on each downbeat, diagonal eighths, 16ths; charge port opens | White over gold; U ring 16ths, white downbeats |
| 3:15-3:29 | Pumping bass | 9 | Front/rear pump | Tails + amber on eighths, outer on kicks, brake+inner on snares; charge port dances | Gold/white eighths; U front/rear answers |
| 3:29-3:32.5 | Strip down | 4→0 | Fade | Brake on snares, DRL fades; charge port closes; black half bar | Gold fading |
| 3:32.5-3:46 | Roll call | 6 | Each voice its own zone | Left side, right side, the eyes, the rear red with one shot; black after | Screen per voice: gold, white, blend, dim gold + white shot; matching U zone |
| 3:46.4-3:53 | Finale | 10 | The company says his name | Everything on, mirrors fold, hits alternate ends, 16th amber, inner held, accelerating strobe | White/gold strobes; U races |
| 3:53.0-3:53.4 | Breath | 0 | Black | | |
| 3:53.4-3:56.8 | Final image | 10→0 | Last hit, held, fade | Everything on 0.7 s, mirrors unfold, beams and DRL 2 s fade, tails held to 3:54.6 | All white, then a slow fade to black |

Intensity shape: 8 → 3 → 4 → 5 → 6 → 8 → 2 → 6 → 3 → 0 → 6 → 7 → 8 → 0 → 8 → 9 → 10 →
9 → 4 → 6 → 10. Each big entrance (the "just you wait" stabs, the drop, the peak, the
roll call, the finale, the last hit) comes after a moment of darkness.

## Dance moves (closures, unverified on this car)

| Time | Move | Why |
|---|---|---|
| 2:14.8 | Mirrors fold | The drop |
| 2:44.9 → 2:58.9 | Trunk opens (14 s) | Rises through groove B, fully up at the 2:59 peak |
| 2:58.9-3:00.7 | All four windows dance | The peak bar |
| 3:00.7 / 3:01.2 | Front, then rear windows lower (~4 s) | The company enters; their voices pour out |
| 3:00.7 | Charge port opens | |
| 3:14.9-3:24.9 | Charge port dances (10 s) | Pumping bass |
| 3:29.0 | Windows rise; 3:29.3 charge port closes | Strip-down; shut before the roll call |
| 3:32.5 | Mirrors unfold | Roll call |
| 3:46.4 | Mirrors fold; windows dance to 3:49.5 | Finale |
| 3:49.5 | Windows close and trunk closes (4 s each) | Closed by the last hit at 3:53.4 |
| 3:53.5 | Mirrors unfold (~2 s) | Final image; the car ends closed, mirrors out |

Counts: windows 5 commands each (limit 6), trunk 2 (6), mirrors 4 each (20), charge port 3 (3).
Dancing: 4 windows × 4.75 s + charge port 10 s ≈ 29 s.

DRL strips are gestures, not a bed: every DRL use is a phrase fade, an entrance or a hit (duty ~26%, held only through the finale bars). Beds come from the screen.
