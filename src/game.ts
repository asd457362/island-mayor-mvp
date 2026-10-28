import { extraCost, extraMaintenance, type CustomProposal } from "./proposals";
import { citizens, groups, issues, tiers, type Group } from "./data";
export type Project = {
  id: string;
  tier: number;
  stage: number;
  workers: number;
  quality: number;
  progress: number;
  eventDone: boolean;
  cost: number;
  proposal?: CustomProposal;
};
export type State = {
  version: 1;
  tutorialEnabled?: boolean;
  tutorialStarted?: boolean;
  day: number;
  elapsed: number;
  elected: boolean;
  xp: number;
  credit: number;
  cp: number;
  budget: number;
  subsidy: number;
  spending: number;
  maintenance: number;
  discovered: string[];
  promises: Record<string, number>;
  customProposals?: Record<string, CustomProposal>;
  talked: number[];
  projects: Project[];
  log: string[];
  event: null | { type: number; id: string };
  election: null | Election;
  nextElection: number;
  terms: number;
  position: { x: number; z: number };
};
export type Election = {
  won: boolean;
  player: number;
  opponent: number;
  turnout: number;
  votes: number;
  breakdown: { group: Group; support: number }[];
  explanation: string;
};
export const fresh = (): State => ({
  version: 1,
  day: 1,
  elapsed: 0,
  elected: false,
  xp: 0,
  credit: 50,
  cp: 60,
  budget: 0,
  subsidy: 0,
  spending: 0,
  maintenance: 0,
  discovered: [],
  promises: {},
  talked: [],
  projects: [],
  log: ["第 1 天 · 你好，幸福里。先聆聽，再承諾。"],
  event: null,
  election: null,
  nextElection: 1,
  terms: 0,
  position: { x: 0, z: 3 },
});
const clamp = (v: number) => Math.max(0, Math.min(100, v));
export class SaveManager {
  static save(s: State) {
    localStorage.setItem("island-governor-v1", JSON.stringify(s));
  }
  static load(): State | null {
    try {
      const s = JSON.parse(
        localStorage.getItem("island-governor-v1") || "null",
      );
      return s?.version === 1 && Array.isArray(s.projects) ? s : null;
    } catch {
      return null;
    }
  }
}
export class FinanceManager {
  static spend(s: State, n: number, label: string) {
    if (s.budget < n) throw Error("預算不足，請先申請補助或降低規模。");
    s.budget -= n;
    s.spending += n;
    s.log.unshift(`第 ${s.day} 天 · ${label} −$${n.toLocaleString()}`);
  }
  static grant(s: State) {
    if (!s.elected) throw Error("當選後才可申請補助。");
    if (s.subsidy >= 60000) throw Error("本任期補助額度已用完。");
    const n = Math.min(20000, 60000 - s.subsidy);
    s.subsidy += n;
    s.budget += n;
    s.log.unshift(`第 ${s.day} 天 · 上級補助 +$${n.toLocaleString()}`);
  }
}
export class StaffManager {
  static available(s: State) {
    return (
      6 -
      s.projects
        .filter((p) => p.stage >= 2 && p.stage < 7)
        .reduce((a, p) => a + p.workers, 0)
    );
  }
}
export class CitizenManager {
  static talk(s: State, id: number) {
    if (!s.talked.includes(id)) {
      s.talked.push(id);
      s.cp = Math.min(100, s.cp + 3);
      s.credit = clamp(s.credit + 0.5);
    }
    const c = citizens[id];
    return `${c.name}：我們${c.group}最在意${issues.find((i) => i.group === c.group)?.name || "生活便利"}，請說到做到。`;
  }
}
export class PolicyManager {
  static investigate(s: State, id: string) {
    if (!s.discovered.includes(id)) {
      s.discovered.push(id);
      s.cp = Math.min(100, s.cp + 5);
      s.log.unshift(
        `第 ${s.day} 天 · 已調查：${issues.find((i) => i.id === id)?.name}`,
      );
    }
  }
  static promise(s: State, id: string, tier: number) {
    if (!s.discovered.includes(id)) throw Error("請先調查這個問題。");
    s.promises[id] = tier;
  }
}
export class ElectionManager {
  static run(s: State, random = Math.random): Election {
    if (s.elected) throw Error("你已當選，請先完成本任施政。");
    if (s.discovered.length < 3 || Object.keys(s.promises).length < 3)
      throw Error("至少調查三項問題並提出三項政見。");
    if (s.cp < 40 || s.day < s.nextElection)
      throw Error(`需要 CP 40，且須等到第 ${s.nextElection} 天。`);
    s.cp -= 40;
    const total = Object.entries(s.promises).reduce(
      (n, [id, t]) => n + tiers[t].cost + extraCost(s.customProposals?.[id]),
      0,
    );
    const credibility = total > 140000 ? -9 : total > 110000 ? -3 : 3;
    const breakdown = groups.map((group) => {
      let score =
        35 +
        s.talked.filter((id) => citizens[id].group === group).length * 2 +
        (s.credit - 40) * 0.22 +
        s.discovered.length * 1.3 +
        credibility;
      for (const [id, t] of Object.entries(s.promises)) {
        const issue = issues.find((i) => i.id === id)!;
        score += issue.group === group ? 8 + t * 2 : 1.5;
        if (id === "parking" && group === "商家" && t === 2) score -= 5;
      }
      return { group, support: clamp(score + (random() - 0.5) * 3) };
    });
    const turnout = Math.round(65 + s.talked.length * 0.5);
    const votes = Math.round((1200 * turnout) / 100);
    const playerVotes = Math.round(
      (votes * breakdown.reduce((a, g) => a + g.support, 0)) / 400,
    );
    const player = +((playerVotes / votes) * 100).toFixed(1);
    const result = {
      won: player > 50,
      player,
      opponent: +(100 - player).toFixed(1),
      turnout,
      votes,
      breakdown,
      explanation: `模擬選民 1,200 人；依四群體關注議題、走訪人數、政治信用與政見成本計票。承諾總成本 $${total.toLocaleString()}，可行性修正 ${credibility} 分；各群擾動不超過 ±1.5 分。`,
    };
    s.election = result;
    if (result.won) {
      s.elected = true;
      s.budget = 120000;
      s.terms++;
      s.log.unshift(`第 ${s.day} 天 · 當選里長！地方預算 +$120,000`);
    } else {
      s.nextElection = s.day + 7;
      s.credit = clamp(s.credit - 2);
      s.log.unshift(
        `第 ${s.day} 天 · 敗選；永久 XP 保留。走訪居民與時間推進可補回 CP。`,
      );
    }
    return result;
  }
}
export class ProjectManager {
  static plan(
    s: State,
    id: string,
    tier: number,
    workers: number,
    quality: number,
  ) {
    if (!s.elected) throw Error("居民身分沒有政府執行權，請先參選。");
    if (!s.discovered.includes(id)) throw Error("請先調查。");
    if (s.projects.some((p) => p.id === id)) throw Error("這個議題已有工程。");
    if (workers < 1 || workers > 3) throw Error("每項工程需 1–3 位工程人員。");
    const t = tiers[tier];
    const proposal = s.customProposals?.[id]
      ? structuredClone(s.customProposals[id])
      : undefined;
    const cost = Math.round(
      t.cost + t.material * quality + t.staff * workers + extraCost(proposal),
    );
    s.projects.push({
      id,
      tier,
      stage: 0,
      workers,
      quality,
      progress: 0,
      eventDone: false,
      cost,
      ...(proposal ? { proposal } : {}),
    });
  }
  static advance(s: State, id: string) {
    const p = s.projects.find((p) => p.id === id)!;
    if (p.stage === 0) {
      FinanceManager.spend(s, p.cost, "工程預算（含材料、人事）");
      p.stage = 1;
    } else if (p.stage === 1) {
      if (StaffManager.available(s) < p.workers)
        throw Error("工程人力不足，請等待其他工程驗收。");
      p.stage = 2;
    } else if (p.stage === 2) {
      if (p.tier === 2 && s.credit < 45)
        throw Error("大型工程需政治信用 45 才能取得上級核准。");
      p.stage = 3;
    } else if (p.stage === 3) {
      p.stage = 4;
    } else if (p.stage === 5) {
      p.stage = 6;
    } else if (p.stage === 6) {
      p.stage = 7;
      s.xp += p.tier === 2 ? 120 : 80;
      s.credit = clamp(s.credit + 8);
      s.maintenance +=
        (tiers[p.tier].maintenance + extraMaintenance(p.proposal)) *
        (p.quality === 0 ? 2 : 1);
      if (p.proposal) {
        s.xp += 20;
        s.credit = clamp(s.credit + 2);
        s.log.unshift(
          `第 ${s.day} 天 · 自行提案已兌現！XP +20、政治信用 +2。居民：這裡變得整齊又舒服了。`,
        );
      }
      s.log.unshift(
        `第 ${s.day} 天 · ${issues.find((i) => i.id === id)?.place}完成驗收，XP +${p.tier === 2 ? 120 : 80}`,
      );
    }
  }
}
export class EventManager {
  static resolve(s: State, paid: boolean) {
    if (!s.event) return;
    const p = s.projects.find((p) => p.id === s.event!.id)!;
    if (paid) {
      FinanceManager.spend(s, 3000, "事件協調與品質改善");
      s.credit = clamp(s.credit + 3);
      if (s.event.type === 4) {
        s.budget += 8000;
        s.subsidy += 8000;
        s.log.unshift(`第 ${s.day} 天 · 專案額外補助 +$8,000`);
      }
    } else {
      p.progress = Math.max(0, p.progress - 0.2);
      s.credit = clamp(s.credit - 2);
    }
    s.log.unshift(
      `第 ${s.day} 天 · ${paid ? "投入資源解決" : "協調並延長工期"}施工事件`,
    );
    s.event = null;
  }
}
export class TimeManager {
  static tick(s: State, days: number) {
    if (s.event) return;
    const previous = s.day;
    s.elapsed += days;
    s.day = 1 + Math.floor(s.elapsed);
    if (s.day > previous) {
      const n = s.day - previous;
      s.cp = Math.min(100, s.cp + n * 4);
      if (s.elected && s.maintenance) {
        const fee = Math.min(s.budget, s.maintenance * n);
        s.budget -= fee;
        s.log.unshift(`第 ${s.day} 天 · 維護費 −$${fee}`);
      }
    }
    for (const p of s.projects) {
      if (p.stage !== 4) continue;
      p.progress = Math.min(
        1,
        p.progress +
          (days * p.workers) /
            (tiers[p.tier].days * (p.quality === 2 ? 1.2 : 1)),
      );
      if (p.progress >= 0.35 && !p.eventDone) {
        p.eventDone = true;
        s.event = {
          type: (issues.findIndex((i) => i.id === p.id) + s.terms) % 5,
          id: p.id,
        };
        break;
      }
      if (p.progress >= 1) {
        p.stage = 5;
        s.log.unshift(`第 ${s.day} 天 · 工程竣工，等待驗收。`);
      }
    }
  }
}
export class CareerManager {
  static support(s: State) {
    return clamp(
      42 +
        s.credit * 0.2 +
        s.projects
          .filter((p) => p.stage === 7)
          .reduce((a, p) => a + tiers[p.tier].effect / 3, 0),
    );
  }
}
export class GameManager {
  state: State;
  constructor(s = fresh()) {
    this.state = s;
  }
  save() {
    SaveManager.save(this.state);
  }
}
