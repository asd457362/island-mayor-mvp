import type { State } from "./game";
export const catalog = [
  ["tree", "植栽", "闊葉樹", "🌳", 1200, 3, 3, 4],
  ["pine", "植栽", "松樹", "🌲", 1000, 2, 2, 3],
  ["blossom", "植栽", "開花樹", "🌸", 1600, 3, 3, 5],
  ["shrub", "植栽", "灌木", "🌿", 300, 1, 1, 1],
  ["flowers", "植栽", "花圃", "🌷", 500, 2, 1, 2],
  ["slide", "遊具", "溜滑梯", "🛝", 4500, 3, 4, 8],
  ["swing", "遊具", "盪鞦韆", "🎠", 3800, 3, 3, 7],
  ["seesaw", "遊具", "蹺蹺板", "⚖", 2200, 3, 1, 4],
  ["sand", "遊具", "沙坑", "🏖", 1800, 3, 3, 3],
  ["climb", "遊具", "攀爬架", "🪜", 4000, 3, 3, 7],
  ["pond", "水景", "小池塘", "🐟", 3600, 3, 3, 8],
  ["fountain", "水景", "圓形噴水池", "⛲", 5000, 3, 3, 10],
  ["bench", "休憩", "長椅", "🪑", 600, 2, 1, 1],
  ["picnic", "休憩", "野餐桌", "🧺", 1400, 3, 2, 2],
  ["gazebo", "休憩", "涼亭", "⛩", 6000, 4, 4, 6],
  ["pergola", "休憩", "花架", "🌺", 2600, 3, 2, 4],
  ["lamp", "裝飾與鋪面", "庭園燈", "💡", 800, 1, 1, 2],
  ["bin", "裝飾與鋪面", "垃圾桶", "🗑", 400, 1, 1, 1],
  ["path", "裝飾與鋪面", "石板步道", "▦", 100, 1, 1, 0],
  ["fence", "裝飾與鋪面", "矮籬笆", "🚧", 250, 2, 0.5, 1],
].map(([id, category, name, icon, price, w, d, maintenance]) => ({
  id: id as string,
  category: category as string,
  name: name as string,
  icon: icon as string,
  price: +price,
  w: +w,
  d: +d,
  maintenance: +maintenance,
}));
export type ParkItem = {
  id: string;
  kind: string;
  x: number;
  z: number;
  rotation: number;
  paid: number;
};
export const definition = (kind: string) => catalog.find((p) => p.id === kind)!;
export const unlocked = (s: State) =>
  s.elected && s.projects.some((p) => p.id === "park" && p.stage === 7);
export function initializePark(s: State) {
  if (
    s.parkItems !== undefined ||
    !s.projects.some((p) => p.id === "park" && p.stage === 7)
  )
    return;
  const project = s.projects.find((p) => p.id === "park" && p.stage === 7)!;
  const features =
    project.proposal?.features ??
    (project.tier === 2
      ? ["clean", "paths", "trees", "flowers", "benches", "lights"]
      : ["clean", "paths", "flowers", "benches"]);
  const seeds: ParkItem[] = [
    { id: "legacy-swing", kind: "swing", x: 0, z: 0, rotation: 0, paid: 0 },
  ];
  const add = (feature: string, kind: string, x: number, z: number) => {
    if (features.includes(feature))
      seeds.push({ id: "legacy-" + kind, kind, x, z, rotation: 0, paid: 0 });
  };
  add("trees", "tree", -5, -4);
  add("benches", "bench", 3, 3);
  add("flowers", "flowers", 3, -4);
  add("lights", "lamp", -5, 3);
  add("clean", "bin", 5, 3);
  if (features.includes("paths"))
    for (let x = -5; x <= 5; x++)
      seeds.push({
        id: "legacy-path-" + x,
        kind: "path",
        x,
        z: 5,
        rotation: 0,
        paid: 0,
      });
  s.parkItems = seeds;
  s.parkTutorialSeen = false;
}
export function footprint(p: ParkItem) {
  const d = definition(p.kind);
  return p.rotation % 180 === 0 ? { w: d.w, d: d.d } : { w: d.d, d: d.w };
}
export function placementError(items: ParkItem[], p: ParkItem) {
  if (
    !definition(p.kind) ||
    ![p.x, p.z, p.rotation].every(Number.isFinite) ||
    p.rotation % 90 !== 0
  )
    return "道具資料無效";
  const a = footprint(p);
  // Inset lawn: excludes surrounding roads, apartments and perimeter trees.
  if (Math.abs(p.x) + a.w / 2 > 7 || Math.abs(p.z) + a.d / 2 > 6)
    return "超出公園可布置草地邊界";
  for (const q of items) {
    if (q.id === p.id) continue;
    const b = footprint(q);
    if (
      Math.abs(p.x - q.x) < (a.w + b.w) / 2 - 0.001 &&
      Math.abs(p.z - q.z) < (a.d + b.d) / 2 - 0.001
    )
      return "占地與其他設施重疊（步道可相接，不可交疊）";
  }
  return "";
}
export function commitItem(s: State, p: ParkItem) {
  if (!unlocked(s)) throw Error("請先當選里長，並完成曦光公園工程及公布成效。");
  initializePark(s);
  const items = s.parkItems!;
  const error = placementError(items, p);
  if (error) throw Error(error);
  const old = items.find((q) => q.id === p.id),
    d = definition(p.kind);
  if (old && old.kind !== p.kind) throw Error("不可更換既有道具種類");
  if (!old) {
    if (s.budget < d.price) throw Error("預算不足");
    s.budget -= d.price;
    s.spending += d.price;
    s.maintenance += d.maintenance;
    s.log.unshift(`第 ${s.day} 天 · 公園購置${d.name} −$${d.price}`);
    items.push({ ...p, paid: d.price });
  } else Object.assign(old, { x: p.x, z: p.z, rotation: p.rotation });
}
export function reclaimItem(s: State, id: string) {
  if (!unlocked(s)) throw Error("公園尚未解鎖");
  const item = s.parkItems?.find((p) => p.id === id);
  if (!item) throw Error("請先選取道具");
  const refund = Math.floor(item.paid * 0.5);
  s.budget += refund;
  s.spending -= refund;
  if (item.paid > 0)
    s.maintenance = Math.max(
      0,
      s.maintenance - definition(item.kind).maintenance,
    );
  s.parkItems = s.parkItems!.filter((p) => p.id !== id);
  s.log.unshift(
    `第 ${s.day} 天 · 收回${definition(item.kind).name} +$${refund}（原付款50%）`,
  );
}
