import type { State } from "./game";
import { issues, stages } from "./data";
export type TutorialStep = {
  id: string;
  title: string;
  text: string;
  label: string;
  action: string;
  target?: string;
  progress: number;
};
export function tutorialStep(s: State): TutorialStep {
  const step = (
    id: string,
    title: string,
    text: string,
    label: string,
    action: string,
    progress: number,
    target?: string,
  ) => ({ id, title, text, label, action, progress, target });
  if (
    !s.tutorialStarted &&
    !s.elected &&
    s.discovered.length === 0 &&
    s.talked.length === 0 &&
    !s.election
  )
    return step(
      "welcome",
      "歡迎！先別急著當里長。",
      "你現在是居民，預算 $0 是正常的。先了解社區、提出三項政見，再參選；當選後才有預算和治理權。教學會陪你完成第一項工程。",
      "好，帶我開始",
      "begin",
      0,
    );
  if (s.projects.some((p) => p.stage === 7))
    return step(
      "done",
      "你已完成第一份承諾！",
      "城市已改善，XP 也已入帳。你可以繼續處理其他問題，或到政治生涯查看下一個職位。",
      "查看政治生涯",
      "career",
      100,
    );
  if (!s.elected) {
    const unpromised = s.discovered.find((id) => s.promises[id] === undefined);
    if (unpromised && Object.keys(s.promises).length < 3)
      return step(
        "promise",
        "把調查變成一項政見",
        "選擇一個方案，點「列入政見」。初次建議「標準翻新」，但你可以自己取捨成本和成效。這時只是承諾，還不會花政府預算。",
        "帶我選方案",
        `issue:${unpromised}`,
        15 + Object.keys(s.promises).length * 10,
        "promise:1",
      );
    if (s.discovered.length < 3 || Object.keys(s.promises).length < 3) {
      const i = issues.find((i) => !s.discovered.includes(i.id))!;
      return step(
        "investigate",
        s.discovered.length === 0
          ? "第一站：調查公園的問題"
          : `再了解一個問題（${s.discovered.length}/3）`,
        "點下方按鈕會帶你到議題。接著按亮起的「現地調查」，聽懂問題後再選方案。教學使用俯瞰模式，也可隨時切換街道探索。",
        `前往${i.place}`,
        `issue:${i.id}`,
        10 + s.discovered.length * 10,
        "investigate",
      );
    }
    if (s.talked.length < 4) {
      const id = [0, 1, 2, 3].find((id) => !s.talked.includes(id)) ?? 0;
      return step(
        "citizen",
        `聽聽不同居民的聲音（${s.talked.length}/4）`,
        "青年、家長、商家與長者關心不同議題。點「傾聽與協調」累積信任與競選準備值 CP；這些互動也會影響選票。",
        "拜訪下一位居民",
        `citizen:${id}`,
        45 + s.talked.length * 3,
        `talk:${id}`,
      );
    }
    if (s.day < s.nextElection || s.cp < 40)
      return step(
        "retry",
        "敗選也能繼續，準備下一次選舉",
        "永久 XP 不會消失。每天回復 4 CP，走訪尚未互動的居民也能累積 CP 和支持。切到俯瞰並按 8× 等待選舉日；條件達成後教學會自動更新。",
        `準備中：第 ${s.nextElection} 天／40 CP`,
        "prepare",
        58,
        "speed:8",
      );
    return step(
      "elect",
      "現在，參加你的第一次里長選舉",
      "你已有三項調查和政見。到競選頁按「參加里長選舉」，消耗 40 CP。結果受到走訪、政見與信用影響；敗選仍可重新準備。",
      "前往競選",
      "election",
      60,
      "elect",
    );
  }
  const p = s.projects.find((p) => p.stage < 7);
  if (!p) {
    const id =
      Object.keys(s.promises).find(
        (id) => !s.projects.some((p) => p.id === id),
      ) || "park";
    return step(
      "plan",
      "當選了！把第一個承諾變成工程",
      "你現在有 $120,000 與 6 位工程人員。先看財政人事，再從議題選方案按「規劃這項工程」。首次可用標準翻新、2 人、標準材料。",
      "規劃第一項工程",
      `issue:${id}`,
      65,
      "plan:1",
    );
  }
  if (s.event)
    return step(
      "event",
      "重大事件會自動暫停時間",
      "先閱讀中央的事件視窗，再選擇投入預算處理，或延長工期。兩種選擇都有成本，處理後工程才會繼續。",
      "閱讀並處理事件",
      "projects",
      82,
      "event:paid",
    );
  if (p.stage === 4)
    return step(
      "build",
      "施工中：讓時間往前走",
      "切換俯瞰並按 3× 或 8×，工程才會加速。進度達成後還要驗收；若跳出事件，先做決定。你也可以同時走訪居民。",
      `施工 ${Math.round(p.progress * 100)}% · 開啟 8×`,
      "accelerate",
      80,
      "speed:8",
    );
  const instructions = [
    "先按「編列並支付預算」，這一步才會真正扣款。",
    "按「指派工程人員」。人員不能同時分配到其他工程。",
    "按「申請主管機關核准」。大型工程還需要足夠政治信用。",
    "核准完成，按「開始施工」。",
    "",
    "施工完成！按「辦理驗收」檢查成果。",
    "最後按「公布成效，獲得 XP」。這一步會改善 3D 城市並保存成果。",
  ];
  return step(
    "stage",
    `下一步：${stages[p.stage]}`,
    instructions[p.stage],
    "帶我處理工程",
    "projects",
    70 + p.stage * 4,
    `advance:${p.id}`,
  );
}
