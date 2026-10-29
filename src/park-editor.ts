import * as T from "three";
import type { WorldManager } from "./world";
import type { State } from "./game";
import {
  catalog,
  definition,
  footprint,
  unlocked,
  commitItem,
  reclaimItem,
  placementError,
  type ParkItem,
} from "./park";
import { parkModel, previewModel, disposePreview } from "./park-models";
export function createParkEditor(
  world: WorldManager,
  state: () => State,
  save: () => void,
) {
  let active = false,
    draft: ParkItem | null = null,
    selection = "",
    ghost: T.Group | null = null,
    outline: T.BoxHelper | null = null;
  let previous: {
    mode: "city" | "walk";
    target: T.Vector3;
    zoom: number;
    yaw: number;
  };
  const root = document.createElement("section");
  root.className = "park-editor";
  root.hidden = true;
  document.body.append(root);
  const grid = new T.GridHelper(14, 28, "#729a85", "#b5c69a");
  grid.position.set(-14, 0.73, -13);
  grid.visible = false;
  world.scene.add(grid);
  const thumbs = new Map<string, string>();
  let thumbnailRenderer: T.WebGLRenderer | undefined;
  function thumbnail(kind: string) {
    if (thumbs.has(kind)) return thumbs.get(kind)!;
    const scene = new T.Scene();
    scene.background = new T.Color("#edf1dc");
    scene.add(new T.HemisphereLight("#fff4dc", "#789b88", 3));
    const model = parkModel(kind);
    scene.add(model);
    const cam = new T.PerspectiveCamera(40, 1, 0.1, 30);
    cam.position.set(5, 4.5, 6);
    cam.lookAt(0, 1, 0);
    const renderer = (thumbnailRenderer ??= new T.WebGLRenderer({
      antialias: true,
    }));
    renderer.setSize(100, 100);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL();
    thumbs.set(kind, url);
    return url;
  }
  function clearGhost() {
    if (ghost) {
      world.scene.remove(ghost);
      disposePreview(ghost);
      ghost = null;
    }
    if (outline) {
      world.scene.remove(outline);
      outline.geometry.dispose();
      (outline.material as T.Material).dispose();
      outline = null;
    }
  }
  function preview() {
    clearGhost();
    if (!draft) return;
    const error = placementError(state().parkItems ?? [], draft);
    ghost = previewModel(draft, !error);
    world.scene.add(ghost);
    const f = footprint(draft);
    const box = new T.Box3(
      new T.Vector3(-14 + draft.x - f.w / 2, 0.74, -13 + draft.z - f.d / 2),
      new T.Vector3(-14 + draft.x + f.w / 2, 0.8, -13 + draft.z + f.d / 2),
    );
    const helper = new T.Box3Helper(box, error ? 0xc45d53 : 0x246b61);
    world.scene.add(helper);
    outline = helper as unknown as T.BoxHelper;
  }
  function render(message = "") {
    if (!active) return;
    const p = draft && definition(draft.kind);
    root.innerHTML = `<div class="park-heading"><h2>布置曦光公園</h2><button data-park="exit">退出擺設</button></div><p>預算 $${state().budget.toLocaleString()} · 收回退原付款 50%，免費設施不退款。移動免費。</p>${!state().parkTutorialSeen ? '<p class="callout">選道具 → 點草地定位 → 旋轉 → 確認。點既有設施可移動或收回。R 旋轉、Esc 取消。所有變更確認後立即存檔。</p>' : ""}<div class="park-status" role="status">${message || (draft ? placementError(state().parkItems ?? [], draft) || "位置可用，請確認" : "選擇道具，或點選公園內既有設施")}</div>${p ? `<div class="park-actions"><b>${p.name} · ${draft!.x}, ${draft!.z} · ${draft!.rotation}°</b><button data-park="rotate">旋轉 90°</button><button data-park="confirm">確認${selection ? "移動" : "購買 $" + p.price}</button><button data-park="cancel">取消</button>${selection ? `<button data-park="remove">收回 +$${Math.floor(draft!.paid * 0.5)}</button>` : ""}</div>` : ""}<div class="park-catalog">${[
      ...new Set(catalog.map((p) => p.category)),
    ]
      .map(
        (category) =>
          `<details open><summary>${category}</summary><div class="park-cards">${catalog
            .filter((p) => p.category === category)
            .map(
              (p) =>
                `<button data-kind="${p.id}"><img src="${thumbnail(p.id)}" alt="${p.name}模型預覽"><b>${p.name}</b><small>$${p.price} · ${p.w}×${p.d}m<br>維護 $${p.maintenance}/日</small></button>`,
            )
            .join("")}</div></details>`,
      )
      .join("")}</div>`;
  }
  function cancel() {
    draft = null;
    selection = "";
    clearGhost();
    render();
  }
  function close() {
    cancel();
    active = false;
    document.body.classList.remove("park-editing");
    world.editingPark = false;
    root.hidden = true;
    grid.visible = false;
    world.controls.mode = previous.mode;
    world.controls.target.copy(previous.target);
    world.controls.zoom = previous.zoom;
    world.controls.yaw = previous.yaw;
    state().parkTutorialSeen = true;
    save();
  }
  root.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "button",
    );
    if (!button) return;
    try {
      if (button.dataset.kind) {
        selection = "";
        draft = {
          id: crypto.randomUUID(),
          kind: button.dataset.kind,
          x: 0,
          z: 0,
          rotation: 0,
          paid: 0,
        };
        preview();
        render();
        return;
      }
      switch (button.dataset.park) {
        case "exit":
          close();
          break;
        case "cancel":
          cancel();
          break;
        case "rotate":
          if (draft) {
            draft.rotation = (draft.rotation + 90) % 360;
            preview();
            render();
          }
          break;
        case "confirm":
          if (draft) {
            commitItem(state(), draft);
            save();
            world.sync(state());
            cancel();
          }
          break;
        case "remove":
          reclaimItem(state(), selection);
          save();
          world.sync(state());
          cancel();
          break;
      }
    } catch (error) {
      render((error as Error).message);
    }
  });
  world.canvas.addEventListener("pointerup", (e) => {
    if (!active) return;
    const rect = world.canvas.getBoundingClientRect();
    const pointer = new T.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    world.ray.setFromCamera(pointer, world.camera);
    if (!draft) {
      const hit = world.ray.intersectObjects(world.parkGroup.children, true)[0];
      if (hit) {
        let object: T.Object3D | null = hit.object;
        while (object && !object.userData.parkId) object = object.parent;
        const item = state().parkItems?.find(
          (p) => p.id === object?.userData.parkId,
        );
        if (item) {
          selection = item.id;
          draft = { ...item };
        }
      }
    } else {
      const point = new T.Vector3();
      if (
        world.ray.ray.intersectPlane(
          new T.Plane(new T.Vector3(0, 1, 0), -0.72),
          point,
        )
      ) {
        draft.x = Math.round((point.x + 14) * 2) / 2;
        draft.z = Math.round((point.z + 13) * 2) / 2;
      }
    }
    preview();
    render();
  });
  window.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "Escape") cancel();
    if (e.key.toLowerCase() === "r" && draft) {
      draft.rotation = (draft.rotation + 90) % 360;
      preview();
      render();
    }
  });
  return {
    get active() {
      return active;
    },
    open() {
      if (!unlocked(state()))
        throw Error("請先當選里長，完成曦光公園工程並公布成效後，即可布置。");
      previous = {
        mode: world.controls.mode,
        target: world.controls.target.clone(),
        zoom: world.controls.zoom,
        yaw: world.controls.yaw,
      };
      active = true;
      document.body.classList.add("park-editing");
      world.editingPark = true;
      world.drag = false;
      world.player.keys.clear();
      world.player.stick = { x: 0, y: 0 };
      world.controls.mode = "city";
      world.controls.target.set(-14, 0, -13);
      world.controls.zoom = 22;
      world.controls.yaw = 0;
      root.hidden = false;
      grid.visible = true;
      render();
    },
  };
}
