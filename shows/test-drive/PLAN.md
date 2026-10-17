# Test Drive (John Powell, How to Train Your Dragon): show plan

**Routing:** `skills/genres/cinematic-orchestral.md` (with design-fundamentals and the
Model 3 file). `route.py`: the "other" stem (strings, brass, choir) is 78% of the mix and present
85% of the time, voice 1%, drums 7% (12% presence). It is an orchestral film cue with no kit,
so phrases and set pieces lead, not onsets.

Car: 2027 Model 3. File 156.9 s. The music ends with the final hit at 2:27.3 and its decay.

## Why the first draft failed, and what changed

The first draft was one texture for the whole piece: small amber and red ticks on every
onset, the DRLs on more than half the time as a background glow, the main beams in tiny flashes, and the
big moments barely brighter than the bars around them (light dynamic range 2.2x). This
version gives each section a set piece with a motif no other section uses. Quiet passages
are near dark. The main beams carry the theme. No light is left on as a bed. The five
big moments come out of darkness as the whole car and are the five brightest moments of
the show (1 s exterior average 0.62-0.89; nothing else reaches 0.5).

## How the music was read

- Tempo: 111 BPM (0.539 s beat, 2.165 s bar), checked by onset autocorrelation. From about
  1:45 it drifts to roughly 116 BPM. The analyzer's beats follow the drift. They are used
  only for bar and phrase starts.
- Hits come from `data.ts`, generated once from the stems: `DRUM` (timpani and big drums, with
  loudness) and `ORCH` (brass and string attacks). Big moments were checked on the RMS curve
  at 0.25 s resolution.
- Darkness in the music: 1:00.6-1:02.0 (a held breath), 1:21.5-1:24 (hush),
  2:22.3-2:26.2 (the orchestra stops).

## Interior palette (no theme given)

Sea and sky: ocean blue `#00288c`, open-sky cyan `#00aaff`, brass and sun gold
`#ffc346`, cloud white for peaks, twilight indigo `#4619b9` for hushes, sunset `#ffaf69`
for the ending. Set through `s.palette(defaults)`; no theme in show.json.

## Set pieces

| # | Set piece | Time | Motif (unique to it) |
|---|---|---|---|
| 1 | The ostinato | 0:02-0:30 | Drums throw the car side to side: each main hit lights one whole side (outer beam + tail), its pickup flicks the opposite repeater. Otherwise dark. |
| 2 | The choir rise | 0:30-0:41 | Everything off, then one layer per bar on ramps around the car (front left amber, front right amber, DRLs, inner beams), cabin U fills outside-in, strobe, black, pickup |
| 3 | First flight | 0:41-0:58 | Each two-bar phrase is one sweep around the car (front left → front right → rear right → rear left), held lights handing over, direction turning each phrase |
| 4 | The brass duel | 1:04-1:21 | Front against rear: drum pickups at the rear (brake, reverse, tails, fog), main hits at the front (both outer beams + inner ring-out). Dark between |
| 5 | Over the sea | 1:35-1:50 | Amber only: each brass attack is one diagonal (front turn ramps, opposite rear turn holds); inner beams breathe on two swells |
| 6 | Rising sun | 1:54-2:02 | The car breathes one side at a time: a slow wash down the whole side per bar |
| 7 | The grand theme | 2:02-2:20 | Main beams carry it: inner beams held per phrase, outer beams join and hold in the second half, both tails held per bar, brass on the outer beams |

The big moments are not set pieces. Each one is "darkness, then everything": the
leap (1:03.5), the climax (1:30.0), the second peak (1:53.2), the last crescendo (2:20-2:22.3),
and the final hit (2:27.3).

## Sections

| Time | Section | Int. | Light mapping | Interior color |
|---|---|---|---|---|
| 0:00-0:02 | Ignition | 5 | DRL 1 s fade with the swell; outer+brake, then beams+rear on the double hit | Screen black → sky cyan, white on hits; U converges |
| 0:02-0:30 | 1 Ostinato | 3 | Side-to-side single-side hits; from 0:19 a slow amber wash per bar | Screen breathes ocean blue per bar, cyan/white on drums; the hit side of the U flares |
| 0:30-0:41 | 2 Choir rise | 2→7 | Layers join per bar on 2 s ramps, tails held as they join; accelerating strobe; black 0:40.0-0:40.6 | U fills outside-in indigo → ice; screen indigo → cyan, strobe, black |
| 0:41-0:58 | 3 First flight | 6 | Corner sweeps per phrase; inner beams on the 0:43 and 0:51 swells; outer + brake on brass | Screen swells once per phrase, cyan warming to gold; U corner follows the sweep |
| 0:58-1:03 | The leap (BIG 1) | 8→0→10 | Fill alternates ends; black 1:00.6-1:02.0; three pickups grow; everything 0.4 s + 0.7 s strobe, 2 s ring-out | Gold, black, cool pickups, all white |
| 1:04-1:21 | 4 Brass duel | 6 | Front hits / rear hits; the two biggest drums hit both ends | Screen gold and ocean trade each bar, white on front hits, cyan on rear; U front arc vs rear pair |
| 1:21-1:24 | Hush | 1 | One DRL breath, a tail, a rear amber | Indigo breath on screen and center accent |
| 1:24-1:30 | Takeoff | 3→9 | DRL 2 s ramp, roll on tails/brake, amber fade, inner join, accelerating strobe, 0.25 s black | Indigo → ice → white; U converges faster |
| 1:30-1:35 | Climax (BIG 2) | 10 | Everything + strobe; then outer and inner beams and DRL held, amber on eighths, brake every beat | White, then sky with white beats; U races |
| 1:35-1:50 | 5 Over the sea | 5 | Amber diagonals per brass attack; inner breathes twice; brake on the loudest drums | Screen per bar through ocean, sky, gold, violet; gold wave on the U |
| 1:50-1:54 | Second peak (BIG 3) | 7→0→10 | DRL fade, strobe, inner fade, black 1:52.35, pickup, everything + strobe | Sky → white, black, white |
| 1:54-2:02 | 6 Rising sun | 4 | Side washes per bar; one inner swell | Sunset following the swell; U side follows the wash |
| 2:02-2:20 | 7 Grand theme | 9 | Beams held per phrase, tails held, outer on brass; amber sweeps per bar in the second half; dark half bar before 2:20 | Screen full gold / sky per bar, white on brass; U rolls on beats, then eighths |
| 2:20-2:22 | Last crescendo (BIG 4) | 10 | Hits alternate ends, then 70 ms strobe of everything over held beams | White/gold strobe; U white |
| 2:22-2:26 | Silence | 1 | Tail tick and one DRL breath per soft pulse | Indigo embers |
| 2:26-2:32 | Final hit (BIG 5) | 10→0 | Two pickups, 0.15 s black, everything 0.8 s, 2 s fade, tails held to 2:29.6 | White → sunset → black, U fades rear to center |

Exterior light energy by analyzer section: 0.09 opening, 0.19 first flight, 0.12 duel,
0.12 hush+takeoff, 0.20 climax/sea, 0.13 rising sun, 0.31 grand theme + crescendo
(dynamic range 3.4x).

## Dance moves (closures, unverified on this car)

Windows stay down while music plays (the music comes only from the cabin speakers). They
go down at 0:00 and move only by dancing. Each dance is one full 2.2 s swing, partway up
and back down. They close at 2:32.5, after the music has ended and before the audio ends at 2:36.9.

| Time | Move | Lands on |
|---|---|---|
| 0:00 → 0:04 | All four windows down; mirrors fold (land 0:02) | The ignition hit |
| 0:28.9 → 0:30.9 | Mirrors unfold | The choir rise |
| 1:01.5 → 1:03.5 | Mirrors fold | The leap |
| 1:03.5-1:05.7 | Front windows swing | The leap |
| 1:16 → 1:30 | Trunk opens (14 s) | The climax |
| 1:21.9 | Mirrors unfold | The hush |
| 1:28.0 / 1:28.5 | Mirrors fold, left then right | A nod into the climax |
| 1:30.0-1:32.2 | All four windows swing | The climax |
| 1:34.9 | Mirrors unfold | Over the sea |
| 1:51.2 → 1:53.2 | Mirrors fold, charge port opens | The second peak |
| 1:53.2-1:55.4 | Rear windows swing | The second peak |
| 1:54.5 | Mirrors unfold | Rising sun |
| 2:02.6-2:06.6 | Charge port dances | The grand theme |
| 2:16.0 → 2:18 | Charge port closes | |
| 2:19.6 → 2:21.6 | Mirrors fold | The last crescendo |
| 2:20.05-2:22.25 | All four windows swing | The last crescendo |
| 2:22.4 | Trunk closes (4 s), mirrors unfold | The silence |
| 2:25.3 → 2:27.3 | Mirrors fold | The final hit |
| 2:28.6 → 2:30.6 | Mirrors unfold | |
| 2:32.5 → 2:36.5 | All four windows up | After the music; the car ends closed, mirrors out |

Counts: windows 5 each (limit 6), mirrors 12 each (20), trunk 2 (6), charge port 3 (3).
Dancing: 12 window swings × 2.2 s = 26.4 s plus the port 4 s ≈ 30 s.

## Checks

`workspace/test-drive/lanes.py test-drive workspace/test-drive/lanes.png` draws the lanes. The
sections look different from each other, and its six brightest 1 s windows are the five big moments plus the
end of the choir rise (0.48, below every big moment).
