import { tick } from "../tick";
import { initialState } from "../useEconomy";

describe("guild level in the economy", () => {
  afterEach(() => jest.restoreAllMocks());

  it("a leveled guild raises output a little, and no guild changes nothing", () => {
    const base = initialState();
    const run = (guildLevel?: number) => {
      jest.spyOn(Math, "random").mockReturnValue(0.5); // the economy is noisy: same dice for every run
      return tick(guildLevel === undefined ? base : { ...base, guildLevel }).goods.grain.supply;
    };
    const old = run(undefined); // a save from before guilds has no guildLevel at all
    const none = run(0);
    const leveled = run(11);
    expect(none).toBe(old);
    expect(leveled).toBeGreaterThan(none);
  });
});
