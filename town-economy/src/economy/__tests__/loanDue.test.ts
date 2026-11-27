import { LOAN_TERM_DAYS_PER_MONTH, TICKS_PER_GAME_DAY } from "../constants";
import { applyLoanDue, LOAN_COLLECTION_SHARE, LOAN_GRACE_DAYS, loanDueTick, loanPhase } from "../loanDue";
import { Loan } from "../types";

const loan = (over: Partial<Loan> = {}): Loan => ({
  principal: 1000,
  remainingBalance: 1000,
  interestRatePerTick: 0,
  termMonths: 3,
  takenAtTick: 100,
  ...over,
});
const DAY = TICKS_PER_GAME_DAY;

describe("loan due rules", () => {
  it("falls due after its term", () => {
    expect(loanDueTick(loan())).toBe(100 + 3 * LOAN_TERM_DAYS_PER_MONTH * DAY);
  });

  it("moves through running, due soon, overdue and collecting", () => {
    const l = loan();
    const due = loanDueTick(l);
    expect(loanPhase(l, due - DAY - 1)).toBe("running");
    expect(loanPhase(l, due - 1)).toBe("dueSoon");
    expect(loanPhase(l, due)).toBe("overdue");
    expect(loanPhase(l, due + LOAN_GRACE_DAYS * DAY)).toBe("collecting");
  });

  it("warns once as it nears the due date and once when it passes it", () => {
    const l = loan();
    const due = loanDueTick(l);
    expect(applyLoanDue(l, 500, due - DAY - 1).notice).toBe("dueSoon");
    expect(applyLoanDue(l, 500, due - DAY).notice).toBeNull();
    expect(applyLoanDue(l, 500, due - 1).notice).toBe("overdue");
  });

  it("takes nothing while it is merely overdue", () => {
    const l = loan();
    const r = applyLoanDue(l, 500, loanDueTick(l) + 5);
    expect(r.cash).toBe(500);
    expect(r.loan.remainingBalance).toBe(1000);
  });

  it("collects a share of the treasury on collection days, never more than is owed", () => {
    const l = loan();
    const start = loanDueTick(l) + LOAN_GRACE_DAYS * DAY;
    // the tick that lands on a day boundary
    const t = Math.ceil(start / DAY) * DAY - 1;
    const r = applyLoanDue(l, 800, t);
    expect(r.notice).toBe("collected");
    expect(r.taken).toBeCloseTo(800 * LOAN_COLLECTION_SHARE);
    expect(r.cash).toBeCloseTo(800 - r.taken);
    expect(r.loan.remainingBalance).toBeCloseTo(1000 - r.taken);
    const small = applyLoanDue(loan({ remainingBalance: 20 }), 800, t);
    expect(small.taken).toBe(20);
    expect(applyLoanDue(l, 0, t).notice).toBeNull();
  });
});
