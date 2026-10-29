import { test } from "node:test";
import assert from "node:assert/strict";
import { fresh, SaveManager } from "../src/game";
import {
  initializePark,
  placementError,
  commitItem,
  reclaimItem,
  type ParkItem,
} from "../src/park";
const item = (kind = "bench", x = 0, z = 0, rotation = 0): ParkItem => ({
  id: "test",
  kind,
  x,
  z,
  rotation,
  paid: 0,
});
function ready() {
  const s = fresh();
  s.elected = true;
  s.budget = 20000;
  s.projects.push({
    id: "park",
    tier: 1,
    stage: 7,
    workers: 0,
    quality: 1,
    progress: 1,
    eventDone: true,
    cost: 0,
  });
  initializePark(s);
  s.parkItems = [];
  return s;
}
test("公園邊界、旋轉占地與相接規則", () => {
  assert.equal(placementError([], item("bench", 6, 0)), "");
  assert.ok(placementError([], item("bench", 6.5, 0)));
  assert.equal(placementError([], item("bench", 6.5, 0, 90)), "");
  assert.ok(placementError([], item("bench", 0, 5.5, 90)));
  const a = { ...item("path"), id: "a" };
  assert.equal(placementError([a], item("path", 1, 0)), "");
  assert.ok(placementError([a], item("path", 0.5, 0)));
  assert.ok(placementError([a], item("bench")));
});
test("預覽取消無變更；購買、移動、旋轉與退款無套利", () => {
  const s = ready(),
    before = JSON.stringify(s);
  placementError(s.parkItems!, item());
  assert.equal(JSON.stringify(s), before);
  commitItem(s, item());
  assert.equal(s.budget, 19400);
  assert.equal(s.maintenance, 1);
  commitItem(s, { ...item("bench", 2, 2, 90), paid: 99999 });
  assert.equal(s.budget, 19400);
  assert.equal(s.parkItems![0].paid, 600);
  reclaimItem(s, "test");
  assert.equal(s.budget, 19700);
  assert.equal(s.spending, 300);
  assert.equal(s.maintenance, 0);
  assert.throws(() => reclaimItem(s, "test"));
  assert.equal(s.xp, 0);
  assert.equal(s.credit, 50);
});
test("不足預算與無效位置完全不扣款", () => {
  const s = ready();
  s.budget = 10;
  const before = JSON.stringify(s);
  assert.throws(() => commitItem(s, item()));
  assert.throws(() => commitItem(s, item("bench", 99)));
  assert.equal(JSON.stringify(s), before);
  s.elected = false;
  assert.throws(() => commitItem(s, item()));
});
test("存檔重載完全一致，舊存檔只初始化一次並保留進度", () => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  } as Storage;
  const s = ready();
  commitItem(s, item("pine", 2, 2, 90));
  SaveManager.save(s);
  assert.deepEqual(SaveManager.load(), s);
  delete s.parkItems;
  s.xp = 345;
  SaveManager.save(s);
  const loaded = SaveManager.load()!;
  assert.equal(loaded.xp, 345);
  assert.equal(loaded.parkItems!.length, 15);
  initializePark(loaded);
  assert.equal(loaded.parkItems!.length, 15);
  const budget = loaded.budget;
  reclaimItem(loaded, "legacy-bench");
  assert.equal(loaded.budget, budget);
  SaveManager.save(loaded);
  assert.equal(SaveManager.load()!.parkItems!.length, 14);
});
import * as T from "three";
import { catalog } from "../src/park";
import { parkModel, previewModel, disposePreview } from "../src/park-models";
test("20種模型占地不超出宣告尺寸，預覽釋放不破壞共用模型", () => {
  for (const d of catalog) {
    const g = parkModel(d.id),
      other = parkModel(d.id);
    const size = new T.Box3().setFromObject(g).getSize(new T.Vector3());
    assert.ok(size.x <= d.w + 0.001, `${d.id} width ${size.x}`);
    assert.ok(size.z <= d.d + 0.001, `${d.id} depth ${size.z}`);
    assert.ok(size.y > 0);
    const first = g.children[0] as T.Mesh;
    assert.equal(first.geometry, (other.children[0] as T.Mesh).geometry);
    let disposed = false;
    first.geometry.addEventListener("dispose", () => {
      disposed = true;
    });
    disposePreview(previewModel(item(d.id), true));
    assert.equal(disposed, false);
  }
});
