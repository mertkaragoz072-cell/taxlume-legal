import { LOAN_TERM_DAYS_PER_MONTH, TICKS_PER_GAME_DAY } from "./constants";
import { Loan } from "./types";

/** A loan has a term: the day it should be paid back by. Past it the bank is owed
 * money it expected, and after a short grace period it starts to collect on its
 * own, a slice of the treasury every game day, until the debt is gone. */
export const LOAN_GRACE_DAYS = 2;
/** Share of the treasury the bank takes on each collection day. */
export const LOAN_COLLECTION_SHARE = 0.25;

export function loanDueTick(loan: Loan): number {
  return loan.takenAtTick + loan.termMonths * LOAN_TERM_DAYS_PER_MONTH * TICKS_PER_GAME_DAY;
}

export type LoanPhase = "running" | "dueSoon" | "overdue" | "collecting";

/** Where the loan stands at `tick`: more than a day to go, due within a day,
 * past due and within the grace period, or being collected. */
export function loanPhase(loan: Loan, tick: number): LoanPhase {
  const due = loanDueTick(loan);
  if (tick >= due + LOAN_GRACE_DAYS * TICKS_PER_GAME_DAY) return "collecting";
  if (tick >= due) return "overdue";
  if (tick >= due - TICKS_PER_GAME_DAY) return "dueSoon";
  return "running";
}

export type LoanDueNotice = "dueSoon" | "overdue" | "collected" | null;

export interface LoanDueResult {
  cash: number;
  loan: Loan;
  notice: LoanDueNotice;
  /** what the bank took (for the message) */
  taken: number;
}

/** One tick of the due rules: a single notice when the loan becomes due soon and
 * when it goes overdue, and on the first tick of each game day in collection the
 * bank takes its share of the cash. Everything else leaves the loan alone. */
export function applyLoanDue(loan: Loan, cash: number, tick: number): LoanDueResult {
  const due = loanDueTick(loan);
  const next = tick + 1;
  const at = (t: number) => tick < t && next >= t;
  if (at(due - TICKS_PER_GAME_DAY)) return { cash, loan, notice: "dueSoon", taken: 0 };
  if (at(due)) return { cash, loan, notice: "overdue", taken: 0 };
  if (loanPhase(loan, next) === "collecting" && next % TICKS_PER_GAME_DAY === 0 && cash > 0) {
    const taken = Math.min(loan.remainingBalance, cash * LOAN_COLLECTION_SHARE);
    return {
      cash: cash - taken,
      loan: { ...loan, remainingBalance: loan.remainingBalance - taken },
      notice: "collected",
      taken,
    };
  }
  return { cash, loan, notice: null, taken: 0 };
}
