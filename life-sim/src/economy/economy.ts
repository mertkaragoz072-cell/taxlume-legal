import type { TransactionCategory } from '../core/types';
import type { GameState } from '../simulation/state';

export interface Transaction {
  id: number;
  time: number;
  /** Positive = income, negative = expense. */
  amount: number;
  category: TransactionCategory;
  description: string;
  balanceAfter: number;
}

export type EconomyResult = { ok: true; balance: number } | { ok: false; reason: 'insufficient_funds' | 'invalid_amount'; shortBy?: number };

export const MAX_HISTORY = 500;

function record(state: GameState, amount: number, category: TransactionCategory, description: string): void {
  state.transactions.push({
    id: state.nextTransactionId++,
    time: state.time,
    amount,
    category,
    description,
    balanceAfter: state.money,
  });
  if (state.transactions.length > MAX_HISTORY) state.transactions.splice(0, state.transactions.length - MAX_HISTORY);
}

/** Single entry point for adding money. Whole currency units only. */
export function earn(state: GameState, amount: number, category: TransactionCategory, description: string): EconomyResult {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: 'invalid_amount' };
  state.money += amount;
  record(state, amount, category, description);
  return { ok: true, balance: state.money };
}

/** Single entry point for removing money. Never allows a negative balance. */
export function spend(state: GameState, amount: number, category: TransactionCategory, description: string): EconomyResult {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: 'invalid_amount' };
  if (state.money < amount) return { ok: false, reason: 'insufficient_funds', shortBy: amount - state.money };
  state.money -= amount;
  record(state, -amount, category, description);
  return { ok: true, balance: state.money };
}

export const canAfford = (state: GameState, amount: number): boolean => state.money >= amount;
export const formatMoney = (n: number): string => `$${n.toLocaleString('en-US')}`;
