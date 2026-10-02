import { GoodId } from "./types";

export type FlashDealDirection = "crash" | "spike";

/** An announced, single-good price swing — a sharper, shorter, more urgent
 * cousin of seasonalEvents.ts. A seasonal event runs for a couple of
 * minutes across a themed group of luxury goods and nudges price by
 * 30-60%; this picks ONE good — any unlocked good, not just luxuries —
 * and swings it hard for well under a minute. The whole point is noticing
 * it and acting before it expires: a crash to buy into, a spike to sell
 * into. See FlashDealBanner for how the countdown is surfaced. */
export interface FlashDealInstance {
  id: number;
  goodId: GoodId;
  direction: FlashDealDirection;
  triggeredAtTick: number;
  expiresAtTick: number;
}

export const FLASH_DEAL_CHANCE = 0.012; // per tick
export const FLASH_DEAL_DURATION_TICKS = 24; // ~72s of real time at the normal 3000ms tick
// Noticeably sharper than a seasonal event (which tops out around +60%)
// but kept to a believable single-item swing rather than a cartoonish
// 80% jump — still worth dropping what you're doing for, not absurd.
export const FLASH_DEAL_CRASH_MULT = 0.75; // -25%, a buying opportunity
export const FLASH_DEAL_SPIKE_MULT = 1.3; // +30%, a selling opportunity

export function flashDealMultiplier(direction: FlashDealDirection): number {
  return direction === "crash" ? FLASH_DEAL_CRASH_MULT : FLASH_DEAL_SPIKE_MULT;
}
