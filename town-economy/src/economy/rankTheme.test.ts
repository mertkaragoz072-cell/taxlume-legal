import { rankTheme, sceneBandForRank } from "./rankTheme";

describe("rankTheme", () => {
  it("maps ranks to scene bands in order", () => {
    expect([0, 1, 2, 4, 5, 7, 8, 20].map(sceneBandForRank)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("gives every band its own accent", () => {
    const accents = new Set([0, 2, 5, 8].map((i) => rankTheme(i).accent));
    expect(accents.size).toBe(4);
  });
});
