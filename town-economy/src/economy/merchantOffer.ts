import { eventFields } from "../i18n/t";
import { computeNetWorth, scaledGoalReward } from "./formulas";
import { EconomyEvent, EconomyState } from "./types";

/** A travelling merchant now and then offers a gift of coins for watching a
 * short ad. It stays until the player answers: "no" closes it, watching the ad pays the gift. */
export interface MerchantOffer {
  id: number;
  reward: number;
}

export const MERCHANT_BASE_REWARD = 100;
/** a small share of what the town is worth, so the gift stays worth a look later on */
export const MERCHANT_WORTH_SHARE = 0.02;
export const MERCHANT_FIRST_DELAY_TICKS = 200; // ~10 min into a new town
export const MERCHANT_COOLDOWN_TICKS = 220; // ~11 min between offers
export const MERCHANT_CHANCE = 0.04; // per tick once the cooldown is over
const EVENT_LOG_CAP = 30;

export function merchantReward(state: EconomyState): number {
  const base = scaledGoalReward(MERCHANT_BASE_REWARD, state.townRankIndex);
  const share = Math.round((computeNetWorth(state) * MERCHANT_WORTH_SHARE) / 10) * 10;
  return Math.max(base, share);
}

/** Whether a new offer may appear on this tick (the caller adds the dice). */
export function merchantMayAppear(state: EconomyState): boolean {
  return !state.merchantOffer && state.tick + 1 >= (state.merchantCooldownTick ?? MERCHANT_FIRST_DELAY_TICKS);
}

export function makeMerchantOffer(state: EconomyState, id: number): MerchantOffer {
  return { id, reward: merchantReward(state) };
}

/** The ad was watched: the gift is paid. */
export function claimMerchantOffer(state: EconomyState): EconomyState {
  const offer = state.merchantOffer;
  if (!offer) return state;
  const event: EconomyEvent = {
    id: state.nextId,
    ...eventFields(state.language, "msg.merchantGift", { reward: offer.reward }),
    tone: "good",
  };
  return {
    ...state,
    cash: state.cash + offer.reward,
    merchantOffer: null,
    merchantCooldownTick: state.tick + MERCHANT_COOLDOWN_TICKS,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}

/** "No thanks". */
export function dismissMerchantOffer(state: EconomyState): EconomyState {
  if (!state.merchantOffer) return state;
  return { ...state, merchantOffer: null, merchantCooldownTick: state.tick + MERCHANT_COOLDOWN_TICKS };
}
