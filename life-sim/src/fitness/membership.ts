import { EventBus } from '../core/events';
import { GYM_PRICES } from '../data/exercises';
import { spend } from '../economy/economy';
import type { GameState } from '../simulation/state';
import { DAY } from '../simulation/time';

export type MembershipPlan = 'dayPass' | 'monthly';

const PLAN_INFO: Record<MembershipPlan, { label: string; days: number }> = {
  dayPass: { label: 'Day pass', days: 1 },
  monthly: { label: 'Monthly membership', days: 30 },
};

export const planInfo = (plan: MembershipPlan) => ({ ...PLAN_INFO[plan], price: GYM_PRICES[plan] });

export const hasMembership = (state: GameState): boolean => state.gym.membershipUntil > state.time;

/** Seconds of membership remaining (0 if none). */
export const membershipRemaining = (state: GameState): number => Math.max(0, state.gym.membershipUntil - state.time);

/** Buy or extend a membership through the central economy service. */
export function purchaseMembership(state: GameState, plan: MembershipPlan, bus?: EventBus): boolean {
  const info = planInfo(plan);
  const r = spend(state, info.price, 'gym', info.label);
  if (!r.ok) {
    bus?.emit('error', r.reason === 'insufficient_funds' ? `Not enough money — you are $${r.shortBy} short.` : 'Invalid purchase.');
    return false;
  }
  const from = Math.max(state.time, state.gym.membershipUntil);
  state.gym.membershipUntil = from + info.days * DAY;
  bus?.emit('success', `${info.label} purchased.`);
  return true;
}
