import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  PolicyManager,
  ElectionManager,
  ProjectManager,
  TimeManager,
  EventManager,
  FinanceManager,
  StaffManager,
  SaveManager,
} from "../src/game";
function campaign() {
  const s = fresh();
  for (const id of ["park", "light", "drain"]) {
    PolicyManager.investigate(s, id);
    PolicyManager.promise(s, id, 1);
  }
  s.talked = Array.from({ length: 24 }, (_, i) => i);
  return s;
}
test("選票統計由政策與居民走訪決定", () => {
  const s = campaign();
  const r = ElectionManager.run(s, () => 0.5);
  assert.equal(r.won, true);
  assert.equal(r.player + r.opponent, 100);
  assert.equal(r.breakdown.length, 4);
  assert.equal(s.budget, 120000);
  assert.equal(r.votes, Math.round((1200 * r.turnout) / 100));
});
test("敗選保留 XP、扣除 CP 並有冷卻", () => {
  const s = campaign();
  s.talked = [];
  s.credit = 0;
  s.xp = 90;
  const cp = s.cp;
  assert.equal(ElectionManager.run(s, () => 0).won, false);
  assert.equal(s.xp, 90);
  assert.equal(s.cp, cp - 40);
  assert.equal(s.nextElection, 8);
  assert.throws(() => ElectionManager.run(s));
  TimeManager.tick(s, 7);
  assert.ok(s.cp >= 40);
});
test("財政不允許透支；補助有上限", () => {
  const s = fresh();
  assert.throws(() => FinanceManager.spend(s, 1, "test"));
  s.elected = true;
  for (let i = 0; i < 3; i++) FinanceManager.grant(s);
  assert.equal(s.budget, 60000);
  assert.throws(() => FinanceManager.grant(s));
});
test("工程全流程、時間暫停事件、XP與持續維護", () => {
  const s = campaign();
  ElectionManager.run(s, () => 0.5);
  ProjectManager.plan(s, "park", 1, 2, 1);
  assert.equal(s.projects[0].stage, 0);
  for (let i = 0; i < 4; i++) ProjectManager.advance(s, "park");
  assert.equal(StaffManager.available(s), 4);
  TimeManager.tick(s, 1);
  assert.ok(s.event);
  const progress = s.projects[0].progress;
  TimeManager.tick(s, 2);
  assert.equal(s.projects[0].progress, progress);
  EventManager.resolve(s, true);
  TimeManager.tick(s, 4);
  assert.equal(s.projects[0].stage, 5);
  ProjectManager.advance(s, "park");
  ProjectManager.advance(s, "park");
  assert.equal(s.projects[0].stage, 7);
  assert.equal(s.xp, 80);
  assert.equal(StaffManager.available(s), 6);
  assert.ok(s.maintenance > 0);
});
test("人力不可超額分配", () => {
  const s = campaign();
  s.elected = true;
  s.budget = 300000;
  for (const id of ["park", "light", "drain"]) {
    ProjectManager.plan(s, id, 0, 3, 0);
    ProjectManager.advance(s, id);
  }
  for (const id of ["park", "light"]) ProjectManager.advance(s, id);
  assert.equal(StaffManager.available(s), 0);
  assert.throws(() => ProjectManager.advance(s, "drain"));
});
test("存檔往返保留工程和城市成果、損毀存檔安全返回", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      setItem: (k: string, v: string) => memory.set(k, v),
      getItem: (k: string) => memory.get(k),
    },
    configurable: true,
  });
  const s = campaign();
  s.elected = true;
  s.budget = 100000;
  ProjectManager.plan(s, "light", 0, 1, 1);
  s.projects[0].stage = 7;
  s.xp = 80;
  SaveManager.save(s);
  assert.deepEqual(SaveManager.load(), s);
  memory.set("island-governor-v1", "broken");
  assert.equal(SaveManager.load(), null);
});
