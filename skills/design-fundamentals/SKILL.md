---
name: light-show-design-fundamentals
description: Core craft for designing a Tesla light show that feels human-made. Read before choreographing any song.
---

# Light show design fundamentals

A show is a performance of the song, not a visualizer. Every light should be doing
something on purpose, or be dark on purpose.

## The failure mode to avoid

AI-generated shows tend to have the same problems: every light switches on and off
on the beat, the headlights stay on most of the time, and left and right always
match. Measured on two such shows: headlights on 55-80% of the runtime, no fades,
no closures, and four headlight channels moving as one block. It reads as noise,
because nothing is ever withheld.

## Principles

1. **Darkness is the canvas.** Default state is off. A light being on should mean
   something. Aim for exterior lights to be on well under half the time across the
   whole show, and much less in quiet sections.

2. **Contrast over intensity.** A drop only hits if the bars before it were sparse.
   Build every peak by first removing light. The last half-bar before a drop is often
   best fully dark.

3. **One idea per phrase.** Pick a motif for each 4- or 8-bar phrase (a left-right
   ping-pong, a front-to-back chase, a breathing fade) and develop it. Change motif
   when the music changes, not more often.

4. **Map instruments to lights, consistently.** The audience learns the mapping and
   then enjoys it. Decide per song, for example:
   - kick: brake / rear group, or main beams
   - snare or clap: DRL strips or turn signals, alternating sides
   - hats and fast percussion: side repeaters, plate, short flashes
   - vocals and melody: lights that can fade (DRL, inner main beam, turns)
   - pads, swells, risers: slow ramps and interior color
   - bass: tails, low rear lights, interior pulse

5. **Use space.** The car has a left, a right, a front, a back and an inside. Motion
   between them is the most expressive tool there is:
   - call and response: left answers right, front answers rear
   - sweeps: front-left → front-right → rear-right → rear-left
   - convergence: outside-in on a build, inside-out on a release

6. **Every moment must read from one end.** Most people watch from the front or from
   the rear, not both. Whenever music is playing, something visible from each end
   should be moving, at least once a bar. When an idea lives at one end (a rear
   heartbeat, a front glow), give the other end a quieter answer. The compiler's
   critique flags any stretch where one end is fully dark for more than a bar.

7. **Use time, not just on/off.** Fades are emotional, snaps are rhythmic. Use slow
   fade-ins for swells and vocals, instant on for hits, and fade-outs as decay after
   a hit, like a cymbal ringing.

8. **Strobes are spice.** Fast flashing is the loudest thing a car can do. Save it
   for climaxes, risers and the final seconds of a build, in bursts of 1-4 bars.
   More than that numbs the viewer.

9. **Closures are dance moves, and they are exclamation marks.** Mirrors fold,
   windows drop and shimmy, the charge port opens and dances. They move slowly and
   have strict budgets, so use them for structural moments (the first drop, the final
   chorus, the ending), timed so the motion lands on the moment, never as rhythm.
   See the car's skill file for each move.

10. **The screen is the lead instrument.** It's the largest, brightest, full-color
    light on the car, visible through the glass from the front and both sides, and it
    floods the whole cabin. Treat it like the lead in the band: it carries the color
    story of the song and the biggest rhythmic moments, in every section. Breathe it
    in quiet parts, pulse it with the groove, strobe it at the peaks, change its color
    with the music. A show where the screen is mostly dark wastes the best light the
    car has.

11. **Respect the song's color theme.** When a song has a theme (Grief is red and
    black, which means red and white in light; Tidal Wave is cyan and purple), the
    interior uses only those colors and blends of them. Variety then comes from
    brightness, timing and movement, not new hues. The exterior is never themed.

12. **Cabin accents move around the screen.** The accent strips are separate
    segments: sweep along them, swap sides, answer front with rear, usually in a
    color that complements the screen. Driving them all as one block wastes them.

13. **Endings matter.** End on a deliberate final image (everything on, held, then a
    slow fade; or one last hit and instant black), not mid-pattern.

## Process

1. Listen through the analysis: sections, energy curve, where the drops and breaks
   are, which stems lead each section.
2. Write a section plan: for each section, its feeling, its motif, its light
   mapping, its intensity (0-10) and its color. Check that intensity has a shape
   across the whole show: builds, peaks, valleys. No flat plateaus.
3. Choreograph section by section. Re-use motifs with variation when sections repeat.
4. Critique against these principles: duty cycle, contrast before drops, idle
   lights, sync to hits, budget use. Then revise.
5. Hand it to a human for notes. They are the final judge.

## Car-specific technique

Read the car's profile in `profiles/` and the matching file in `skills/vehicles/`
before choreographing. What a light can do (on/off, ramp codes, full brightness, RGB)
changes how each idea has to be expressed.
