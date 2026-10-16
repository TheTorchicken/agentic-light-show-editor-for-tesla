# Viewer

A local web app for reviewing shows. `npm run view`, then open http://localhost:4173/.

- **Home**: every show in `shows/`, grouped by car, with theme colors and review status.
- **3D**: the car model with every light placed on its real lamp, the cabin accents and
  screen lighting the interior, mirrors, windows, trunk and charge port moving as the show
  commands. Studio or night parking garage. Camera presets, drag to orbit.
- **2D**: a flat front/rear/interior diagram (works without a 3D model).
- **Timeline**: one row per light and per moving closure, beats, sections, notes.
- **Notes**: select lights and a time range, write what should change. Notes are saved to
  `workspace/<slug>/notes.json` for the agent to address.
- **Test moves**: preview each closure outside the show.

The viewer shows what the car will do, not the raw channel values: it renders the
simulation in `packages/show/src/simulate.ts`, which uses the behavior measured by the probe.
