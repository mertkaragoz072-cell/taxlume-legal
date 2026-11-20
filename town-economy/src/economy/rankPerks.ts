import {
  AUTO_TRADE_RULES_PER_RANK,
  BULK_CONTRACT_SLOTS_PER_RANK,
  CONTRACT_SLOTS_PER_RANK,
  RANK_GOAL_REWARD_SCALE_PER_RANK,
  RESEARCH_TIER3_UNLOCK_RANK,
  TOWN_RANK_LOAN_CAP_BONUS_PER_RANK,
  TOWN_RANK_PRODUCTION_BONUS_PER_RANK,
  TOWN_RANK_STORAGE_BONUS_PER_RANK,
  WORKER_SLOTS_PER_RANK,
} from "./constants";
import { CRISIS_TEMPLATES } from "./crises";
import { GOODS } from "./goods";

type T = (key: string, params?: Record<string, string | number>) => string;

const pct = (fraction: number) => {
  const v = Math.round(fraction * 1000) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};

/** Everything that changes for the town when it climbs from rank `from` to
 * rank `to` (inclusive of every rank passed through), as player-facing lines.
 * Nothing here is new balance: it is the existing per-rank rules (see
 * constants.ts / formulas.ts) laid out so a promotion is felt, not silent.
 * Headline things first (new goods, research, new crises, extra slots), the
 * always-on passive gains folded into one closing line. */
export function rankGainLines(from: number, to: number, t: T): string[] {
  const lines: string[] = [];
  if (to <= from) return lines;
  const steps = to - from;

  for (const g of GOODS) {
    if (g.unlockRank !== undefined && g.unlockRank > from && g.unlockRank <= to) {
      lines.push(t("rankGain.good", { icon: g.icon, good: t(g.nameKey) }));
    }
  }
  if (RESEARCH_TIER3_UNLOCK_RANK > from && RESEARCH_TIER3_UNLOCK_RANK <= to) {
    lines.push(t("rankGain.research"));
  }

  const slots = (per: number) => Math.floor(to / per) - Math.floor(from / per);
  const contracts = slots(CONTRACT_SLOTS_PER_RANK);
  if (contracts > 0) lines.push(t("rankGain.contracts", { n: contracts }));
  const bulk = slots(BULK_CONTRACT_SLOTS_PER_RANK);
  if (bulk > 0) lines.push(t("rankGain.bulk", { n: bulk }));
  const auto = slots(AUTO_TRADE_RULES_PER_RANK);
  if (auto > 0) lines.push(t("rankGain.auto", { n: auto }));
  const workers = slots(WORKER_SLOTS_PER_RANK);
  if (workers > 0) lines.push(t("rankGain.workers", { n: workers }));

  for (const c of CRISIS_TEMPLATES) {
    if (c.minRank !== undefined && c.minRank > from && c.minRank <= to) {
      lines.push(t("rankGain.crisis", { icon: c.icon, crisis: t(c.titleKey) }));
    }
  }

  lines.push(
    t("rankGain.passive", {
      prod: pct(steps * TOWN_RANK_PRODUCTION_BONUS_PER_RANK),
      store: steps * TOWN_RANK_STORAGE_BONUS_PER_RANK,
      loan: pct(steps * TOWN_RANK_LOAN_CAP_BONUS_PER_RANK),
      quest: pct(steps * RANK_GOAL_REWARD_SCALE_PER_RANK),
    })
  );
  return lines;
}
