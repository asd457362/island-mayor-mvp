import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as T from "three";
import { definition, type ParkItem } from "./park";
const geometries = {
  box: new T.BoxGeometry(1, 1, 1),
  ball: new T.IcosahedronGeometry(1, 0),
  cone: new T.ConeGeometry(1, 1, 8),
  cylinder: new T.CylinderGeometry(1, 1, 1, 12),
};
const materials = new Map<string, T.MeshStandardMaterial>();
function material(color: string) {
  if (!materials.has(color)) {
    const m = new T.MeshStandardMaterial({
      color,
      roughness: 0.85,
      flatShading: true,
    });
    m.userData.shared = true;
    materials.set(color, m);
  }
  return materials.get(color)!;
}
const templates = new Map<string, T.Group>();
export function parkModel(kind: string) {
  if (templates.has(kind)) return templates.get(kind)!.clone(true);
  const g = new T.Group(),
    wood = "#b89470",
    metal = "#638c87",
    green = "#81ae79",
    pink = "#e9adab",
    stone = "#dfd2b5";
  const part = (
    shape: keyof typeof geometries,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    c: string,
  ) => {
    const m = new T.Mesh(geometries[shape], material(c));
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    c = wood,
  ) => part("box", x, y, z, w, h, d, c);
  const pole = (x: number, z: number, h = 2.5) =>
    box(x, h / 2, z, 0.12, h, 0.12, metal);
  const bench = (z = 0) => {
    box(0, 0.65, z, 1.9, 0.15, 0.65);
    box(0, 1, z - 0.3, 1.9, 0.6, 0.1);
    for (const x of [-0.65, 0.65]) box(x, 0.3, z, 0.12, 0.6, 0.65, metal);
  };
  if (["tree", "pine", "blossom", "shrub"].includes(kind)) {
    if (kind === "shrub") part("ball", 0, 0.5, 0, 0.5, 0.55, 0.5, green);
    else {
      box(0, 1, 0, 0.25, 2, 0.25);
      if (kind === "pine") {
        for (let i = 0; i < 3; i++)
          part(
            "cone",
            0,
            1.5 + i * 0.65,
            0,
            1 - i * 0.2,
            1.6,
            1 - i * 0.2,
            green,
          );
      } else {
        part(
          "ball",
          0,
          2,
          0,
          1.35,
          1.3,
          1.35,
          kind === "blossom" ? pink : green,
        );
        part(
          "ball",
          0.5,
          2.5,
          0,
          0.7,
          0.7,
          0.7,
          kind === "blossom" ? "#f4d1c2" : "#a4c68c",
        );
      }
    }
  } else if (kind === "flowers") {
    box(0, 0.15, 0, 1.95, 0.3, 0.95, stone);
    for (let i = 0; i < 5; i++) {
      box(-0.75 + i * 0.37, 0.4, 0, 0.04, 0.5, 0.04, green);
      part(
        "ball",
        -0.75 + i * 0.37,
        0.65,
        0,
        0.17,
        0.17,
        0.17,
        i % 2 ? pink : "#f1ce7e",
      );
    }
  } else if (kind === "bench") bench();
  else if (kind === "picnic") {
    box(0, 0.95, 0, 2.7, 0.15, 0.8);
    for (const z of [-0.8, 0.8]) {
      box(0, 0.55, z, 2.7, 0.12, 0.35);
      for (const x of [-1, 1]) box(x, 0.3, z, 0.15, 0.6, 0.2, metal);
    }
    for (const x of [-0.8, 0.8]) box(x, 0.45, 0, 0.15, 0.9, 0.6, metal);
  } else if (kind === "slide") {
    for (const x of [-0.9, 0.9]) pole(x, -1, 2);
    box(0, 2, -1, 2, 0.15, 1);
    const ramp = box(0, 1.1, 0.5, 1.3, 0.12, 3, "#e9b36b");
    ramp.rotation.x = 0.58;
    for (let i = 0; i < 5; i++)
      box(0, 0.3 + i * 0.35, -1.6, 0.9, 0.1, 0.15, metal);
  } else if (kind === "swing") {
    for (const x of [-1.3, 1.3]) for (const z of [-1, 1]) pole(x, z);
    box(0, 2.5, 0, 2.9, 0.16, 0.2, wood);
    for (const x of [-0.5, 0.5]) box(x, 1.7, 0, 0.035, 1.5, 0.035, metal);
    box(0, 0.9, 0, 1.2, 0.12, 0.5, "#e3b76b");
  } else if (kind === "seesaw") {
    part("cone", 0, 0.4, 0, 0.45, 0.8, 0.45, metal);
    const plank = box(0, 0.8, 0, 2.9, 0.15, 0.6, "#e5ad79");
    plank.rotation.z = 0.18;
    for (const x of [-1, 1]) box(x, 1.05, 0, 0.08, 0.45, 0.08, metal);
  } else if (kind === "sand") {
    box(0, 0.15, 0, 2.9, 0.3, 2.9, wood);
    box(0, 0.32, 0, 2.6, 0.06, 2.6, "#efdaa1");
    part("cone", 0.5, 0.5, 0.4, 0.5, 0.35, 0.5, "#e5c589");
  } else if (kind === "climb") {
    for (const x of [-1.3, 0, 1.3])
      for (const z of [-1.3, 1.3]) pole(x, z, 2.4);
    for (let i = 0; i < 5; i++) {
      box(0, 0.4 + i * 0.45, -1.3, 2.7, 0.08, 0.08, "#e6b979");
      box(0, 0.4 + i * 0.45, 1.3, 2.7, 0.08, 0.08, metal);
    }
    for (const x of [-1.3, 0, 1.3]) box(x, 2.4, 0, 0.08, 0.08, 2.7, metal);
  } else if (kind === "pond" || kind === "fountain") {
    part("cylinder", 0, 0.15, 0, 1.45, 0.3, 1.45, stone);
    part(
      "cylinder",
      0,
      0.32,
      0,
      1.3,
      0.06,
      kind === "pond" ? 1 : 1.3,
      "#85c6ce",
    );
    if (kind === "pond") {
      for (const x of [-0.7, 0.6])
        part("ball", x, 0.4, 0.4, 0.25, 0.04, 0.2, green);
    } else {
      part("cylinder", 0, 0.7, 0, 0.2, 0.8, 0.2, stone);
      part("cylinder", 0, 1.1, 0, 0.7, 0.12, 0.7, stone);
      part("ball", 0, 1.35, 0, 0.15, 0.4, 0.15, "#a6dedd");
    }
  } else if (kind === "gazebo" || kind === "pergola") {
    const size = kind === "gazebo" ? 1.7 : 1.2;
    for (const x of [-size, size]) for (const z of [-0.8, 0.8]) pole(x, z, 2.4);
    if (kind === "gazebo") {
      part("cone", 0, 2.8, 0, 2, 1, 1.8, "#719d8c");
      box(0, 0.1, 0, 3.9, 0.2, 3.9, stone);
    } else {
      for (let i = 0; i < 7; i++)
        box(-1.4 + i * 0.46, 2.5, 0, 0.15, 0.15, 1.95);
      for (const x of [-1.2, 1.2])
        part("ball", x, 2.5, 0, 0.35, 0.25, 0.8, green);
    }
  } else if (kind === "lamp") {
    pole(0, 0, 2);
    box(0, 2, 0, 0.4, 0.5, 0.4, "#ffe4a4");
    part("cone", 0, 2.4, 0, 0.4, 0.35, 0.4, metal);
  } else if (kind === "bin") {
    part("cylinder", 0, 0.45, 0, 0.35, 0.9, 0.35, metal);
    part("cylinder", 0, 0.93, 0, 0.4, 0.1, 0.4, "#486e67");
    box(0, 0.95, 0, 0.3, 0.04, 0.15, "#304e49");
  } else if (kind === "path") {
    box(0, 0.04, 0, 0.99, 0.08, 0.99, stone);
    box(0, 0.085, 0, 0.025, 0.01, 0.95, "#bdaf96");
  } else if (kind === "fence") {
    for (const x of [-0.9, 0.9]) box(x, 0.5, 0, 0.12, 1, 0.12, wood);
    for (const y of [0.35, 0.75]) box(0, y, 0, 1.95, 0.12, 0.12, wood);
  }
  const buckets = new Map<T.Material, T.BufferGeometry[]>();
  for (const child of [...g.children]) {
    if (!(child instanceof T.Mesh)) continue;
    child.updateMatrix();
    const geo = (
      child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone()
    ).applyMatrix4(child.matrix);
    const mat = child.material as T.Material;
    buckets.set(mat, [...(buckets.get(mat) ?? []), geo]);
    g.remove(child);
  }
  for (const [mat, list] of buckets) {
    const geo = mergeGeometries(list);
    list.forEach((g) => g.dispose());
    if (geo) {
      const mesh = new T.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    }
  }
  templates.set(kind, g);
  return g.clone(true);
}
export function placedModel(p: ParkItem) {
  const g = parkModel(p.kind);
  g.position.set(-14 + p.x, 0.72, -13 + p.z);
  g.rotation.y = (p.rotation * Math.PI) / 180;
  g.userData.parkId = p.id;
  return g;
}
export function previewModel(p: ParkItem, valid: boolean) {
  const g = placedModel(p);
  g.traverse((c) => {
    if (c instanceof T.Mesh) {
      c.material = new T.MeshStandardMaterial({
        color: valid ? "#88cbb0" : "#ef8d87",
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
    }
  });
  return g;
}
export function disposePreview(g: T.Group) {
  g.traverse((c) => {
    if (c instanceof T.Mesh) (c.material as T.Material).dispose();
  });
}
