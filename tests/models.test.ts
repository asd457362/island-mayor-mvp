import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { batchDetails, createResident, animateResident } from "../src/models";
test("合併方塊與非索引球體時保留所有三角形與位置", () => {
  const g = new T.Group(),
    mat = new T.MeshStandardMaterial();
  const a = new T.Mesh(new T.BoxGeometry(), mat),
    b = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat);
  b.position.x = 5;
  g.add(a, b);
  const count = [a, b].reduce(
    (sum, m) =>
      sum +
      (m.geometry.index?.count ?? m.geometry.getAttribute("position").count),
    0,
  );
  batchDetails(g);
  assert.equal(g.children.length, 1);
  const geometry = (g.children[0] as T.Mesh).geometry;
  assert.equal(geometry.getAttribute("position").count, count);
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox!.max.x > 5);
});
test("角色保留頭部與四肢，步行只帶動可動關節", () => {
  for (let i = 0; i < 6; i++) {
    const model = createResident("#e59b83", false, i);
    const limbs = model.userData.limbs as T.Group[];
    assert.equal(limbs.length, 4);
    const rigid = model.children.filter((c) => !limbs.includes(c as T.Group));
    assert.ok(rigid.length > 0);
    animateResident(model, 1, true, 4);
    assert.ok(limbs.some((l) => l.rotation.x !== 0));
    assert.ok(rigid.every((m) => m.rotation.x === 0));
    model.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(model);
    assert.ok(bounds.max.y > 1.9);
  }
});
