import { GoodId } from "./types";

/** A buy/sell contract offered by a rival trader — temporary, lucrative task. */
export interface RivalBounty {
  id: string;
  rivalId: string;
  goodId: GoodId;
  side: "buying" | "selling";
  quantity: number;
  /** multiplier on base price (1.15 = 15% above market) */
  priceMultiplier: number;
  /** coins rewarded for completion */
  reward: number;
  /** tick at which bounty expires if not completed */
  expiresAt: number;
}

export interface ActiveBounty extends RivalBounty {
  /** how much quantity has been fulfilled */
  fulfilled: number;
}

/** Generous bounty — pays 20% above/below market, appears ~every 40-60 ticks (2-3 min) */
export const BOUNTY_SPAWN_CHANCE = 0.015;
/** Max 2 active bounties at a time to avoid overwhelming */
export const BOUNTY_MAX_ACTIVE = 2;
/** Bounties last ~3 in-game days (120 ticks) */
export const BOUNTY_DURATION_TICKS = 120;
/** Reward = quantity * basePrice * multiplier * bonus */
export const BOUNTY_REWARD_BONUS = 0.3;

export function generateBountyId(): string {
  return `bounty_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
