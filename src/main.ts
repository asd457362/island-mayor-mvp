import {
  analyzeProposal,
  confirmProposal,
  improvements,
  extraCost,
  type CustomProposal,
} from "./proposals";
import "./style.css";
import { citizens, issues, tiers, stages, roles } from "./data";
import {
  GameManager,
  SaveManager,
  fresh,
  PolicyManager,
  CitizenManager,
  ElectionManager,
  ProjectManager,
  FinanceManager,
  StaffManager,
  TimeManager,
  CareerManager,
  EventManager,
} from "./game";
import { tutorialStep } from "./tutorial";
import { WorldManager } from "./world";
const app = document.querySelector<HTMLDivElement>("#app")!;
let world: WorldManager;
try {
  world = new WorldManager(document.querySelector("#world")!);
} catch {
  app.innerHTML =
    '<div class="menu"><h1>需要 WebGL 支援</h1><p>請開啟瀏覽器硬體加速後重新載入。</p></div>';
  throw Error("WebGL unavailable");
}
const game = new GameManager();
let started = false,
  tab = "",
  selected = issues[0].id,
  speed = 1,
  last = performance.now(),
  saveTimer = 0,
  uiTimer = 0,
  toastTimer = 0;
let message = "";
let citizenId = 0;
let menu = true;
let proposalDraft: CustomProposal | null = null;
const proposalText: Record<string, string> = {};
const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] || c,
  );
const money = (v: number) => "$" + Math.round(v).toLocaleString();
const s = () => game.state;
const finished = () => s().projects.filter((p) => p.stage === 7).length;
function notify(text: string) {
  message = text;
  toastTimer = 5;
  render();
}
function act(fn: () => void) {
  try {
    fn();
    game.save();
    world.sync(s());
    render();
  } catch (e) {
    notify((e as Error).message);
  }
}
function start(load: boolean) {
  game.state = load ? SaveManager.load() || fresh() : fresh();
  proposalDraft = null;
  Object.keys(proposalText).forEach((key) => delete proposalText[key]);
  started = true;
  menu = false;
  tab = "guide";
  world.player.position.set(s().position.x, 0, s().position.z);
  world.sync(s());
  game.save();
  render();
}
const btn = (text: string, action: string, cls = "") =>
  `<button class="${cls}" data-action="${action}">${text}</button>`;
function proposalPanel() {
  const saved = s().customProposals?.[selected];
  const draft = proposalDraft?.issueId === selected ? proposalDraft : null;
  const built = s().projects.some((p) => p.id === selected);
  return `<section class="proposal"><div class="eyebrow">YOUR IDEA, YOUR NEIGHBOURHOOD</div><h3>這個地方，你想怎麼改變？</h3><p>用自己的話提案，再確認實際建設清單。完工後，這裡會真的長出你選的設施。</p>${
    saved
      ? `<div class="callout"><b>已確認的自行提案</b><p>${escapeHtml(saved.text)}</p>${improvements
          .filter((f) => saved.features.includes(f.id))
          .map((f) => `<span class="feature-tag">${f.name}</span>`)
          .join(
            "",
          )}<p>美化追加 ${money(extraCost(saved))} · ${tiers[saved.tier].name}<br>${built ? "已納入工程，完成後永久保留。" : "下方選擇「規劃這項工程」即會納入美化費與設施。更改為制式政見會取代此提案。"}</p></div>`
      : ""
  }${built ? "" : `<label for="proposal-text">描述你的想法（8～600 字）</label><textarea id="proposal-text" maxlength="600" rows="4" placeholder="例如：整理公園，鋪平步道、種樹和花，加長椅讓長者休息，晚上設照明。">${escapeHtml(proposalText[selected] ?? saved?.text ?? "")}</textarea><small>目前為免費文字規則整理，沒有呼叫付費 AI。</small>${btn("整理我的提案", "analyze-proposal", "primary")}${draft ? `<div class="proposal-review"><h3>確認會實際建造的項目</h3>${improvements.map((f) => `<label class="feature-check"><input type="checkbox" data-feature="${f.id}" ${draft.features.includes(f.id) ? "checked" : ""}>${f.name}<span>+${money(f.cost)}</span></label>`).join("")}<p>地點：${issues.find((i) => i.id === selected)!.place}（本版提供固定治理地點）</p>${draft.feedback.map((t) => `<p>${t}</p>`).join("")}${draft.warnings.map((t) => `<p class="small">${t}</p>`).join("")}<p>預算依勾選清單與規模計算；確認後會顯示金額，尚未開工不扣款。</p>${btn("確認並列入我的政見", "confirm-proposal", "primary")}</div>` : ""}`}</section>`;
}
function issuePanel() {
  const i = issues.find((i) => i.id === selected)!;
  const known = s().discovered.includes(i.id);
  return `<div class="eyebrow">COMMUNITY FIELD NOTES</div><h2>${i.name}</h2><p class="muted">${i.place} · 關注群體：${i.group}</p><div class="callout">${known ? "調查完成：居民希望改善生活，但也在意施工干擾與公帑運用。" : "前往地標，按「現地調查」收集需求；俯瞰模式可直接選取地標展開現勘。"}</div>${known ? "" : btn("現地調查 +5 CP", "investigate", "primary")}${known ? proposalPanel() : ""}<h3>選擇你的治理承諾</h3>${tiers.map((t, n) => `<article class="option ${s().promises[i.id] === n ? "chosen" : ""}"><div><b>${t.name}</b><span>${money(t.cost)} 基礎預算 · ${t.days} 天</span></div><p>改善 +${t.effect} · 風險 ${t.risk * 100}% · 維護 ${money(t.maintenance)}/天<br>支持：${i.group}；反對：施工周邊商戶／節支選民</p>${btn(s().promises[i.id] === n ? "✓ 已列入政見" : "列入政見", `promise:${n}`)}${s().elected ? btn("規劃這項工程", `plan:${n}`, "primary") : ""}</article>`).join("")}${s().elected ? '<label>工程人力（共 6 位）<select id="workers"><option value="1">1 人 · 節省人事</option><option value="2" selected>2 人 · 工期減半</option><option value="3">3 人 · 工期縮短至 ⅓</option></select></label><label>材料品質<select id="quality"><option value="0">經濟：低初期成本、雙倍維護</option><option value="1" selected>標準：平衡成本</option><option value="2">優質：工期 +20%、初期成本較高</option></select></label>' : ""}<p class="small">實際工程費 = 基礎 + 材料 × 品質係數 + 人事 × 人數。大型工程需上級核准；行政人員 2 位常設協助。</p>`;
}
function panel() {
  if (tab === "guide")
    return `<div class="eyebrow">YOUR FIRST TERM</div><h2>每一次改變，從聆聽開始。</h2><p class="muted">你是幸福里的普通居民。走進街道，讓承諾成為值得信任的成果。</p>${[
      [
        "01",
        "走訪與調查",
        `已調查 ${s().discovered.length}/5 個議題。點地圖菱形或下方議題開始。`,
      ],
      [
        "02",
        "提出政見，參與選舉",
        `至少 3 項政見、40 CP。已提出 ${Object.keys(s().promises).length} 項。`,
      ],
      [
        "03",
        "把承諾變成工程",
        `當選後有 $120,000、6 位工程人員。已完成 ${finished()} 項。`,
      ],
      ["04", "繼續你的政治生涯", `完成工程取得 XP；區長門檻 300 XP。`],
    ]
      .map(
        (a) =>
          `<div class="step"><b>${a[0]}</b><div><h3>${a[1]}</h3><p>${a[2]}</p></div></div>`,
      )
      .join(
        "",
      )}<div class="issue-links">${issues.map((i) => btn(i.name, `issue:${i.id}`)).join("")}</div>`;
  if (tab === "issue") return issuePanel();
  if (tab === "citizen") {
    const c = citizens[citizenId];
    return `<div class="eyebrow">MEET YOUR NEIGHBOURS</div><h2>${c.name}</h2><p>${c.age} 歲 · ${c.job} · ${c.group}</p><div class="callout">${c.home} · 收入層級 ${c.income}<br>關注：${issues.find((i) => i.group === c.group)?.name}<br>支持 ${Math.min(100, c.support + (s().talked.includes(c.id) ? 12 : 0))} · 信任 ${c.trust} · 投票意願 ${c.turnout}%</div>${btn(s().talked.includes(c.id) ? "再聽聽居民的想法" : "傾聽與協調 +3 CP", `talk:${c.id}`, "primary")}<h3>幸福里居民 · ${s().talked.length}/24 已走訪</h3><div class="people">${citizens.map((c) => btn(c.name, `citizen:${c.id}`, s().talked.includes(c.id) ? "chosen" : "")).join("")}</div>`;
  }
  if (tab === "election") {
    const r = s().election;
    return `<div class="eyebrow">LOCAL ELECTION · 幸福里</div><h2>${s().elected ? "謝謝每一份託付。" : "讓幸福里，向前一步。"}</h2><p class="muted">對手：現任里長 許安民 · 主張維持現狀與財政穩健。</p><div class="callout">競選準備 ${s().cp}/100 CP · 調查 ${s().discovered.length}/3 · 政見 ${Object.keys(s().promises).length}/3<br>下次選舉：第 ${s().nextElection} 天起</div>${Object.entries(
      s().promises,
    )
      .map(
        ([id, t]) =>
          `<p>✓ ${issues.find((i) => i.id === id)?.name} · ${tiers[t].name}</p>`,
      )
      .join(
        "",
      )}${!s().elected ? btn("參加里長選舉 · 消耗 40 CP", "elect", "primary") : btn("開始履行承諾", "tab:projects", "primary")}${r ? `<h3>${r.won ? "當選里長" : "本次未當選"}</h3><div class="vote"><strong>${r.player}%</strong><span>你 ／ 對手 ${r.opponent}%</span></div><div class="progress"><i style="width:${r.player}%"></i></div><p>投票率 ${r.turnout}% · 有效票 ${r.votes.toLocaleString()}</p>${r.breakdown.map((g) => `<p>${g.group}<span class="right">${g.support.toFixed(1)}% 支持</span></p>`).join("")}<p class="small">${r.explanation}</p>${!r.won ? "<p>敗選保留 XP。每天恢復 4 CP，也可走訪尚未互動的居民；7 天後再次參選。</p>" : ""}` : ""}`;
  }
  if (tab === "projects")
    return `<div class="eyebrow">GOVERNANCE DESK</div><h2>一份承諾，七個步驟。</h2><p class="muted">${s().elected ? "行政人員 2 位 · 行政能力 60 · 工程人員效率 100%" : "居民尚無工程執行權。請先完成競選。"}</p><div class="callout">可用工程人力 ${StaffManager.available(s())}/6 · 可用預算 ${money(s().budget)}</div>${s()
      .projects.map(
        (p) =>
          `<article class="option"><h3>${issues.find((i) => i.id === p.id)?.name}</h3><p>${tiers[p.tier].name} · ${p.workers} 人 · ${money(p.cost)}</p>${
            p.proposal
              ? `<p>自行提案：${escapeHtml(p.proposal.text)}</p><p>${improvements
                  .filter((f) => p.proposal!.features.includes(f.id))
                  .map((f) => f.name)
                  .join(" · ")}</p>`
              : ""
          }<div class="stage">${stages.map((x, n) => `<span class="${n <= p.stage ? "active" : ""}">${x}</span>`).join("")}</div><div class="progress"><i style="width:${p.progress * 100}%"></i></div><p>${stages[p.stage]} · ${Math.round(p.progress * 100)}%</p>${p.stage === 4 ? '<p class="small">工程隨時間自動推進；遇重大事件會暫停。</p>' : p.stage < 7 ? btn(["編列並支付預算", "指派工程人員", "申請主管機關核准", "開始施工", "", "辦理驗收", "公布成效，獲得 XP"][p.stage], `advance:${p.id}`, "primary") : `<b class="success">✓ 已改善城市 · 人力釋回</b>${btn("看看整治後的模樣", `visit:${p.id}`)}`}</article>`,
      )
      .join(
        "",
      )}${issues.map((i) => btn(`＋ ${i.name}`, `issue:${i.id}`)).join("")}`;
  if (tab === "finance")
    return `<div class="eyebrow">BUDGET & PEOPLE</div><h2>每一筆公帑，都有去向。</h2><div class="big-stat">${money(s().budget)}<small>可用預算</small></div>${s().budget < 15000 ? '<div class="warning">預算偏低，請評估補助與後續維護需求。</div>' : ""}<p>初始任期預算 <span class="right">${s().elected ? "$120,000" : "尚未取得"}</span></p><p>累計補助收入 <span class="right">${money(s().subsidy)}</span></p><p>工程與事件支出 <span class="right">${money(s().spending)}</span></p><p>每日維護 <span class="right">${money(s().maintenance)}</span></p>${btn("申請地方補助 +$20,000", "grant", "primary")}<p class="small">每任期上限 $60,000。人事費已納入工程費；可用工程人力 ${StaffManager.available(s())}/6，常設行政人員 2 位。</p><h3>公開財政與施政紀錄</h3>${s()
      .log.slice(0, 25)
      .map((l) => `<div class="log">${l}</div>`)
      .join("")}`;
  if (tab === "career")
    return `<div class="eyebrow">A CAREER IN PUBLIC SERVICE</div><h2>先做好眼前的小事。</h2><div class="big-stat">${s().xp}<small>永久政治經驗 XP</small></div>${roles.map((r, i) => `<article class="option"><h3>${s().xp >= r.xp ? "◉" : "🔒"} ${r.name} <span class="right">${r.xp} XP</span></h3><p>${i === 0 ? "里長選舉與治理已開放" : s().xp >= r.xp ? "資格門檻已達成；此職位的選舉與治理將於後續版本開放。" : `還需要 ${r.xp - s().xp} XP。資格不等於當選。`}</p></article>`).join("")}<p class="small">完成一項工程 +80～120 XP。敗選保留 XP。MVP 的可玩任期為里長。</p>`;
  if (tab === "settings")
    return `<div class="eyebrow">SETTINGS</div><h2>照自己的步調。</h2><p>進度每 5 秒自動保存於這台裝置。</p>${btn("立即儲存", "save", "primary")}${btn("回到主選單", "menu")}${btn(world.shadows ? "關閉陰影（提升效能）" : "開啟陰影", "shadows")}${btn("重新開啟新手教學", "tutorial:restart")}<h3>操作方式</h3><p>WASD 移動／平移 · 拖曳旋轉鏡頭<br>Shift + 拖曳平移地圖 · 滾輪縮放<br>E 與附近居民互動 · V 切換視角<br>手機使用左下搖桿，拖動畫面轉向。</p>`;
  return "";
}
function tutorialCard() {
  if (s().tutorialEnabled === false)
    return tab === "guide"
      ? `<div class="tutorial-reopen">${btn("需要指引？開啟新手教學", "tutorial:restart")}</div>`
      : "";
  const step = tutorialStep(s());
  return `<section class="tutorial" aria-label="新手教學"><div class="eyebrow">幸福里小幫手 · 新手教學 <span>${step.progress}%</span></div><h3>${step.title}</h3><p>${step.text}</p><div class="progress"><i style="width:${step.progress}%"></i></div><div class="tutorial-actions">${btn(step.label, "tutorial:next", "primary")}${btn(step.id === "done" ? "完成教學" : "先自由探索", "tutorial:skip")}</div></section>`;
}
function highlightTutorial() {
  if (s().tutorialEnabled === false) return;
  const target = tutorialStep(s()).target;
  if (target)
    app.querySelectorAll<HTMLElement>("[data-action]").forEach((el) => {
      if (el.dataset.action === target) el.classList.add("tutorial-target");
    });
}
function render() {
  if (menu) {
    app.innerHTML = `<div class="menu-shade"></div><main class="menu"><div class="eyebrow">A LITTLE ISLAND. A BIG RESPONSIBILITY.</div><h1>島民公僕<span>Island Governor</span></h1><p>在曦光島共和國，從一聲問候開始。<br>走進幸福里，讓每個小小的承諾成為改變。</p><div>${btn("開始新的旅程", "new", "primary")}${SaveManager.load() ? btn("繼續上次的故事", "continue") : ""}</div><small>3D 社區治理模擬 · 前端單機 MVP<br>新旅程會取代這台裝置的舊進度</small></main><div class="menu-footer">曦光島共和國 ／ 幸福里 &nbsp; 24 位鄰居，1,200 份期待。</div>`;
    return;
  }
  app.innerHTML = `<header><div class="brand"><span class="emblem">島</span><div><b>島民公僕</b><small>ISLAND GOVERNOR</small></div></div><div class="location"><span class="live-dot"></span> 曦光島 · 幸福里 <small>第 ${s().day} 天</small></div>${btn("☷", "tab:settings", "icon")}</header><section class="hud"><div><small>目前身分</small><b>${s().elected ? "幸福里 里長" : "社區居民"}</b></div><div><small>地方預算</small><b>${money(s().budget)}</b></div><div><small>民意支持</small><b>${CareerManager.support(s()).toFixed(0)}<em>%</em></b></div><div><small>政治信用</small><b>${s().credit.toFixed(0)}</b></div><div><small>政治 XP / CP</small><b>${s().xp} <em>/ ${s().cp}</em></b></div></section><div class="world-title"><div class="eyebrow">WELCOME TO YOUR NEIGHBOURHOOD</div><h2>幸福里<span>把日子，慢慢變好。</span></h2></div><aside class="map"><div><b>幸福里</b><span>人口 1,200</span></div><svg viewBox="0 0 100 100"><rect width="100" height="100" rx="8" fill="#a6c6a0"/><path d="M50 0V100 M0 50H100" stroke="#f4ebd7" stroke-width="11"/>${issues.map((i) => `<circle cx="${50 + i.x * 1.5}" cy="${50 + i.z * 1.5}" r="4" fill="${i.color}"/>`).join("")}<circle cx="${50 + s().position.x * 1.5}" cy="${50 + s().position.z * 1.5}" r="3" fill="#204f53"/></svg><small>菱形地標 ＝ 地方議題</small></aside><div class="view-tools">${btn(world.controls.mode === "city" ? "↘ 進入街道" : "↗ 城市俯瞰", "view", "primary")}${btn("＋", "zoomIn", "icon")}${btn("−", "zoomOut", "icon")}${world.controls.mode === "walk" ? btn("E · 與附近居民互動", "interact") : ""}</div>${tab ? `<aside class="panel"><button class="close" data-action="close" aria-label="關閉面板">×</button>${tutorialCard()}${panel()}</aside>` : ""}<div class="time"><span>◷ 第 ${s().day} 天</span>${[0, 1, 3, 8].map((n) => btn(n === 0 ? "Ⅱ" : `${n}×`, `speed:${n}`, speed === n ? "chosen" : "")).join("")}<small>${s().event ? "事件待處理" : world.controls.mode === "walk" ? "街道時間 1×" : "城市時間"}</small></div><nav>${[
    ["guide", "◎", "旅程"],
    ["citizen", "♧", "居民"],
    ["election", "▤", "競選"],
    ["projects", "⚒", "工程"],
    ["finance", "▥", "財政人事"],
    ["career", "✦", "政治生涯"],
  ]
    .map(([id, icon, name]) =>
      btn(
        `<span>${icon}</span>${name}`,
        `tab:${id}`,
        tab === id ? "selected" : "",
      ),
    )
    .join(
      "",
    )}</nav><div class="controls-hint">WASD 移動 · 拖曳轉向 · V 切換視角 · 點地標調查</div><div id="joystick"><span></span></div>${message && toastTimer > 0 ? `<div class="toast" role="status">${message}</div>` : ""}${s().event ? eventModal() : ""}`;
  setupJoystick();
  highlightTutorial();
}
const eventTitles = [
  "工程延誤：材料尚未到貨",
  "預算追加：地下管線超出預期",
  "市民抗議：施工影響生活",
  "品質疑慮：需要加強檢驗",
  "額外補助機會：提出改善提案",
];
function eventModal() {
  const e = s().event!;
  return `<div class="modal-shade"><section class="event"><div class="eyebrow">DECISION NEEDED · 時間已暫停</div><h2>${eventTitles[e.type]}</h2><p>${issues.find((i) => i.id === e.id)?.place}的工程需要你的決定。投入 $3,000 辦理改善、協調或補助提案；也可以不追加支出，以延長工期換取協調時間。</p>${btn("投入 $3,000 · 信用 +3", "event:paid", "primary")}${btn("延長工期 · 進度 −20%、信用 −2", "event:delay")}</section></div>`;
}
app.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === "proposal-text") {
    proposalText[selected] = el.value;
    if (proposalDraft?.issueId === selected) {
      proposalDraft = null;
      const review = app.querySelector(".proposal-review");
      review?.remove();
    }
  }
});
app.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.feature && proposalDraft?.issueId === selected) {
    const id = el.dataset.feature;
    proposalDraft.features = el.checked
      ? [...new Set([...proposalDraft.features, id])]
      : proposalDraft.features.filter((f) => f !== id);
  }
});
app.addEventListener("click", (e) => {
  const node = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-action]",
  );
  if (!node) return;
  const [a, b] = node.dataset.action!.split(":");
  if (a === "new") {
    start(false);
    return;
  }
  if (a === "continue") {
    start(true);
    return;
  }
  if (a === "tutorial") {
    if (b === "skip") {
      s().tutorialEnabled = false;
      game.save();
      render();
      return;
    }
    if (b === "restart") {
      s().tutorialEnabled = true;
      s().tutorialStarted = true;
      tab = "guide";
      game.save();
      render();
      return;
    }
    const step = tutorialStep(s());
    if (step.action === "begin") {
      s().tutorialStarted = true;
      game.save();
      render();
      return;
    }
    const [destination, id] = step.action.split(":");
    if (destination === "issue") {
      selected = id;
      tab = "issue";
      world.controls.mode = "city";
      const i = issues.find((i) => i.id === id)!;
      world.controls.target.set(i.x, 0, i.z);
    } else if (destination === "citizen") {
      citizenId = Number(id);
      tab = "citizen";
    } else if (destination === "accelerate" || destination === "prepare") {
      world.controls.mode = "city";
      speed = 8;
      tab = destination === "prepare" ? "citizen" : "projects";
    } else tab = destination;
    render();
    const target =
      step.target &&
      Array.from(app.querySelectorAll<HTMLElement>("[data-action]")).find(
        (el) => el.dataset.action === step.target,
      );
    if (target) {
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      target.focus({ preventScroll: true });
    }
    return;
  }
  if (a === "tab") {
    tab = b;
    render();
    return;
  }
  if (a === "close") {
    tab = "";
    render();
    return;
  }
  if (a === "view") {
    world.controls.toggle();
    render();
    return;
  }
  if (a === "zoomIn" || a === "zoomOut") {
    world.controls.zoom = Math.max(
      25,
      Math.min(95, world.controls.zoom + (a === "zoomIn" ? -8 : 8)),
    );
    return;
  }
  if (a === "speed") {
    speed = Number(b);
    render();
    return;
  }
  if (a === "visit") {
    const i = issues.find((i) => i.id === b)!;
    world.controls.mode = "city";
    world.controls.target.set(i.x, 0, i.z);
    world.controls.zoom = 28;
    tab = "";
    render();
    return;
  }
  if (a === "issue") {
    selected = b;
    tab = "issue";
    world.controls.target.set(
      issues.find((i) => i.id === b)!.x,
      0,
      issues.find((i) => i.id === b)!.z,
    );
    render();
    return;
  }
  if (a === "citizen") {
    citizenId = Number(b);
    tab = "citizen";
    render();
    return;
  }
  if (a === "interact") {
    interact();
    return;
  }
  if (a === "menu") {
    game.save();
    menu = true;
    render();
    return;
  }
  if (a === "shadows") {
    world.shadows = !world.shadows;
    world.renderer.shadowMap.enabled = world.shadows;
    render();
    return;
  }
  if (a === "analyze-proposal") {
    try {
      proposalDraft = analyzeProposal(
        proposalText[selected] ?? s().customProposals?.[selected]?.text ?? "",
        selected,
      );
      render();
    } catch (e) {
      notify((e as Error).message);
    }
    return;
  }
  act(() => {
    switch (a) {
      case "confirm-proposal":
        if (!proposalDraft || proposalDraft.issueId !== selected)
          throw Error("請先整理你的提案。");
        confirmProposal(s(), proposalDraft);
        proposalDraft = null;
        notify("已加入自行提案；完工時會依確認的清單改變城市。");
        break;

      case "investigate": {
        const i = issues.find((i) => i.id === selected)!;
        if (
          world.controls.mode === "walk" &&
          Math.hypot(
            i.x - world.player.position.x,
            i.z - world.player.position.z,
          ) > 8
        )
          throw Error("請走近地標 8 公尺內，或在俯瞰模式進行現勘。");
        PolicyManager.investigate(s(), selected);
        notify("已收集居民需求，現在可以提出政見。");
        break;
      }
      case "promise":
        PolicyManager.promise(s(), selected, Number(b));
        if (s().customProposals) delete s().customProposals![selected];
        break;
      case "talk":
        notify(CitizenManager.talk(s(), Number(b)));
        break;
      case "elect":
        ElectionManager.run(s());
        break;
      case "plan": {
        const workers = Number(
            document.querySelector<HTMLSelectElement>("#workers")?.value || 2,
          ),
          quality = Number(
            document.querySelector<HTMLSelectElement>("#quality")?.value || 1,
          );
        ProjectManager.plan(s(), selected, Number(b), workers, quality);
        tab = "projects";
        break;
      }
      case "advance":
        ProjectManager.advance(s(), b);
        break;
      case "grant":
        FinanceManager.grant(s());
        break;
      case "event":
        EventManager.resolve(s(), b === "paid");
        break;
      case "save":
        notify("進度已儲存。");
        break;
    }
  });
});
function interact() {
  const n = world.nearest();
  if (n.distance > 5) {
    notify("附近沒有居民，請靠近街上的角色。");
    return;
  }
  citizenId = n.id;
  tab = "citizen";
  render();
}
window.addEventListener("keydown", (e) => {
  if (
    !started ||
    menu ||
    ["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
  )
    return;
  if (e.key.toLowerCase() === "e") interact();
  if (e.key.toLowerCase() === "v") render();
});
world.onSelect = (id) => {
  selected = id;
  tab = "issue";
  render();
};
function setupJoystick() {
  const el = document.querySelector<HTMLDivElement>("#joystick");
  if (!el) return;
  let active = false;
  el.addEventListener("pointerdown", (e) => {
    active = true;
    el.setPointerCapture(e.pointerId);
    move(e);
  });
  function move(e: PointerEvent) {
    if (!active) return;
    const r = el!.getBoundingClientRect(),
      x = (e.clientX - r.left - r.width / 2) / 35,
      y = (e.clientY - r.top - r.height / 2) / 35;
    const l = Math.max(1, Math.hypot(x, y));
    world.player.stick = { x: x / l, y: y / l };
    el!.querySelector<HTMLElement>("span")!.style.transform =
      `translate(${(x / l) * 25}px,${(y / l) * 25}px)`;
  }
  el.addEventListener("pointermove", move);
  const stop = () => {
    active = false;
    world.player.stick = { x: 0, y: 0 };
    el.querySelector<HTMLElement>("span")!.style.transform = "";
  };
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
}
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (started && !menu) {
    const before = s().event;
    const beforeStages = s()
      .projects.map((p) => p.stage)
      .join(",");
    TimeManager.tick(
      s(),
      (dt / 12) * (world.controls.mode === "walk" ? 1 : speed),
    );
    world.sync(s());
    if (
      (!before && s().event) ||
      beforeStages !==
        s()
          .projects.map((p) => p.stage)
          .join(",")
    )
      render();
    saveTimer += dt;
    uiTimer += dt;
    if (saveTimer > 5) {
      game.save();
      saveTimer = 0;
    }
    if (uiTimer > 1) {
      const card = app.querySelector(".tutorial");
      if (card) {
        const next = tutorialCard();
        if (card.outerHTML !== next) {
          card.outerHTML = next;
          app
            .querySelectorAll(".tutorial-target")
            .forEach((el) => el.classList.remove("tutorial-target"));
          highlightTutorial();
        }
      }
      refreshStats();
      uiTimer = 0;
    }
    if (toastTimer > 0) toastTimer -= dt;
  }
  world.update(dt, now / 1000, s());
  requestAnimationFrame(frame);
}
window.addEventListener("beforeunload", () => {
  if (started) game.save();
});
render();
requestAnimationFrame(frame);

function refreshStats() {
  const values = [
    s().elected ? "幸福里 里長" : "社區居民",
    money(s().budget),
    `${CareerManager.support(s()).toFixed(0)}%`,
    s().credit.toFixed(0),
    `${s().xp} / ${s().cp}`,
  ];
  document
    .querySelectorAll(".hud b")
    .forEach((el, i) => (el.textContent = values[i]));
  const day = document.querySelector(".time>span");
  if (day) day.textContent = `◷ 第 ${s().day} 天`;
  const location = document.querySelector(".location small");
  if (location) location.textContent = `第 ${s().day} 天`;
}
