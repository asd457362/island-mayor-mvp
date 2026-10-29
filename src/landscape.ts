import * as T from "three";
import { batchDetails } from "./models";
const palette = {
  stone: "#efe2c5",
  edge: "#d1c7ac",
  grass: "#a9c982",
  hedge: "#759c6c",
  wood: "#bba177",
  flower: "#dda68e",
};
export function createLandscape(
  id: string,
  complete: boolean,
  features: string[] = [],
  editable = false,
) {
  const g = new T.Group();
  const materials = new Map<string, T.MeshStandardMaterial>();
  const mat = (color: string) => {
    if (!materials.has(color))
      materials.set(
        color,
        new T.MeshStandardMaterial({
          color,
          roughness: 0.92,
          flatShading: true,
        }),
      );
    return materials.get(color)!;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    c: string,
  ) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    m.castShadow = h > 0.15;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const ball = (x: number, y: number, z: number, r: number, c: string) => {
    const m = new T.Mesh(new T.IcosahedronGeometry(r, 0), mat(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  };
  const tree = (x: number, z: number) => {
    box(x, 1, z, 0.22, 1.9, 0.22, "#ac926e");
    ball(x, 2.3, z, 1.05, "#7da975");
    ball(x + 0.45, 2.65, z - 0.1, 0.7, "#96b982");
  };
  const flowers = (x: number, z: number) => {
    box(x, 0.3, z, 1.6, 0.5, 0.8, "#ceb99b");
    box(x, 0.57, z, 1.4, 0.05, 0.63, "#7c8c61");
    for (let n = 0; n < 5; n++) {
      box(x - 0.55 + n * 0.27, 0.75, z, 0.035, 0.35, 0.035, "#7f9c6e");
      ball(x - 0.55 + n * 0.27, 0.95, z, 0.16, n % 2 ? "#f0d295" : "#dea38b");
    }
  };
  const bench = (x: number, z: number) => {
    for (const dz of [-0.25, 0, 0.25])
      box(x, 0.75, z + dz, 2, 0.1, 0.2, palette.wood);
    box(x, 1.12, z - 0.4, 2, 0.55, 0.1, palette.wood);
    for (const dx of [-0.7, 0.7])
      box(x + dx, 0.42, z, 0.12, 0.6, 0.8, "#69857a");
  };
  const lamp = (x: number, z: number) => {
    box(x, 1.1, z, 0.12, 2.1, 0.12, "#638278");
    box(x, 2.2, z, 0.35, 0.35, 0.35, "#f3dca5");
    box(x, 2.43, z, 0.5, 0.12, 0.5, "#5f8177");
  };
  if (!complete) {
    if (id === "park") {
      for (let i = 0; i < 5; i++)
        box(
          -5 + i * 2,
          0.08,
          5 + (i % 2) * 0.4,
          0.6,
          0.04,
          0.3,
          i % 2 ? "#b7ac87" : "#d8c9a5",
        );
      box(0, 0.01, 5, 12, 0.04, 1.2, "#a69e80");
    }
    batchDetails(g);
    return g;
  }
  const large = id === "park",
    w = large ? 16 : 8,
    d = large ? 14 : 2.6,
    offsetZ =
      id === "light"
        ? -5
        : id === "noise"
          ? -5
          : id === "parking"
            ? 2
            : id === "drain"
              ? -2
              : 0;
  g.position.z = offsetZ;
  box(0, 0.02, 0, w, 0.12, d, palette.edge);
  box(
    0,
    0.1,
    0,
    w - 0.35,
    0.12,
    d - 0.35,
    large ? palette.grass : palette.stone,
  );
  if (large && editable) {
    batchDetails(g);
    return g;
  }
  const has = (f: string) => features.includes(f);
  if (large) {
    box(0, 0.18, 4.8, 15.2, 0.08, 2, palette.stone);
    if (has("paths")) {
      box(-5.8, 0.18, -0.3, 1.8, 0.08, 8.2, palette.stone);
      box(5.8, 0.18, -0.3, 1.8, 0.08, 8.2, palette.stone);
      for (let n = -6; n <= 6; n++)
        box(n, 0.23, 4.8, 0.025, 0.01, 1.9, "#d4c9ab");
    }
    for (const side of [-1, 1]) {
      box(side * 7.1, 0.55, -1.5, 0.7, 0.9, 8.5, palette.hedge);
      box(side * 6.8, 0.7, -5.7, 2.4, 1, 0.7, "#88aa76");
    }
    if (has("flowers")) {
      flowers(-3.6, 6.1);
      flowers(3.6, 6.1);
    }
    if (has("benches")) {
      bench(-3.8, 3.5);
      bench(3.8, 3.5);
    }
  }
  if (has("paths") && !large) {
    for (let n = -3; n <= 3; n++) box(n, 0.2, 0, 0.025, 0.02, 2.1, "#d0c7ad");
  }
  if (has("trees")) {
    for (const side of [-1, 1])
      tree(side * (large ? 5.3 : 3.2), large ? -4.3 : 0);
  }
  if (has("flowers")) {
    flowers(large ? -3.4 : -2, large ? -5.3 : 0.5);
    flowers(large ? 3.4 : 2, large ? -5.3 : 0.5);
  }
  if (has("benches") && !large) bench(0, -0.4);
  if (has("lights")) {
    lamp(-w / 2 + 0.6, large ? 5.4 : 0);
    lamp(w / 2 - 0.6, large ? 5.4 : 0);
  }
  if (has("clean")) {
    box(large ? 6.2 : 3.3, 0.55, large ? 3.2 : 0, 0.5, 0.8, 0.5, "#7b9e89");
    box(large ? 6.2 : 3.3, 0.99, large ? 3.2 : 0, 0.57, 0.08, 0.57, "#577e71");
  }
  if (large && features.length >= 4) {
    const basin = new T.Mesh(
      new T.CylinderGeometry(0.9, 1, 0.3, 12),
      new T.MeshStandardMaterial({ color: "#d4ccb6" }),
    );
    basin.position.set(0, 0.4, -4.4);
    g.add(basin);
    const water = new T.Mesh(
      new T.CylinderGeometry(0.78, 0.78, 0.04, 12),
      new T.MeshStandardMaterial({ color: "#8bc6c7", roughness: 0.3 }),
    );
    water.position.set(0, 0.57, -4.4);
    g.add(water);
    box(0, 0.95, -4.4, 0.25, 0.8, 0.25, "#d8d0ba");
    ball(0, 1.4, -4.4, 0.18, "#a3d2cf");
  }
  batchDetails(g);
  return g;
}
