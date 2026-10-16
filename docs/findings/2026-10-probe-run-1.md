# Probe run 1 (October 15, 2026)

Three probe videos of a 2027 Model 3, filmed at night with an iPhone. Each was aligned to its probe's
manifest using the three sync flashes at the start and the three at the end. The
alignment drifted less than 25 ms over six minutes.

| Video | Probe | Car | fps | Offset (video − show) |
|---|---|---|---|---|
| IMG_0484 | Front | 2027 Model 3 | 120 | −1.66 s |
| IMG_0485 | Rear | 2027 Model 3 | 120 | −6.36 s |
| IMG_0488 | Interior | 2027 Model 3 | 24 | +27.04 s |

The closures probe was not filmed. A Model Y parked nearby only shows reflections of the Model 3's brake lights, so there is no Model Y data yet.

## Front (Model 3)

The camera was at the car's right-front corner. The near lamp is the right one.

| Ch | Channel | What lit | Behavior |
|---|---|---|---|
| 1/2 | Outer Main Beam | Inner projector element of the headlamp | **On/off only.** Ramp codes act as instant. Above about 50% means on. 20 ms flashes are visible. |
| 3/4 | Inner Main Beam | Main bright projector | **Ramps** (see the table below) |
| 5/6 | Signature | Nothing visible | No signature light on this car |
| 7-12 | Channel 4 / 5 / 6 | The white DRL "eyebrow" strip around the lamp, plus an amber section | All three light the same strip. Combinations light it too (OR). **Ramps.** |
| 13/14 | Front Turn | Amber lower strip of the lamp | **Ramps**, slower and dimmer. Flashes visible down to ~40 ms. |
| 15/16 | Front Fog | Nothing | No fogs |
| 17-20 | Aux Park, Side Marker | Nothing, even in amplified difference images | Not present |
| 21/22 | Side Repeater | Amber light on each front fender; the far one shows as a glow on nearby surfaces | On/off |
| 47-106 | Front light bar | Nothing | **No front bar for shows** |
| 107-110, 167-174 | Unmapped / offroad | Nothing | |

### Ramp codes are reversed from Tesla's README

Measured on the inner main beam and channel 4. The turn signal shows the same order,
more slowly.

| Byte | Tesla README | Measured |
|---|---|---|
| 179 (70%) | turn on, 500 ms | **turn on, ~2000 ms** |
| 204 (80%) | turn on, 1000 ms | turn on, ~1000 ms |
| 230 (90%) | turn on, 2000 ms | **turn on, ~500 ms** |
| 26 / 51 / 77 | turn off, 500 / 1000 / 2000 ms | ~350 / ~1000 / ~2000 ms (matches) |

Tesla's own xLights key bindings agree with the measurement: the "E" key, which the
README calls "Turn on; 500 ms", is set to 90%. The README's turn-on rows are wrong.
The community channel cheat sheets copy the README, so they are wrong too.

A value of 128 (50%) behaves like a slow (~2 s) turn-on. A smooth 0→255→0 ramp
doesn't produce a smooth fade: the light switches on as the value crosses about 50%
and then follows whatever ramp code band the value is in.

## Rear

| Ch | Channel | What lit | Behavior |
|---|---|---|---|
| 23/24 | Rear Turn | Amber part of that side's C-shaped tail, plus small amber bumper lights | On/off |
| 25 | Brake | Both tails, the wide center high-mount bar, lower bumper red | On/off |
| 26/27 | Tail | That side's C-shaped tail, plus both lower bumper red lights | On/off |
| 28 | Reverse | White lower lamps | On/off |
| 29 | Rear Fog | Red lower lamps | On/off |
| 30 | License Plate | Plate light | On/off |
| 111-162 | Rear light bar | Nothing | **No rear bar for shows** |
| 163-166 | Unmapped | Nothing | |

Every rear light is on/off. Ramp codes and mid values act as instant on.

## Interior

Filmed from the back seat, looking forward. The right side of the cabin wasn't in view.

| Ch | What lit | Color order |
|---|---|---|
| 176-178 | Center screen. It's bright enough to flood the whole cabin with color. | R, G, B |
| 179-181 | Lower-left accent strip (left rear door area) | R, G, B |
| 182-184 | Nothing in view (probably the right side) | |
| 185-187 | Dash strip across the front, plus the roof arc | R, G, B |
| 188-190 | Faint; probably the left front door, which was mostly out of view | |
| 191-200 | Nothing in view | |

Interior accents have **full brightness control**: the roof arc tracked a 0→255
ramp smoothly.

## Still to measure

- Right-side interior segments.
- The closures probe.
- All four probes on the 2026 Model Y, which should test the community light-bar map.
