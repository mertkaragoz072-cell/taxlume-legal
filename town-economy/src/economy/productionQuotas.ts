import { GoodId } from "./types";
import { GOODS } from "./goods";

/** Daily production target for a good — reset each game day */
export interface ProductionQuota {
  goodId: GoodId;
  target: number;
  /** bonus coins if player produces target amount this day */
  bonus: number;
}

/** Generate quotas for today: each good gets a target between 50-150% of baseProduction */
export function generateDailyQuotas(): ProductionQuota[] {
  return GOODS.map((good) => {
    const baseProd = good.baseProduction;
    const minTarget = baseProd * 0.5;
    const maxTarget = baseProd * 1.5;
    const target = Math.round(minTarget + Math.random() * (maxTarget - minTarget));
    const bonus = Math.round(target * 0.3);
    return { goodId: good.id, target, bonus };
  });
}

export function getQuotaProgress(goodId: GoodId, produced: number, quotas: ProductionQuota[]): { target: number; produced: number; pct: number } {
  const quota = quotas.find((q) => q.goodId === goodId);
  if (!quota) return { target: 0, produced: 0, pct: 0 };
  return { target: quota.target, produced, pct: Math.min(1, produced / quota.target) };
}
