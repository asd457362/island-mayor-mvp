import { issues, tiers } from "./data";
import type { State } from "./game";
export const improvements = [
  {
    id: "trees",
    name: "植樹綠帶",
    words: /樹|植栽|綠化|綠帶|綠地/,
    cost: 3000,
    maintenance: 25,
  },
  {
    id: "flowers",
    name: "花圃花槽",
    words: /花|花圃|花園/,
    cost: 1800,
    maintenance: 20,
  },
  {
    id: "benches",
    name: "休憩長椅",
    words: /椅|座位|休憩|休息/,
    cost: 2000,
    maintenance: 10,
  },
  {
    id: "paths",
    name: "整齊步道",
    words: /步道|人行|鋪面|散步|無障礙/,
    cost: 4000,
    maintenance: 15,
  },
  {
    id: "lights",
    name: "暖色庭園燈",
    words: /燈|照明|夜間/,
    cost: 3000,
    maintenance: 20,
  },
  {
    id: "clean",
    name: "環境清整",
    words: /清潔|清理|整潔|垃圾|整理|乾淨|整治|美化/,
    cost: 1500,
    maintenance: 30,
  },
];
export type ImprovementId = (typeof improvements)[number]["id"];
export type CustomProposal = {
  text: string;
  issueId: string;
  features: string[];
  tier: number;
  feedback: string[];
  warnings: string[];
};
export const extraCost = (p?: CustomProposal) =>
  p
    ? improvements
        .filter((f) => p.features.includes(f.id))
        .reduce((n, f) => n + f.cost, 0)
    : 0;
export const extraMaintenance = (p?: CustomProposal) =>
  p
    ? improvements
        .filter((f) => p.features.includes(f.id))
        .reduce((n, f) => n + f.maintenance, 0)
    : 0;
export function analyzeProposal(text: string, issueId: string): CustomProposal {
  if (!issues.some((i) => i.id === issueId))
    throw Error("請選擇幸福里的治理地點。");
  const trimmed = text.trim();
  if (trimmed.length < 8)
    throw Error(
      "請多描述一些：想在哪裡改善什麼，讓哪些居民受益？（至少 8 字）",
    );
  if (trimmed.length > 600) throw Error("請將提案控制在 600 字內。");
  const features = improvements
    .filter(
      (f) =>
        f.words.test(trimmed) &&
        !new RegExp(
          `(?:不需要|不要|不做|取消|不設置|不增設)\\s*(?:[^，。；、]{0,3})?(?:${f.words.source})`,
        ).test(trimmed),
    )
    .map((f) => f.id);
  const tier = features.length >= 5 ? 2 : features.length >= 3 ? 1 : 0;
  const warnings = [
    "這是免費的關鍵字整理，不是 AI，也不會完整理解語意。請核對下方建設清單；未列出的內容不會出現在城市中。",
  ];
  if (/捷運|機場|醫院|高架|拆|徵收|填海/.test(trimmed))
    warnings.push(
      "大型交通、拆遷徵收與新建醫院超出里長權限，本版不會執行這些內容。",
    );
  if (!features.length)
    warnings.push(
      "尚未辨識到可新增的美化項目。可手動勾選清單，或補寫樹木、花圃、長椅、步道、照明與清潔。",
    );
  return {
    text: trimmed,
    issueId,
    features,
    tier,
    feedback: [
      "居民期待：更安全、整潔、能休息的公共空間。",
      "取捨：新增設施會增加工程費、施工干擾與每日維護。",
      "信任來自兌現：確認提案不會直接加 XP；完工才會計算成果。",
    ],
    warnings,
  };
}
export function confirmProposal(s: State, p: CustomProposal) {
  if (!s.discovered.includes(p.issueId)) throw Error("請先調查這個地方。");
  if (s.projects.some((project) => project.id === p.issueId))
    throw Error("此地工程已規劃，請先完成既定工程；不能中途變更承諾。");
  if (!p.features.length) throw Error("請至少選擇一項實際要執行的改善。");
  if (p.features.some((id) => !improvements.some((f) => f.id === id)))
    throw Error("包含尚未支援的建設。");
  const copy = structuredClone(p);
  copy.features = [...new Set(p.features)];
  copy.tier = copy.features.length >= 5 ? 2 : copy.features.length >= 3 ? 1 : 0;
  s.customProposals ??= {};
  s.customProposals[p.issueId] = copy;
  s.promises[p.issueId] = copy.tier;
  s.log.unshift(
    `第 ${s.day} 天 · 自行提案：${issues.find((i) => i.id === p.issueId)!.place}，${copy.features.length} 項改善；估計基礎與美化費 $${(tiers[copy.tier].cost + extraCost(copy)).toLocaleString()}`,
  );
}
