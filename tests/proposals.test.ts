import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeProposal,
  confirmProposal,
  extraCost,
  extraMaintenance,
} from "../src/proposals";
import { fresh, ProjectManager, SaveManager } from "../src/game";
import { createLandscape } from "../src/landscape";
import * as T from "three";
test("自由輸入整理建設；否定項目不誤列、不支援工程有提示", () => {
  const p = analyzeProposal(
    "整理公園，種樹和花，加上長椅與步道，晚上要照明",
    "park",
  );
  assert.deepEqual(p.features, [
    "trees",
    "flowers",
    "benches",
    "paths",
    "lights",
    "clean",
  ]);
  assert.equal(p.tier, 2);
  assert.equal(
    analyzeProposal(
      "整理公園但不要種樹，增加長椅休息",
      "park",
    ).features.includes("trees"),
    false,
  );
  assert.ok(
    analyzeProposal("整理公園並且新建一座捷運站", "park").warnings.some((w) =>
      w.includes("超出里長權限"),
    ),
  );
  assert.throws(() => analyzeProposal("美化", "park"));
});
test("確認政見不給XP，費用與維護會納入工程；完工才給一次成果獎勵", () => {
  const s = fresh();
  s.discovered = ["park"];
  s.elected = true;
  s.budget = 200000;
  const p = analyzeProposal("整治公園，增加花圃及長椅讓大家休息", "park");
  confirmProposal(s, p);
  assert.equal(s.xp, 0);
  assert.equal(s.credit, 50);
  p.features = [];
  assert.ok(s.customProposals!.park.features.length > 0);
  ProjectManager.plan(s, "park", 1, 2, 1);
  const project = s.projects[0];
  assert.equal(project.cost, 47000 + extraCost(project.proposal));
  ProjectManager.advance(s, "park");
  assert.equal(s.budget, 200000 - project.cost);
  project.stage = 6;
  ProjectManager.advance(s, "park");
  assert.equal(s.xp, 100);
  assert.equal(s.credit, 60);
  assert.equal(s.maintenance, 120 + extraMaintenance(project.proposal));
  ProjectManager.advance(s, "park");
  assert.equal(s.xp, 100);
  assert.throws(() => confirmProposal(s, s.customProposals!.park));
});
test("前後景觀有可見差異，新增設施會真的改變幾何且可存檔", () => {
  const before = createLandscape("park", false),
    after = createLandscape("park", true, [
      "trees",
      "flowers",
      "benches",
      "paths",
      "lights",
      "clean",
    ]);
  function vertices(g: T.Group) {
    let n = 0;
    g.traverse((m) => {
      if (m instanceof T.Mesh) n += m.geometry.getAttribute("position").count;
    });
    return n;
  }
  assert.ok(vertices(after) > vertices(before));
  assert.ok(
    vertices(createLandscape("light", true, ["trees"])) >
      vertices(createLandscape("light", true, [])),
  );
  const memory = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      setItem: (k: string, v: string) => memory.set(k, v),
      getItem: (k: string) => memory.get(k),
    },
    configurable: true,
  });
  const s = fresh();
  s.discovered = ["park"];
  confirmProposal(s, analyzeProposal("整理公園，加花圃讓居民休息", "park"));
  SaveManager.save(s);
  assert.deepEqual(SaveManager.load()?.customProposals, s.customProposals);
});
