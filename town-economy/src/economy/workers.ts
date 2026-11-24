export const WORKER_MAX_PER_GOOD = 3;
// A recurring cost, unlike research's one-time payment — hire freely,
// fire freely, but every worker on the books costs the treasury each tick.
//
// Priced so that staffing a good is a decision rather than an obvious yes.
// At 0.4 a worker cost 16 🪙 a game day against a +8% production bonus that
// was worth far more than that on anything but the cheapest goods, so the
// only sensible play was to fill every slot the moment the cash existed and
// never think about it again. At 0.9 the wage bill is 36 🪙 a day per
// worker — real money against a low-margin good, still clearly worth it on
// a high-value one, and a payroll that has to be watched when the town is
// having a bad week.
export const WORKER_WAGE_PER_TICK = 0.9;
export const WORKER_PRODUCTION_BONUS_PER_WORKER = 0.08;
