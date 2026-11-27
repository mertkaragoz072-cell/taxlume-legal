import { INFLATION_INDEX_FLOOR } from "../constants";
import { tick } from "../tick";
import { initialState } from "../useEconomy";

describe("inflationIndex floor", () => {
  it("eases but never collapses under a long, sustained-happy idle run", () => {
    // A content town (low tax, nothing to make it unhappy) reverts its
    // inflationRate toward a negative target indefinitely (see the comment
    // by inflationTarget in tick.ts) — and since inflationIndex is that
    // rate's running product, compounding even a mild negative rate for
    // long enough used to decay it toward zero with no way back, crushing
    // every good's price through priceFromSupply's inflationIndex/100 term.
    // A pending decision/request/rival offer would otherwise pause the
    // whole sim (tick() no-ops while one is set), so clear them each tick
    // to simulate a player who promptly answers every popup — the point
    // here is the index's own long-run floor, not interruption handling.
    let s = initialState();
    let minSeen = s.inflationIndex;
    for (let i = 0; i < 3000; i++) {
      s = tick(s);
      if (s.pendingDecision || s.pendingRequest || s.pendingRivalOffer) {
        s = { ...s, pendingDecision: null, pendingRequest: null, pendingRivalOffer: null };
      }
      expect(s.inflationIndex).toBeGreaterThanOrEqual(INFLATION_INDEX_FLOOR);
      minSeen = Math.min(minSeen, s.inflationIndex);
    }
    // Deflation is now mild (a few percent a game day at most), so over this run the
    // index may ease or even rise, but it never gets near the floor.
    expect(minSeen).toBeGreaterThanOrEqual(INFLATION_INDEX_FLOOR);
  });
});
