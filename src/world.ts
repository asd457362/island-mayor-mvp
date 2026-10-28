import * as T from "three";
import { citizens, issues } from "./data";
import type { State } from "./game";
export class CameraController {
  mode: "city" | "walk" = "city";
  yaw = 0.5;
  zoom = 64;
  target = new T.Vector3();
  toggle() {
    this.mode = this.mode === "city" ? "walk" : "city";
  }
}
export class PlayerController {
  position = new T.Vector3(0, 0, 3);
  keys = new Set<string>();
  stick = { x: 0, y: 0 };
}
export class WorldManager {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 250);
  renderer: T.WebGLRenderer;
  controls = new CameraController();
  player = new PlayerController();
  avatar = new T.Group();
  npcs: T.Group[] = [];
  markers: T.Mesh[] = [];
  visuals = new Map<string, T.Group>();
  colliders: { x: number; z: number; w: number; d: number }[] = [];
  ray = new T.Raycaster();
  pointer = new T.Vector2();
  onSelect: (id: string) => void = () => {};
  drag = false;
  last = { x: 0, y: 0 };
  distance = 0;
  shadows = true;
  constructor(public canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.setClearColor("#a8d9dd");
    this.scene.fog = new T.Fog("#a8d9dd", 100, 190);
    this.scene.add(new T.HemisphereLight("#fff3d6", "#507f85", 2.5));
    const sun = new T.DirectionalLight("#fff1d5", 3);
    sun.position.set(-25, 45, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -45,
      right: 45,
      top: 45,
      bottom: -45,
    });
    this.scene.add(sun);
    this.box(0, -1.8, 0, 150, 1, 150, "#72b9ca");
    this.box(0, -0.7, 0, 57, 2, 57, "#d4bf8e");
    this.box(0, 0.1, 0, 54, 0.5, 54, "#9dbb8c");
    this.box(0, 0.4, 0, 53, 0.12, 6, "#536770");
    this.box(0, 0.4, 0, 6, 0.12, 53, "#536770");
    for (let i = -24; i <= 24; i += 4) {
      this.box(i, 0.48, 0, 1.8, 0.03, 0.13, "#efe8cf");
      this.box(0, 0.48, i, 0.13, 0.03, 1.8, "#efe8cf");
    }
    for (let i = 0; i < 6; i++) {
      this.box(-4 + i * 1.6, 0.5, 4, 0.8, 0.03, 2, "#f1eacf");
      this.box(4, 0.5, -4 + i * 1.6, 2, 0.03, 0.8, "#f1eacf");
    }
    this.box(-14, 0.4, -13, 17, 0.3, 16, "#a4c982");
    this.building(15, -15, 12, 8, 4, "#f1d29a", "幸福市場");
    this.building(0, 22, 11, 5, 5, "#f1c8b1", "幸福小學");
    this.building(-15, 20, 10, 8, 5, "#e9d7b4", "里民活動中心");
    this.building(16, 10, 10, 8, 5, "#e7af94", "街角商店");
    for (const [x, z, c] of [
      [-20, 8, "#b7c6ce"],
      [-10, 9, "#e6d7bb"],
      [10, -23, "#c0cbb4"],
      [23, -4, "#e6bdab"],
      [-23, -24, "#e6c2ab"],
    ] as [number, number, string][])
      this.building(x, z, 6, 6, 7, c, "幸福公寓");
    for (let i = 0; i < 22; i++) {
      const a = i * 2.4;
      const x = Math.cos(a) * 24,
        z = Math.sin(a) * 24;
      if (Math.abs(x) > 5 && Math.abs(z) > 5) this.tree(x, z);
    }
    for (let i = 0; i < 5; i++) {
      this.box(9 + i * 2.8, 0.55, -7, 2.2, 0.1, 4, "#d9cfb6");
      this.box(
        9 + i * 2.8,
        1.05,
        -7,
        1.5,
        0.8,
        2.7,
        ["#edc274", "#8eb3b7", "#ec927c"][i % 3],
      );
    }
    issues.forEach((i, index) => {
      const m = new T.Mesh(
        new T.OctahedronGeometry(0.65),
        new T.MeshStandardMaterial({
          color: i.color,
          emissive: i.color,
          emissiveIntensity: 0.2,
        }),
      );
      m.position.set(i.x, 5, i.z);
      m.userData.id = i.id;
      this.scene.add(m);
      this.markers.push(m);
      const g = new T.Group();
      g.position.set(i.x, 0.5, i.z);
      this.scene.add(g);
      this.visuals.set(i.id, g);
      if (index === 0) {
        this.box(i.x, 0.7, i.z, 7, 0.3, 6, "#d6b48a");
      }
    });
    this.avatar = this.person("#e8ab5c", true);
    this.scene.add(this.avatar);
    citizens.forEach((c) => {
      const p = this.person(
        ["#e59b83", "#8fb9b2", "#d6b56e", "#b09dc5"][c.id % 4],
      );
      p.position.set(c.x, 0.5, c.z);
      p.userData.id = c.id;
      this.scene.add(p);
      this.npcs.push(p);
    });
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("keydown", (e) => {
      if (["INPUT", "SELECT"].includes((e.target as HTMLElement).tagName))
        return;
      this.player.keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "v") this.controls.toggle();
    });
    window.addEventListener("keyup", (e) =>
      this.player.keys.delete(e.key.toLowerCase()),
    );
    window.addEventListener("blur", () => this.player.keys.clear());
    canvas.addEventListener("pointerdown", (e) => {
      this.drag = true;
      this.distance = 0;
      this.last = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.last.x,
        dy = e.clientY - this.last.y;
      this.distance += Math.abs(dx) + Math.abs(dy);
      if (e.shiftKey && this.controls.mode === "city") {
        this.controls.target.x -= dx * 0.06;
        this.controls.target.z -= dy * 0.06;
      } else {
        this.controls.yaw -= dx * 0.007;
        if (this.controls.mode === "city")
          this.controls.zoom = T.MathUtils.clamp(
            this.controls.zoom + dy * 0.08,
            25,
            95,
          );
      }
      this.last = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener("pointerup", (e) => {
      this.drag = false;
      if (this.distance > 8) return;
      this.pointer.set(
        (e.clientX / innerWidth) * 2 - 1,
        (-e.clientY / innerHeight) * 2 + 1,
      );
      this.ray.setFromCamera(this.pointer, this.camera);
      const hit = this.ray.intersectObjects(this.markers)[0];
      if (hit) this.onSelect(hit.object.userData.id);
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.controls.zoom = T.MathUtils.clamp(
          this.controls.zoom + e.deltaY * 0.04,
          25,
          95,
        );
      },
      { passive: false },
    );
    this.resize();
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    parent: T.Object3D = this.scene,
  ) {
    const m = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshStandardMaterial({ color, roughness: 0.9 }),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  building(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    color: string,
    name: string,
  ) {
    const g = new T.Group();
    this.scene.add(g);
    this.box(x, h / 2 + 0.5, z, w, h, d, color, g);
    this.box(x, h + 0.6, z, w + 0.5, 0.4, d + 0.5, "#527b7c", g);
    for (let i = -w / 2 + 1; i < w / 2; i += 2) {
      this.box(x + i, h * 0.6, z + d / 2 + 0.03, 0.8, 1, 0.08, "#709eab", g);
    }
    this.box(x, 1.5, z + d / 2 + 0.1, 1.4, 2, 0.2, "#536f6e", g);
    this.colliders.push({ x, z, w: w + 1, d: d + 1 });
    this.label(name, x, h + 2, z);
  }
  label(text: string, x: number, y: number, z: number) {
    const c = document.createElement("canvas");
    c.width = 384;
    c.height = 80;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#f7f4e9";
    ctx.beginPath();
    ctx.roundRect(0, 0, 384, 80, 18);
    ctx.fill();
    ctx.fillStyle = "#254d4c";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 192, 52);
    const sp = new T.Sprite(
      new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false }),
    );
    sp.position.set(x, y, z);
    sp.scale.set(7, 1.5, 1);
    this.scene.add(sp);
  }
  tree(x: number, z: number) {
    this.box(x, 1.1, z, 0.45, 2, 0.45, "#9d8261");
    const m = new T.Mesh(
      new T.IcosahedronGeometry(1.8, 0),
      new T.MeshStandardMaterial({ color: "#609b7a" }),
    );
    m.position.set(x, 3, z);
    m.castShadow = true;
    this.scene.add(m);
  }
  person(color: string, player = false) {
    const g = new T.Group();
    this.box(0, 0.9, 0, 0.65, 0.85, 0.45, color, g);
    this.box(0, 1.65, 0, 0.57, 0.57, 0.55, "#f3d5b0", g);
    this.box(0, 1.98, 0, 0.65, 0.17, 0.6, player ? "#f2c66c" : "#665950", g);
    this.box(-0.2, 0.3, 0, 0.22, 0.6, 0.25, "#456879", g);
    this.box(0.2, 0.3, 0, 0.22, 0.6, 0.25, "#456879", g);
    return g;
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  sync(s: State) {
    issues.forEach((i) => {
      const g = this.visuals.get(i.id)!;
      const complete = s.projects.some((p) => p.id === i.id && p.stage === 7);
      const stage = s.projects.find((p) => p.id === i.id)?.stage ?? -1;
      const key = `${complete}-${stage}`;
      if (g.userData.key === key) return;
      g.userData.key = key;
      while (g.children.length) {
        const child = g.children[0] as T.Mesh;
        g.remove(child);
        child.geometry?.dispose();
        if (child.material instanceof T.Material) child.material.dispose();
      }
      if (i.id === "park") {
        this.box(-2, 0.4, 0, 0.5, 0.7, 4, complete ? "#eac36b" : "#80776b", g);
        this.box(2, 0.4, 0, 0.5, 0.7, 4, complete ? "#eac36b" : "#80776b", g);
        this.box(0, 2, 0, 5, 0.3, 0.4, complete ? "#ed9d7f" : "#877d6a", g);
        this.box(0, 1, 0, 1.5, 0.2, 1, complete ? "#65babb" : "#9b8974", g);
        if (complete) this.box(3, 0.5, 2, 2, 0.7, 2, "#e4b669", g);
      } else if (i.id === "light") {
        this.box(0, 2, 0, 0.2, 4, 0.2, "#536b70", g);
        this.box(0, 4, 0, 1.4, 0.3, 0.7, complete ? "#ffdf88" : "#6e7b7b", g);
        if (complete) {
          const light = new T.PointLight("#ffe3a1", 18, 12);
          light.position.y = 4;
          g.add(light);
          this.box(0, 0.02, 0, 4, 0.03, 4, "#e5dca1", g);
        }
      } else if (i.id === "drain") {
        this.box(0, 0.05, -2, 8, 0.06, 3, complete ? "#7f9193" : "#76bbce", g);
        if (complete)
          for (let n = -3; n <= 3; n++)
            this.box(n, 0.1, -2, 0.15, 0.05, 2, "#435b62", g);
      } else {
        this.box(0, 0.3, 0, 2, 0.6, 1, complete ? "#88bda4" : "#d68e70", g);
      }
      if (stage === 4) {
        for (let j = -1; j <= 1; j++)
          this.box(j * 2, 0.5, 3, 0.5, 1, 0.5, "#eea15d", g);
      }
      this.markers.find((m) => m.userData.id === i.id)!.visible = !complete;
    });
  }
  update(dt: number, time: number, s: State) {
    const p = this.player;
    let dx = (p.keys.has("d") ? 1 : 0) - (p.keys.has("a") ? 1 : 0) + p.stick.x,
      dz = (p.keys.has("s") ? 1 : 0) - (p.keys.has("w") ? 1 : 0) + p.stick.y;
    const moving = Math.hypot(dx, dz) > 0.1;
    if (this.controls.mode === "walk" && moving) {
      const len = Math.max(1, Math.hypot(dx, dz));
      dx /= len;
      dz /= len;
      const angle = this.controls.yaw;
      const nx =
          p.position.x + (dx * Math.cos(angle) + dz * Math.sin(angle)) * dt * 7,
        nz =
          p.position.z +
          (-dx * Math.sin(angle) + dz * Math.cos(angle)) * dt * 7;
      if (
        !this.colliders.some(
          (c) => Math.abs(nx - c.x) < c.w / 2 && Math.abs(nz - c.z) < c.d / 2,
        )
      ) {
        p.position.x = T.MathUtils.clamp(nx, -26, 26);
        p.position.z = T.MathUtils.clamp(nz, -26, 26);
      }
      this.avatar.rotation.y = Math.atan2(dx, dz) + angle;
      this.avatar.children
        .slice(3)
        .forEach(
          (leg, index) =>
            (leg.rotation.x = Math.sin(time * 12 + index * Math.PI) * 0.4),
        );
    }
    this.avatar.position.copy(p.position);
    this.avatar.position.y =
      0.5 +
      (moving && this.controls.mode === "walk"
        ? Math.sin(time * 12) * 0.06
        : 0);
    s.position = { x: p.position.x, z: p.position.z };
    this.npcs.forEach((npc, j) => {
      const c = citizens[j];
      npc.position.x = c.x + Math.sin(time * 0.25 + j) * 1.5;
      npc.position.z = c.z + Math.cos(time * 0.25 + j) * 1.5;
      npc.rotation.y = time * 0.25 + j;
    });
    this.markers.forEach((m, i) => {
      m.rotation.y = time;
      m.position.y = 5 + Math.sin(time * 2 + i) * 0.3;
    });
    if (this.controls.mode === "city") {
      if (moving) {
        this.controls.target.x += dx * dt * 12;
        this.controls.target.z += dz * dt * 12;
      }
      const t = this.controls.target;
      this.camera.position.lerp(
        new T.Vector3(
          t.x + Math.sin(this.controls.yaw) * this.controls.zoom,
          t.y + this.controls.zoom * 0.9,
          t.z + Math.cos(this.controls.yaw) * this.controls.zoom,
        ),
        0.08,
      );
      this.camera.lookAt(t);
    } else {
      this.camera.position.lerp(
        new T.Vector3(
          p.position.x + Math.sin(this.controls.yaw) * 9,
          7,
          p.position.z + Math.cos(this.controls.yaw) * 9,
        ),
        0.1,
      );
      this.camera.lookAt(p.position.x, 1.5, p.position.z);
    }
    this.renderer.render(this.scene, this.camera);
  }
  nearest() {
    let distance = Infinity,
      id = -1;
    this.npcs.forEach((n, i) => {
      const d = n.position.distanceTo(this.player.position);
      if (d < distance) {
        distance = d;
        id = i;
      }
    });
    return { id, distance };
  }
}
