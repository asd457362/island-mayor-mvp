import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const materials = new Map<string, T.MeshStandardMaterial>();
function material(color: string) {
  if (!materials.has(color))
    materials.set(
      color,
      new T.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true }),
    );
  return materials.get(color)!;
}
function shape(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  x: number,
  y: number,
  z: number,
  color: string,
) {
  const m = new T.Mesh(geometry, material(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(
  g: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  c: string,
) {
  return shape(g, new T.BoxGeometry(w, h, d), x, y, z, c);
}
function ball(
  g: T.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  c: string,
) {
  return shape(g, new T.IcosahedronGeometry(r, 1), x, y, z, c);
}
// Merge rigid details by colour; keep animated limbs separate.
export function batchDetails(g: T.Group) {
  g.updateMatrixWorld(true);
  const buckets = new Map<T.Material, T.BufferGeometry[]>();
  for (const child of [...g.children]) {
    if (!(child instanceof T.Mesh) || Array.isArray(child.material)) continue;
    child.updateMatrix();
    const geometry = (
      child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone()
    ).applyMatrix4(child.matrix);
    const list = buckets.get(child.material) || [];
    list.push(geometry);
    buckets.set(child.material, list);
    g.remove(child);
    child.geometry.dispose();
  }
  for (const [mat, list] of buckets) {
    const geometry = mergeGeometries(list);
    list.forEach((geo) => geo.dispose());
    if (geometry) {
      const mesh = new T.Mesh(geometry, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    }
  }
}
export function createResident(color: string, player = false, variant = 0) {
  const g = new T.Group();
  const skin = ["#f3d5b0", "#d9ac8e", "#e7bd9a", "#bd9279"][variant % 4],
    hair = ["#665950", "#514d49", "#a08060", "#dbd6c9"][variant % 4];
  box(g, 0, 1.02, 0, 0.64, 0.7, 0.42, color);
  box(g, 0, 1.38, 0.02, 0.23, 0.12, 0.27, "#fff0d5");
  const head = ball(g, 0, 1.72, 0, 0.36, skin);
  head.scale.set(0.9, 1, 0.9);
  box(g, 0, 1.97, -0.03, 0.57, 0.18, 0.52, hair);
  box(g, 0, 1.79, -0.24, 0.57, 0.36, 0.13, hair);
  ball(g, -0.3, 1.71, 0, 0.075, skin);
  ball(g, 0.3, 1.71, 0, 0.075, skin);
  for (const x of [-0.115, 0.115]) {
    box(g, x, 1.77, 0.302, 0.055, 0.066, 0.025, "#384847");
    box(g, x, 1.66, 0.3, 0.08, 0.035, 0.025, "#dc9d89");
  }
  box(g, 0, 1.69, 0.335, 0.075, 0.08, 0.065, skin);
  box(g, 0, 1.58, 0.307, 0.09, 0.025, 0.02, "#916f62");
  if (player || variant % 6 === 0) {
    box(g, 0, 2.06, 0, 0.66, 0.13, 0.59, player ? "#f2c66c" : "#b9c6a1");
    box(g, 0, 2.01, 0.22, 0.68, 0.05, 0.36, player ? "#f2c66c" : "#b9c6a1");
  }
  if (!player && variant % 6 === 1) {
    for (const x of [-0.13, 0.13]) {
      box(g, x, 1.77, 0.326, 0.2, 0.12, 0.025, "#536e6b");
      box(g, x, 1.78, 0.343, 0.14, 0.065, 0.015, "#b9d9d3");
    }
    box(g, 0, 1.77, 0.34, 0.06, 0.025, 0.025, "#536e6b");
  }
  if (!player && variant % 6 === 2) {
    ball(g, 0, 1.81, -0.38, 0.17, hair);
    box(g, 0, 1.33, 0.24, 0.5, 0.1, 0.07, "#edd2ac");
  }
  if (!player && variant % 6 === 3) {
    box(g, 0, 0.9, 0.24, 0.44, 0.5, 0.04, "#f0e2bf");
    box(g, 0.12, 0.94, 0.275, 0.13, 0.12, 0.03, color);
  }
  if (player || variant % 6 === 4) {
    box(g, 0, 1.03, -0.31, 0.4, 0.48, 0.22, player ? "#6d9f91" : "#c1a57d");
    box(g, -0.2, 1.08, 0.23, 0.06, 0.56, 0.025, "#d5c493");
  }
  box(g, 0, 0.72, 0, 0.62, 0.08, 0.44, "#71828a");
  batchDetails(g);
  const limbs: T.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const limb = new T.Group(),
      leg = i < 2;
    limb.position.set(
      (i % 2 === 0 ? -1 : 1) * (leg ? 0.17 : 0.41),
      leg ? 0.7 : 1.3,
      0,
    );
    if (leg) {
      box(limb, 0, -0.25, 0, 0.23, 0.5, 0.25, "#456879");
      box(limb, 0, -0.57, 0.065, 0.26, 0.13, 0.38, "#f0e9d9");
    } else {
      box(limb, 0, -0.15, 0, 0.19, 0.3, 0.3, color);
      box(limb, 0, -0.4, 0, 0.15, 0.24, 0.19, skin);
    }
    batchDetails(limb);
    g.add(limb);
    limbs.push(limb);
  }
  g.userData.limbs = limbs;
  return g;
}
export function animateResident(
  g: T.Group,
  time: number,
  walking: boolean,
  pace = 1,
) {
  const limbs = g.userData.limbs as T.Group[];
  limbs?.forEach((limb, i) => {
    limb.rotation.x = walking
      ? Math.sin(time * pace + (i % 2) * Math.PI) * (i < 2 ? 0.38 : -0.3)
      : Math.sin(time * 1.8) * 0.025;
  });
}
export function buildingDetails(
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  name: string,
) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  const front = d / 2 + 0.12;
  box(g, 0, 0.55, front + 0.35, w - 0.5, 0.22, 0.9, "#d4cbb3");
  box(g, 0, 0.7, front + 0.6, 2, 0.12, 1, "#ece4cf");
  for (let floor = 2; floor < h; floor += 2) {
    for (let column = -w / 2 + 1; column < w / 2; column += 2) {
      box(g, column, floor, front, 1.05, 1.35, 0.12, "#f1e8d4");
      box(g, column, floor, front + 0.08, 0.83, 1.1, 0.08, "#81aeb7");
      box(g, column, floor, front + 0.14, 0.06, 1.1, 0.04, "#d6dfce");
      box(g, column, floor - 0.58, front + 0.14, 1.2, 0.09, 0.25, "#d3c7b2");
    }
    for (const side of [-1, 1])
      for (let j = -d / 2 + 1; j < d / 2; j += 2) {
        box(g, side * (w / 2 + 0.04), floor, j, 0.08, 1.15, 0.95, "#f0e5cf");
        box(g, side * (w / 2 + 0.1), floor, j, 0.06, 0.9, 0.7, "#81aeb7");
      }
  }
  box(g, 0, 2.05, front + 0.25, 1.5, 0.2, 0.6, "#557f77");
  box(g, 0.4, 1.5, front + 0.23, 0.06, 0.22, 0.08, "#e5ca82");
  for (const side of [-1, 1]) {
    box(g, side * (w / 2 - 0.7), 0.95, front + 0.6, 0.65, 0.6, 0.65, "#c88f74");
    ball(g, side * (w / 2 - 0.7), 1.42, front + 0.6, 0.5, "#7ca57a");
  }
  box(g, -w / 2 + 1.3, h + 1.05, 0, 1.4, 0.65, 1.2, "#d4d8c7");
  box(g, -w / 2 + 1.3, h + 1.4, 0, 1.55, 0.1, 1.35, "#91a7a0");
  if (name.includes("市場") || name.includes("商店")) {
    for (let i = 0; i < Math.floor(w); i++) {
      const awning = box(
        g,
        -w / 2 + 0.5 + i,
        2.8,
        front + 0.7,
        1,
        0.12,
        1.6,
        i % 2 === 0 ? "#e9b08b" : "#f6e5c3",
      );
      awning.rotation.x = 0.13;
      box(
        g,
        -w / 2 + 0.5 + i,
        2.58,
        front + 1.48,
        1,
        0.24,
        0.08,
        i % 2 === 0 ? "#e9b08b" : "#f6e5c3",
      );
    }
    for (let stall = 0; stall < 3; stall++) {
      const sx = (stall - 1) * 2.6;
      box(g, sx, 1, front + 1.1, 1.9, 0.55, 0.7, "#a98d68");
      box(g, sx, 1.3, front + 1.1, 2, 0.08, 0.8, "#d8be91");
      for (let n = 0; n < 4; n++)
        ball(
          g,
          sx - 0.65 + n * 0.42,
          1.45,
          front + 1.1,
          0.18,
          ["#d68b62", "#bdc46e", "#eac26c"][stall],
        );
    }
  }
  if (name.includes("小學")) {
    box(g, 0, h - 0.5, front + 0.18, 1.1, 1.1, 0.1, "#f8edcd");
    box(g, 0, h - 0.45, front + 0.25, 0.04, 0.5, 0.03, "#57746e");
    box(g, 0.17, h - 0.65, front + 0.26, 0.35, 0.04, 0.03, "#57746e");
    box(g, w / 2 - 1, h + 1.8, 0, 0.08, 2, 0.08, "#87988d");
    box(g, w / 2 - 0.5, h + 2.4, 0, 0.9, 0.5, 0.05, "#e4aa80");
  }
  if (name.includes("公寓")) {
    box(g, w / 2 - 1, 3.8, front + 0.4, 1.4, 0.1, 0.8, "#d6ceb8");
    box(g, w / 2 - 1, 4.2, front + 0.8, 1.4, 0.08, 0.08, "#718c85");
    for (const n of [-0.6, 0, 0.6])
      box(g, w / 2 - 1 + n, 4, front + 0.8, 0.05, 0.4, 0.05, "#718c85");
  }
  batchDetails(g);
  return g;
}
export function streetDetails() {
  const g = new T.Group();
  // Keep the main crossroad and walking lanes open.
  for (const [x, z] of [
    [-23, -10],
    [-8, -20],
    [-22, 18],
  ] as [number, number][]) {
    for (const offset of [-0.45, 0, 0.45])
      box(g, x, 1.1, z + offset, 2.8, 0.12, 0.3, "#b8996b");
    box(g, x, 1.65, z - 0.6, 2.8, 0.75, 0.12, "#b8996b");
    for (const side of [-1, 1])
      box(g, x + side, 0.75, z, 0.16, 0.7, 1.2, "#5d7a72");
  }
  for (const x of [-5.1, 5.1])
    for (const z of [-22, -10, 10, 22]) {
      box(g, x, 2.2, z, 0.12, 3.8, 0.12, "#5d7d77");
      box(g, x, 4.2, z, 0.7, 0.16, 0.65, "#e3d7b0");
      box(g, x, 4.35, z, 0.9, 0.13, 0.8, "#577c73");
      box(g, x, 0.6, z, 0.35, 0.3, 0.35, "#7b8e7b");
    }
  for (const [x, z] of [
    [-22, -18],
    [-7, 17],
    [22, 17],
  ] as [number, number][]) {
    box(g, x, 0.9, z, 0.7, 1.1, 0.7, "#739687");
    box(g, x, 1.5, z, 0.8, 0.1, 0.8, "#4e7168");
    box(g, x, 1.25, z + 0.36, 0.42, 0.13, 0.03, "#3f625d");
  }
  for (let j = 0; j < 8; j++) {
    const x = -21 + j * 1.9;
    box(g, x, 0.62, -22, 1.3, 0.4, 0.8, "#c9b091");
    for (let k = 0; k < 3; k++) {
      box(g, x - 0.4 + k * 0.4, 0.96, -22, 0.04, 0.4, 0.04, "#7d9b70");
      ball(
        g,
        x - 0.4 + k * 0.4,
        1.17,
        -22,
        0.14,
        ["#e0a18a", "#eed08b", "#c4b1c9"][j % 3],
      );
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = 9 + i * 2.8,
      z = -7;
    box(
      g,
      x,
      1.67,
      z - 0.15,
      1.22,
      0.55,
      1.35,
      ["#edc274", "#8eb3b7", "#ec927c"][i % 3],
    );
    box(g, x, 1.72, z + 0.55, 1.1, 0.35, 0.04, "#b8d4cf");
    for (const side of [-1, 1])
      for (const end of [-0.85, 0.85]) {
        const wheel = shape(
          g,
          new T.CylinderGeometry(0.29, 0.29, 0.15, 8),
          x + side * 0.78,
          0.82,
          z + end,
          "#465958",
        );
        wheel.rotation.z = Math.PI / 2;
      }
    for (const side of [-1, 1])
      box(g, x + side * 0.48, 1.13, z + 1.37, 0.25, 0.16, 0.06, "#f5e6b8");
  }
  batchDetails(g);
  return g;
}
