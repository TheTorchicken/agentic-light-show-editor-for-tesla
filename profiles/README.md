# Car profiles

One file per car: which channels exist, what each light can do (on/off, ramp codes,
full brightness, RGB, closure), where it sits for the 2D view (`shapes`) and the 3D
view (`shapes3d`). Built from probe results; see `docs/PROBE.md`.

## 3D models

The 3D viewer loads the car model named in `view3d.model` (a `.glb` or `.gltf` under
`workspace/models/`). Models are not committed: download them yourself and keep their
license and credit in `view3d.modelSource`. Without a model, the viewer shows a simple
stand-in body; the lights work the same either way.

Light positions in `shapes3d` use a normalized car frame, so they fit any model of
that car: x runs from -1 (rear) to +1 (front), y from 0 (ground) to 1 (roof), z from
-1 (car's left) to +1 (car's right). The viewer finds the front from the model's headlight
and taillight parts; if a model doesn't name them and loads backwards, set
`view3d.fit.flipFront` to true.

| Profile | Model | License |
|---|---|---|
| `model3-2027.json` | [2024 Tesla Model 3 + Interior](https://sketchfab.com/3d-models/2024-tesla-model-3-interior-61ddcbdbd3854c239e0c95bf60b00022) by tonielpro520 (download as glTF, put the unzipped folder at `workspace/models/model3-2027/`) | CC BY 4.0 |
