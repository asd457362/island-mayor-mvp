import { mkdir } from "node:fs/promises";
await mkdir("work", { recursive: true });
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url =
  process.env.PARK_TEST_URL || "http://localhost:5173/island-mayor-mvp/";
await page.goto(url);
await page.evaluate(async () => {
  const { fresh } = await import("/island-mayor-mvp/src/game.ts");
  const s = fresh();
  s.elected = true;
  s.budget = 100000;
  s.tutorialEnabled = false;
  s.projects = [
    {
      id: "park",
      tier: 1,
      stage: 7,
      workers: 0,
      quality: 1,
      progress: 1,
      eventDone: true,
      cost: 0,
    },
  ];
  s.parkItems = [];
  localStorage.setItem("island-governor-v1", JSON.stringify(s));
});
await page.reload();
await page.getByText("繼續上次的故事", { exact: true }).click();
await page.locator('[data-action="park-edit"]').click();
await page.waitForTimeout(1500);
assert.equal(await page.locator("[data-kind]").count(), 20);
await page.locator('[data-kind="bench"]').click();
await page.locator("#world").click({ position: { x: 490, y: 380 } });
await page.locator('[data-park="rotate"]').click();
await page.locator('[data-park="confirm"]').click();
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("island-governor-v1")));
let s = await saved();
assert.equal(s.parkItems.length, 1);
assert.equal(s.parkItems[0].rotation, 90);
assert.equal(s.budget, 99400);
await page.screenshot({ path: "work/desktop.png" });
// Project stored world coordinates to canvas using the same fixed editor camera target after settling.
const item = s.parkItems[0];
const point = await page.evaluate(async (item) => {
  const T =
    await import("/island-mayor-mvp/node_modules/three/build/three.module.js");
  const cam = new T.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 250);
  cam.position.set(-14, 19.8, 9);
  cam.lookAt(-14, 0, -13);
  cam.updateMatrixWorld();
  const p = new T.Vector3(-14 + item.x, 1.5, -13 + item.z).project(cam);
  return { x: ((p.x + 1) * innerWidth) / 2, y: ((1 - p.y) * innerHeight) / 2 };
}, item);
await page.locator("#world").click({ position: point });
assert.equal(await page.locator('[data-park="remove"]').count(), 1);
await page.locator("#world").click({ position: { x: 430, y: 380 } });
await page.locator('[data-park="confirm"]').click();
s = await saved();
assert.equal(s.budget, 99400);
assert.notEqual(s.parkItems[0].x, item.x);

const moved = s.parkItems[0];
const movedPoint = await page.evaluate(async (item) => {
  const T =
    await import("/island-mayor-mvp/node_modules/three/build/three.module.js");
  const cam = new T.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 250);
  cam.position.set(-14, 19.8, 9);
  cam.lookAt(-14, 0, -13);
  cam.updateMatrixWorld();
  const p = new T.Vector3(-14 + item.x, 1.5, -13 + item.z).project(cam);
  return { x: ((p.x + 1) * innerWidth) / 2, y: ((1 - p.y) * innerHeight) / 2 };
}, moved);
await page.locator("#world").click({ position: movedPoint });
await page.locator('[data-park="remove"]').click();
assert.equal((await saved()).parkItems.length, 0);
assert.equal((await saved()).budget, 99700);
await page.locator('[data-kind="pine"]').click();
await page.locator("#world").click({ position: { x: 490, y: 380 } });
await page.locator('[data-park="confirm"]').click();
s = await saved();
assert.equal(s.budget, 98700);
await page.locator('[data-park="exit"]').click();
await page.reload();
await page.getByText("繼續上次的故事", { exact: true }).click();
assert.deepEqual((await saved()).parkItems, s.parkItems);
await page.locator('[data-action="park-edit"]').click();
await page.waitForTimeout(1200);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: "work/mobile.png" });
assert.equal(await page.locator('[data-park="exit"]').isVisible(), true);
await page.locator('[data-kind="lamp"]').click();
await page.locator('[data-park="cancel"]').click();
assert.equal((await saved()).budget, 98700);

await page.locator('[data-kind="lamp"]').click();
await page.locator("#world").click({ position: { x: 210, y: 350 } });
await page.locator('[data-park="rotate"]').click();
await page.screenshot({ path: "work/mobile-preview.png" });
await page.locator('[data-park="confirm"]').click();
assert.equal((await saved()).parkItems.length, 2);
assert.equal((await saved()).budget, 97900);
assert.deepEqual(errors, []);
console.log(
  "Browser desktop/mobile placement, rotation, selection, move, reload, cancel: PASS",
);
await browser.close();
