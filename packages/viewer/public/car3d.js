// 3D car view: a glTF model of the car (or a stand-in body when none is installed),
// with every light from the profile placed in a normalized car frame and fitted to
// the model's bounding box. Lights glow through bloom, and the brightest groups
// spill real light onto the body, the cabin and the ground.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();

// World size of the normalized frame when no model is loaded (a Model 3 is
// about 4.72 m long, 1.85 m wide, 1.44 m tall).
const DEFAULT_BOX = { x: 2.36, y: 1.44, z: 0.925 };

export class Car3D {
  constructor(canvas, profile, onStatus = () => {}) {
    this.canvas = canvas;
    this.profile = profile;
    this.onStatus = onStatus;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050608);
    this.scene.fog = new THREE.Fog(0x050608, 9, 22);
    this.camera = new THREE.PerspectiveCamera(38, 2, 0.05, 100);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.6, 0);
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 14;

    // Night lighting: a dim studio environment for paint reflections, a cool moonlight
    // key and a faint fill, so the body reads without washing out the show lights.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.hemi = new THREE.HemisphereLight(0x8090b0, 0x101014, 0.6);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xb8c8ff, 0.9);
    this.moon.position.set(3, 6, -4);
    this.scene.add(this.moon);
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.55, metalness: 0.1 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    this.garage = parkingGarage();
    this.scene.add(this.garage);

    this.box = { ...DEFAULT_BOX };
    this.lights = []; // { id, meshes, color, rgb }
    this.parts = []; // model lamp pieces driven by lights: { mesh, ids, mode }
    this.moving = []; // closures: { id, kind, pivot, foldDeg, drop, flap, led }
    this.spill = []; // { light: THREE.PointLight, ids, base }
    this.carRoot = new THREE.Group();
    this.scene.add(this.carRoot);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // High threshold: only the show lights (drawn far above white) bloom, not paint or glass.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 256), 0.55, 0.25, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.setView("front-corner");
    this.setEnvironment("studio");
    this.loadCar();
  }

  /** Normalized car frame -> world coordinates. */
  toWorld([x, y, z]) {
    return new THREE.Vector3(x * this.box.x, y * this.box.y, z * this.box.z);
  }

  async loadCar() {
    // encodeURI keeps the slashes, so a .gltf finds its .bin and textures next to it.
    const url = this.profile.view3d?.model ? `/model/${encodeURI(this.profile.view3d.model)}` : null;
    let loaded = false;
    if (url) {
      try {
        const head = await fetch(url, { method: "HEAD" });
        if (head.ok) {
          const gltf = await new GLTFLoader().loadAsync(url);
          this.fitModel(gltf.scene);
          this.bindModelParts(gltf.scene);
          this.bindClosures(gltf.scene);
          loaded = this.hasModel = true;
          const src = this.profile.view3d.modelSource;
          this.onStatus(src ? `Model: "${src.title}" by ${src.author} (${src.license})` : "Model loaded");
        }
      } catch (e) {
        console.warn("Could not load car model", e);
      }
    }
    if (!loaded) {
      this.carRoot.add(standInBody(this.box));
      this.onStatus("Stand-in body. Add the car model to show the real car.");
    }
    this.buildLights();
  }

  fitModel(model) {
    const fit = this.profile.view3d?.fit ?? {};
    model.rotation.y = ((fit.rotateY ?? 0) * Math.PI) / 180;
    model.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    // Make the car's length run along x.
    if (size.z > size.x) { model.rotation.y += Math.PI / 2; model.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(model); }
    // Find the front: headlight parts should be at +x and taillight parts at -x. If
    // the model names its parts, trust that; otherwise fall back to the profile flag.
    const centerX = (re) => {
      const xs = [];
      model.traverse((o) => { if (o.isMesh && re.test(`${o.name} ${o.material?.name ?? ""}`)) xs.push(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).x); });
      return xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : null;
    };
    const head = centerX(/head ?light/i), tail = centerX(/tail ?light/i);
    const backwards = head !== null && tail !== null ? head < tail : !!fit.flipFront;
    if (backwards) { model.rotation.y += Math.PI; model.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(model); }
    // Scale to a real Model 3 length, sit it on the ground, center it.
    const s = (DEFAULT_BOX.x * 2) / box.getSize(new THREE.Vector3()).x;
    model.scale.multiplyScalar(s);
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    model.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    const sz = box.getSize(new THREE.Vector3());
    // The bounding box includes the mirrors; light positions are relative to the
    // body, so cap the width at a Model 3's body proportion (1.85 m / 4.72 m).
    this.box = { x: sz.x / 2, y: sz.y, z: Math.min(sz.z / 2, (sz.x / 2) * (1.85 / 4.72)) };
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = false;
      // Lamp lenses in the model would otherwise glow on their own; ours do that.
      const m = o.material;
      if (m && "emissiveIntensity" in m) m.emissiveIntensity = 0;
      // Dark tinted glass, so the cabin and the screen show through like the real car.
      if (m && /glass|window/i.test(m.name) && !/head ?light|tail ?light/i.test(m.name)) {
        o.material = new THREE.MeshPhysicalMaterial({ color: 0x07090c, roughness: 0.3, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false });
      }
      // Lamp lenses: nearly clear, so the lit lamp parts behind them show through.
      if (m && /(head|tail) ?light_?glass/i.test(m.name)) {
        o.material = new THREE.MeshPhysicalMaterial({ color: /tail/i.test(m.name) ? 0x3a0606 : 0x9aa2ad, roughness: 0.02, transparent: true, opacity: 0.12, depthWrite: false });
      }
    });
    this.carRoot.add(model);
  }

  /**
   * Light the model's own lamps. Each rule in view3d.modelParts picks one connected
   * piece of a material (the one nearest `near`) and the lights that drive it.
   */
  bindModelParts(model) {
    const rules = this.profile.view3d?.modelParts?.rules ?? [];
    const materials = new Set(rules.map((r) => r.material));
    const pieces = []; // { mesh, material, center }
    const meshes = [];
    model.traverse((o) => { if (o.isMesh && materials.has(o.material?.name)) meshes.push(o); });
    for (const mesh of meshes) {
      for (const geo of splitComponents(mesh.geometry)) {
        const piece = new THREE.Mesh(geo, mesh.material.clone());
        piece.matrixAutoUpdate = false;
        piece.matrix.copy(mesh.matrixWorld);
        piece.matrixWorld.copy(mesh.matrixWorld);
        const c = geo.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
        pieces.push({ mesh: piece, material: mesh.material.name, center: [c.x / this.box.x, c.y / this.box.y, c.z / this.box.z], verts: new Set(geo.index.array).size });
      }
      mesh.visible = false;
    }
    const byMesh = new Map();
    for (const r of rules) {
      let best = null, bestD = Infinity;
      for (const p of pieces) {
        if (p.material !== r.material) continue;
        let d = Math.hypot(p.center[0] - r.near[0], p.center[1] - r.near[1], p.center[2] - r.near[2]);
        if (r.verts) d += 0.05 * Math.abs(Math.log(p.verts / r.verts));
        if (d < bestD) { best = p; bestD = d; }
      }
      if (!best || bestD > 0.25) { console.warn("No model part for rule", r); continue; }
      if (!byMesh.has(best)) byMesh.set(best, { ...best, ids: new Set(), mode: r.mode ?? "glow" });
      r.lights.forEach((id) => byMesh.get(best).ids.add(id));
    }
    for (const p of pieces) this.carRoot.add(p.mesh);
    for (const part of byMesh.values()) {
      if (part.mode === "glow") {
        part.mesh.material = new THREE.MeshBasicMaterial({ color: 0x16181d, toneMapped: false });
      } else {
        // "illuminate": keep the surface (e.g. the plate) and light it up.
        const m = part.mesh.material;
        m.emissive = new THREE.Color(0, 0, 0);
        m.emissiveIntensity = 1; // fitModel zeroed it for every material
        if (m.map) m.emissiveMap = m.map;
      }
      part.mesh.userData.id = [...part.ids][0];
      if (part.mode === "strip") this.addStrip(part);
      this.parts.push(part);
    }
    this.addScreenLight();
    this.modelLit = new Set(this.parts.flatMap((p) => [...p.ids]));
  }

  /**
   * Thin ambient strips: thicken the model's own strip by tracing its centerline
   * (so the light follows the real curve of the trim), and add soft lights along it
   * that wash the nearby panels.
   */
  addStrip(part) {
    part.mesh.material = new THREE.MeshBasicMaterial({ color: 0x16181d, toneMapped: false });
    const curve = stripCenterline(part.mesh);
    if (!curve) return;
    // Nudge a few millimeters toward the cabin so the trim doesn't swallow it.
    const pts = curve.getPoints(48).map((p) => p.clone().add(new THREE.Vector3(-Math.sign(p.x) * 0.002, 0.002, -Math.sign(p.z) * 0.004)));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.0045, 8, false), new THREE.MeshBasicMaterial({ color: 0x16181d, toneMapped: false }));
    tube.userData.id = part.mesh.userData.id;
    this.carRoot.add(tube);
    part.extra = [tube];
    // Two soft lights along the strip, set in toward the cabin.
    part.glows = [0.3, 0.7].map((u) => {
      const p = curve.getPoint(u);
      const l = new THREE.PointLight(0xffffff, 0, 0.7, 2);
      // Below the strip and in toward the cabin: it washes the door panel and dash,
      // and stays out of sight lines to the glass, where it would show as a hot spot.
      l.position.copy(p).add(new THREE.Vector3(-Math.sign(p.x) * 0.08, -0.07, -Math.sign(p.z) * 0.14));
      this.carRoot.add(l);
      return l;
    });
  }

  /**
   * Closures that move: model pieces near each closure region are regrouped under
   * a pivot (mirrors fold about a hinge, windows slide down). The charge port has no
   * piece in the model, so it gets an overlay flap and LED.
   */
  bindClosures(model) {
    const defs = this.profile.view3d?.closureParts?.parts ?? [];
    const regions = defs.filter((d) => d.near);
    const norm = (v) => [v.x / this.box.x, v.y / this.box.y, v.z / this.box.z];
    const inRegion = (c) => regions.find((d) => Math.hypot(c[0] - d.near[0], c[1] - d.near[1], c[2] - d.near[2]) <= d.radius);
    const groups = new Map();
    for (const d of regions) {
      const pivot = new THREE.Group();
      if (d.hinge) pivot.position.set(d.hinge[0] * this.box.x, d.near[1] * this.box.y, d.hinge[1] * this.box.z);
      this.carRoot.add(pivot);
      pivot.updateMatrixWorld(true);
      groups.set(d.id, { def: d, pivot, count: 0 });
    }
    const meshes = [];
    model.traverse((o) => { if (o.isMesh && o.visible && o.geometry?.index) meshes.push(o); });
    for (const mesh of meshes) {
      const box = new THREE.Box3().setFromObject(mesh);
      if (!regions.some((d) => box.distanceToPoint(this.toWorld(d.near)) < d.radius * this.box.x)) continue;
      const pieces = splitComponents(mesh.geometry);
      const hits = pieces.map((g) => inRegion(norm(g.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld))));
      if (!hits.some(Boolean)) continue;
      mesh.visible = false;
      pieces.forEach((g, i) => {
        const piece = new THREE.Mesh(g, mesh.material);
        piece.matrixAutoUpdate = false;
        const d = hits[i];
        if (d) {
          const grp = groups.get(d.id);
          piece.matrix.copy(grp.pivot.matrixWorld.clone().invert().multiply(mesh.matrixWorld));
          grp.pivot.add(piece);
          grp.count++;
        } else {
          piece.matrix.copy(mesh.matrixWorld);
          this.carRoot.add(piece);
        }
      });
    }
    for (const { def, pivot, count } of groups.values()) {
      if (count) this.moving.push({ id: def.id, pivot, foldDeg: def.foldDeg, drop: def.drop });
    }
    for (const d of defs.filter((d) => d.box)) this.bindBoxClosure(model, d);
    for (const d of defs.filter((d) => d.overlay)) {
      const c = this.toWorld(d.overlay.center), side = Math.sign(d.overlay.center[2]) || -1;
      const hinge = new THREE.Group();
      hinge.position.set(c.x + d.overlay.w / 2, c.y, c.z); // hinged at its front edge
      const flap = new THREE.Mesh(new THREE.PlaneGeometry(d.overlay.w, d.overlay.h), new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }));
      flap.position.set(-d.overlay.w / 2, 0, side * 0.002);
      hinge.add(flap);
      const led = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.026, 24), new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false, side: THREE.DoubleSide }));
      led.position.set(c.x, c.y, c.z - side * 0.01);
      this.carRoot.add(hinge, led);
      this.moving.push({ id: d.id, hinge, side, led });
    }
  }

  /**
   * A closure the model doesn't separate (the trunk lid): cut every triangle whose
   * center lies in the box out of its mesh, and hinge the cut pieces about a line
   * across the car.
   */
  bindBoxClosure(model, d) {
    const lo = new THREE.Vector3(d.box.x[0] * this.box.x, d.box.y[0] * this.box.y, d.box.z[0] * this.box.z);
    const hi = new THREE.Vector3(d.box.x[1] * this.box.x, d.box.y[1] * this.box.y, d.box.z[1] * this.box.z);
    const region = new THREE.Box3(lo, hi);
    const pivot = new THREE.Group();
    pivot.position.set(d.hinge[0] * this.box.x, d.hinge[1] * this.box.y, 0);
    this.carRoot.add(pivot);
    pivot.updateMatrixWorld(true);
    const meshes = [];
    this.carRoot.traverse((o) => { if (o.isMesh && o.visible && o.geometry?.index && o.parent !== pivot) meshes.push(o); });
    let cut = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (const mesh of meshes) {
      mesh.updateMatrixWorld(true);
      if (!new THREE.Box3().setFromObject(mesh).intersectsBox(region)) continue;
      const pos = mesh.geometry.attributes.position, idx = mesh.geometry.index.array, world = mesh.matrixWorld;
      const inside = [], outside = [];
      for (let i = 0; i < idx.length; i += 3) {
        a.fromBufferAttribute(pos, idx[i]).applyMatrix4(world);
        b.fromBufferAttribute(pos, idx[i + 1]).applyMatrix4(world);
        c.fromBufferAttribute(pos, idx[i + 2]).applyMatrix4(world);
        (region.containsPoint(a.clone().add(b).add(c).multiplyScalar(1 / 3)) ? inside : outside).push(idx[i], idx[i + 1], idx[i + 2]);
      }
      if (!inside.length) continue;
      const lid = mesh.geometry.clone();
      lid.setIndex(inside);
      const lidMesh = new THREE.Mesh(lid, mesh.material);
      lidMesh.matrixAutoUpdate = false;
      lidMesh.matrix.copy(pivot.matrixWorld.clone().invert().multiply(world));
      lidMesh.userData = { ...mesh.userData };
      pivot.add(lidMesh);
      // Lamp pieces keep being driven by the show: move the part onto the lid.
      const part = this.parts.find((p) => p.mesh === mesh);
      if (part && !outside.length) { part.mesh = lidMesh; lidMesh.material = mesh.material; mesh.visible = false; cut += inside.length; continue; }
      const rest = mesh.geometry.clone();
      rest.setIndex(outside);
      mesh.geometry = rest;
      cut += inside.length;
    }
    if (cut) this.moving.push({ id: d.id, pivot, openDeg: d.openDeg });
  }

  /** The screen lights the cabin like a panel: a rectangular area light facing the seats. */
  addScreenLight() {
    const part = this.parts.find((p) => p.ids.has("screen"));
    if (!part) return;
    const box = part.mesh.geometry.boundingBox.clone().applyMatrix4(part.mesh.matrixWorld);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const light = new THREE.RectAreaLight(0xffffff, 0, Math.max(size.z, 0.2), Math.max(size.y, 0.12));
    light.position.copy(c).add(new THREE.Vector3(-0.03, 0, 0));
    light.lookAt(c.x - 1, c.y - 0.15, c.z);
    this.carRoot.add(light);
    part.area = light;
  }

  /** "studio": neutral night studio. "garage": a dark parking garage, lit only by the car. */
  setEnvironment(name) {
    const garage = name === "garage";
    this.envName = name;
    this.garage.visible = garage;
    this.ground.visible = !garage;
    this.scene.background.set(garage ? 0x020203 : 0x050608);
    this.scene.fog.color.set(garage ? 0x020203 : 0x050608);
    this.scene.fog.near = garage ? 6 : 9;
    this.scene.fog.far = garage ? 18 : 22;
    this.scene.environmentIntensity = garage ? 0.04 : 0.18;
    this.hemi.intensity = garage ? 0.06 : 0.6;
    this.moon.intensity = garage ? 0 : 0.9;
  }

  buildLights() {
    for (const l of this.profile.lights) {
      const color = new THREE.Color(l.color ?? "#ffffff");
      const meshes = [];
      const onModel = this.modelLit?.has(l.id) && !(this.profile.view3d?.overlayAlways ?? []).includes(l.id);
      for (const s of onModel ? [] : l.shapes3d ?? []) {
        let geo, pos = null, rot = null;
        if (s.point) { geo = new THREE.SphereGeometry(s.r * this.box.z, 16, 12); pos = this.toWorld(s.point); }
        else if (s.points) {
          const curve = new THREE.CatmullRomCurve3(s.points.map((p) => this.toWorld(p)));
          geo = new THREE.TubeGeometry(curve, Math.max(8, s.points.length * 8), s.r * this.box.z, 8, false);
        } else if (s.rect) { geo = new THREE.PlaneGeometry(s.w * this.box.z, s.h * this.box.y); pos = this.toWorld(s.rect); rot = -Math.PI / 2; }
        else if (s.screen) { geo = new THREE.PlaneGeometry(s.w * this.box.z * 2, s.h * this.box.y); pos = this.toWorld(s.screen); rot = -Math.PI / 2; }
        if (!geo) continue;
        const mat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        if (pos) mesh.position.copy(pos);
        if (rot !== null) mesh.rotation.y = rot;
        this.carRoot.add(mesh);
        meshes.push(mesh);
      }
      this.lights.push({ id: l.id, meshes, color, rgb: l.behavior === "rgb" });
    }
    // A few real lights so bright groups light the body, the cabin and the ground.
    const spill = this.profile.view3d?.spill ?? {};
    const centers = {};
    for (const [group, ids] of Object.entries(spill)) {
      const pts = ids.flatMap((id) => this.profile.lights.find((l) => l.id === id)?.shapes3d ?? []).map((s) => s.point ?? s.screen ?? s.rect ?? s.points?.[0]).filter(Boolean);
      if (!pts.length) continue;
      const avg = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
      // Spill sits low and out from the lamps, so it lights the ground the way real
      // lamps do instead of washing the paint around them.
      const out = group === "cabin" ? [avg[0] - 0.1, avg[1] + 0.05, 0] : [avg[0] + Math.sign(avg[0]) * 0.5, 0.25, avg[2]];
      const pl = new THREE.PointLight(0xffffff, 0, group === "cabin" ? 3 : 3.5, 2);
      pl.position.copy(this.toWorld(out));
      this.carRoot.add(pl);
      this.spill.push({ light: pl, ids, base: group === "cabin" ? 1.6 : group.startsWith("tail") ? 0.8 : 1.6 });
      centers[group] = out;
    }
  }

  setView(name) {
    const views = {
      "front-corner": [[4.6, 1.5, 3.2], [0, 0.6, 0]],
      front: [[6.2, 1.1, 0], [0, 0.6, 0]],
      rear: [[-6.2, 1.2, 0], [0, 0.6, 0]],
      "rear-corner": [[-4.6, 1.5, -3.2], [0, 0.6, 0]],
      side: [[0, 1.3, -6.5], [0, 0.6, 0]],
      top: [[0.01, 7.5, 0], [0, 0.5, 0]],
    };
    const [p, t] = views[name] ?? views["front-corner"];
    this.camera.position.set(...p);
    this.controls.target.set(...t);
    this.controls.update();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (this.canvas.width !== Math.round(w * this.renderer.getPixelRatio()) || this.canvas.height !== Math.round(h * this.renderer.getPixelRatio())) {
      this.renderer.setSize(w, h, false);
      this.composer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  /** levels: id -> 0..1; rgb: id -> [r, g, b] 0..255 for RGB lights. */
  render(levels, rgb, selected, closures = {}) {
    for (const m of this.moving) {
      const c = closures[m.id] ?? { pos: m.foldDeg !== undefined ? 1 : 0, dancing: false };
      if (m.foldDeg !== undefined) m.pivot.rotation.y = ((1 - c.pos) * m.foldDeg * Math.PI) / 180;
      else if (m.openDeg !== undefined) m.pivot.rotation.z = (c.pos * m.openDeg * Math.PI) / 180;
      else if (m.drop !== undefined) m.pivot.position.y = -c.pos * m.drop;
      else if (m.hinge) {
        m.hinge.rotation.y = -m.side * c.pos * Math.PI * 0.55;
        // Charge port LED: green when open, cycling rainbow while dancing.
        const hue = (performance.now() / 600) % 1;
        if (c.dancing) m.led.material.color.setHSL(hue, 1, 0.55).multiplyScalar(2);
        else if (c.pos > 0.5) m.led.material.color.setRGB(0.1, 1.6, 0.3);
        else m.led.material.color.setRGB(0, 0, 0);
      }
    }
    this.resize();
    const byId = {};
    for (const L of this.lights) {
      const k = levels[L.id] ?? 0;
      const c = L.rgb && rgb[L.id] ? new THREE.Color(rgb[L.id][0] / 255, rgb[L.id][1] / 255, rgb[L.id][2] / 255) : L.color.clone().multiplyScalar(k);
      // Off lights stay faintly visible so you can see where they are.
      const shown = k > 0.01 ? c.multiplyScalar(L.rgb ? 1.15 : 1.8) : new THREE.Color(0x15171c);
      for (const m of L.meshes) {
        // On a real model, unlit lights are just part of the car; only show them when lit or selected.
        m.visible = k > 0.01 || selected.has(L.id) || !this.hasModel;
        m.material.color.copy(selected.has(L.id) && k <= 0.01 ? new THREE.Color(0x1d5a80) : shown);
      }
      byId[L.id] = { k, c: L.rgb && rgb[L.id] ? rgb[L.id].map((v) => v / 255) : [L.color.r, L.color.g, L.color.b] };
    }
    for (const part of this.parts) {
      const col = [0, 0, 0];
      for (const id of part.ids) {
        const b = byId[id];
        if (!b || b.k <= 0.01) continue;
        for (let i = 0; i < 3; i++) col[i] = Math.max(col[i], b.c[i] * (this.lights.find((l) => l.id === id).rgb ? 1 : b.k));
      }
      const lit = col.some((v) => v > 0.005);
      const sel = [...part.ids].some((id) => selected.has(id));
      if (part.mode === "glow" || part.mode === "strip") {
        const gain = [...part.ids].some((id) => this.lights.find((l) => l.id === id)?.rgb) ? 1.2 : 1.9;
        const shown = lit ? col.map((v) => v * gain) : sel ? [0.11, 0.35, 0.5] : [0.086, 0.094, 0.114];
        part.mesh.material.color.setRGB(...shown);
        for (const m of part.extra ?? []) m.material.color.setRGB(...(lit ? col.map((v) => v * 1.6) : shown));
        for (const g of part.glows ?? []) { const k = Math.max(...col); g.intensity = k * 0.22; if (k > 0) g.color.setRGB(col[0] / k, col[1] / k, col[2] / k); }
        if (part.area) { const k = Math.max(...col); part.area.intensity = k * 9; if (k > 0) part.area.color.setRGB(col[0] / k, col[1] / k, col[2] / k); }
      } else {
        part.mesh.material.emissive.setRGB(...col.map((v) => v * 0.55));
      }
    }
    for (const s of this.spill) {
      let total = 0; const col = [0, 0, 0];
      for (const id of s.ids) { const b = byId[id]; if (!b) continue; total += b.k; for (let i = 0; i < 3; i++) col[i] += b.c[i] * b.k; }
      s.light.intensity = Math.min(1, total) * s.base;
      if (total > 0) s.light.color.setRGB(col[0] / total, col[1] / total, col[2] / total);
    }
    this.controls.update();
    this.composer.render();
  }

  /** Light id under a canvas pixel, for click-to-select. */
  pick(x, y) {
    const r = this.canvas.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1), this.camera);
    const meshes = [...this.lights.flatMap((l) => l.meshes.map((m) => Object.assign(m, { userData: { id: l.id } }))), ...this.parts.flatMap((p) => [p.mesh, ...(p.extra ?? [])])];
    ray.params.Line = { threshold: 0.05 };
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit?.object.userData.id ?? null;
  }
}

/** A simple Model 3 shaped body: an extruded side profile with glass and wheels. */
function standInBody(box) {
  const g = new THREE.Group();
  const side = [[-1, 0.2], [-1, 0.48], [-0.82, 0.55], [-0.55, 0.6], [-0.32, 0.92], [0.05, 0.98], [0.32, 0.74], [0.6, 0.58], [0.94, 0.5], [1, 0.36], [0.98, 0.2]];
  const shape = new THREE.Shape(side.map(([x, y]) => new THREE.Vector2(x * box.x, y * box.y)));
  const depth = box.z * 1.7;
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: box.z * 0.15, bevelThickness: box.z * 0.15, bevelSegments: 6 }),
    new THREE.MeshStandardMaterial({ color: 0x7a0b0b, roughness: 0.35, metalness: 0.6 }),
  );
  body.position.z = -depth / 2;
  g.add(body);
  const glass = new THREE.Mesh(
    new THREE.ExtrudeGeometry(new THREE.Shape([[-0.5, 0.62], [-0.3, 0.9], [0.04, 0.95], [0.3, 0.73], [0.5, 0.62]].map(([x, y]) => new THREE.Vector2(x * box.x, y * box.y))), { depth: depth + box.z * 0.32, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 }),
  );
  glass.position.z = -(depth + box.z * 0.32) / 2;
  g.add(glass);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 28);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.8 });
  for (const x of [-0.63, 0.66]) for (const z of [-1, 1]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(x * box.x, 0.34, z * (box.z * 0.98));
    g.add(w);
  }
  return g;
}

/** Split a geometry into its connected pieces (triangles sharing vertices or positions). */
function splitComponents(geo) {
  const pos = geo.attributes.position, n = pos.count;
  const index = geo.index ? geo.index.array : Uint32Array.from({ length: n }, (_, i) => i);
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  for (let i = 0; i < index.length; i += 3) { union(index[i], index[i + 1]); union(index[i], index[i + 2]); }
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    if (seen.has(k)) union(i, seen.get(k)); else seen.set(k, i);
  }
  const groups = new Map();
  for (let i = 0; i < index.length; i += 3) {
    const r = find(index[i]);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(index[i], index[i + 1], index[i + 2]);
  }
  return [...groups.values()].map((tris) => {
    const g = geo.clone();
    g.setIndex(tris);
    // Bounds from this piece's own vertices; the shared position buffer covers all pieces.
    const box = new THREE.Box3(), v = new THREE.Vector3();
    for (const i of tris) box.expandByPoint(v.fromBufferAttribute(pos, i));
    g.boundingBox = box;
    g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    return g;
  });
}

/** A dark concrete parking garage around the car: floor, ceiling, pillars, bay lines, dead fixtures. */
function parkingGarage() {
  const g = new THREE.Group();
  const concrete = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), concrete(0x2b2c2e));
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), concrete(0x1f2022));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 2.7;
  g.add(ceiling);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 2.7), concrete(0x2a2b2d));
  wall.position.set(0, 1.35, -4.2);
  g.add(wall);
  const pillarGeo = new THREE.BoxGeometry(0.45, 2.7, 0.45);
  for (const x of [-7.5, -2.6, 2.6, 7.5]) for (const z of [-3.6, 4.6]) {
    const p = new THREE.Mesh(pillarGeo, concrete(0x323335));
    p.position.set(x, 1.35, z);
    g.add(p);
  }
  // Bay lines either side of the car, and a beam overhead.
  const paint = new THREE.MeshStandardMaterial({ color: 0xb8b39a, roughness: 0.8 });
  for (const z of [-1.55, 1.55]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.1), paint);
    line.rotation.x = -Math.PI / 2;
    line.position.set(-0.4, 0.002, z);
    g.add(line);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 0.4), concrete(0x252628));
  beam.position.set(0, 2.45, 0.6);
  g.add(beam);
  // Fixtures, off: the car is the only light.
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.4 });
  for (const x of [-5, 0, 5]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.15), fixtureMat);
    f.position.set(x, 2.66, -1.8);
    g.add(f);
  }
  return g;
}

/**
 * Centerline of a long, thin piece of geometry: order its vertices along the main
 * axis, average them in slices, and smooth the result into a curve.
 */
function stripCenterline(mesh) {
  const pos = mesh.geometry.attributes.position, idx = new Set(mesh.geometry.index.array);
  const pts = [...idx].map((i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
  if (pts.length < 4) return null;
  const box = new THREE.Box3().setFromPoints(pts), size = box.getSize(new THREE.Vector3());
  // Each strip runs one way along its longest horizontal extent (door strips front
  // to back, the dash strip side to side), so ordering by that axis follows its curve.
  const key = size.x >= size.z ? (p) => p.x : (p) => p.z;
  pts.sort((a, b) => key(a) - key(b));
  const slices = Math.min(24, Math.max(4, Math.floor(pts.length / 4)));
  const line = [];
  for (let i = 0; i < slices; i++) {
    const chunk = pts.slice(Math.floor((i * pts.length) / slices), Math.floor(((i + 1) * pts.length) / slices));
    if (!chunk.length) continue;
    line.push(chunk.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / chunk.length));
  }
  return line.length >= 2 ? new THREE.CatmullRomCurve3(line) : null;
}
