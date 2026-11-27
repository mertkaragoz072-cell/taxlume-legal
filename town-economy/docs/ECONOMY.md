# How the town economy behaves (realism rules)

`src/economy/realism.ts` holds the rules that tie the game to how real economies work.

| Rule               | What it does                                                                                                                                                                                                                                                   | Where                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Money supply**   | Cash in the treasury, measured in days of the town's output (neutral at 1.5 days), pushes the inflation target up when it piles up and eases it when money is scarce. Spending money takes the pressure off. Shown as "Money supply" in the inflation factors. | `moneySupplyPressure`, `inflationPressureBreakdown` |
| **Indexed wages**  | A worker's wage follows the town price index (never below half), so a payroll keeps its real weight when prices rise.                                                                                                                                          | `workerWagePerTick`                                 |
| **Tax curve**      | Up to 20% everything is declared; above it a growing share of the base is hidden or never produced, so a very high rate collects little more (the top of the Laffer curve).                                                                                    | `taxBaseFactor`, `estimateTaxIncomePerTick`         |
| **Spoilage**       | Bread, milk, fish and cheese lose about 4% of the stock per game day.                                                                                                                                                                                          | `afterSpoilage`                                     |
| **Mild deflation** | A content town's prices ease slowly instead of collapsing: the lowest rate is a few % a day and the price index cannot go under 70 (it used to fall to 40 at -9% a day). Happiness relief and rate wobble were rescaled to match.                              | `difficulty.ts`, `constants.ts`                     |

Already in the game before: input costs pass into the price of what is made from them,
loans are priced from current inflation and term, high debt weighs on happiness.

Balance check used when tuning (idle town, 100 game days, six runs each): Easy and Normal
with 0% tax stay between about 70 and 240 on the index; any tax at 10% or more pushes
inflation up (through unhappiness) and ends an unattended town, which is the point of
the levers; Hard ends an unattended town at every tax rate.

`SAVE_VERSION` was raised to 59: older saves are discarded because the balance changed.
