// Car profiles: which lights a car has, what each can do, and where it sits for the viewer.

import { readFileSync } from "node:fs";

export type Behavior = "onOff" | "ramp" | "full" | "rgb";
export type Point = [number, number];

export type Shape =
  | { view: string; dot: Point; r: number }
  | { view: string; strip: Point[]; w: number }
  | { view: string; rect: [x: number, y: number, w: number, h: number] };

/** 3D shapes in the normalized car frame (see Profile.view3d.frame). */
export type Shape3D =
  | { point: [number, number, number]; r: number }
  | { points: Array<[number, number, number]>; r: number }
  | { rect: [number, number, number]; w: number; h: number }
  | { screen: [number, number, number]; w: number; h: number; facing: "rear" };

export interface Light {
  id: string;
  name: string;
  channels: number[];
  behavior: Behavior;
  color?: string;
  minFlashMs?: number;
  shapes: Shape[];
  shapes3d?: Shape3D[];
}

export interface Closure {
  id: string;
  channel: number;
  kind: "mirror" | "window" | "liftgate" | "chargePort" | "door" | "falconDoor" | "doorHandle";
  openMs: number;
  closeMs: number;
  dance: boolean;
}

export interface Profile {
  car: string;
  closures?: Closure[];
  modelYear: number;
  views: Record<string, { outline: Point[] }>;
  view3d?: {
    frame: string;
    model?: string;
    modelSource?: { title: string; author: string; license: string; url: string };
    fit?: { rotateY?: number; flipFront?: boolean };
    spill?: Record<string, string[]>;
  };
  lights: Light[];
}

export function loadProfile(path: string): Profile {
  const p = JSON.parse(readFileSync(path, "utf8")) as Profile;
  const ids = new Set<string>();
  for (const l of p.lights) {
    if (ids.has(l.id)) throw new Error(`Duplicate light id ${l.id} in ${path}`);
    ids.add(l.id);
    if (l.behavior === "rgb" && l.channels.length !== 3) throw new Error(`RGB light ${l.id} needs 3 channels`);
  }
  return p;
}
