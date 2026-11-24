import { t, tPlural } from "../../i18n/t";
import { timeAgo, timeLeft } from "../../components/guild/timeAgo";

const MIN = 60_000;
const NOW = 1_800_000_000_000;

describe("guild time labels", () => {
  const en = {
    t: (k: string, p?: Record<string, string | number>) => t("en", k, p),
    tp: (k: string, n: number, p?: Record<string, string | number>) => tPlural("en", k, n, p),
  };
  const tr = {
    t: (k: string, p?: Record<string, string | number>) => t("tr", k, p),
    tp: (k: string, n: number, p?: Record<string, string | number>) => tPlural("tr", k, n, p),
  };

  it("says how long ago, in English and Turkish", () => {
    expect(timeAgo(NOW - 20_000, NOW, en.t, en.tp)).toBe("just now");
    expect(timeAgo(NOW - 5 * MIN, NOW, en.t, en.tp)).toBe("5 min ago");
    expect(timeAgo(NOW - 3 * 60 * MIN, NOW, en.t, en.tp)).toBe("3 h ago");
    expect(timeAgo(NOW - 5 * MIN, NOW, tr.t, tr.tp)).toBe("5 dk önce");
  });

  it("does not say '1 days' or '1 trades'", () => {
    expect(timeAgo(NOW - 24 * 60 * MIN * 1, NOW - 0, en.t, en.tp)).toBe("24 h ago");
    expect(timeAgo(NOW - 49 * 60 * MIN, NOW, en.t, en.tp)).toBe("2 days ago");
    expect(en.tp("guild.contribution", 1, { n: 1 })).toBe("1 trade");
    expect(en.tp("guild.contribution", 0, { n: 0 })).toBe("0 trades");
    expect(en.tp("guild.contribution", 7, { n: 7 })).toBe("7 trades");
    expect(tr.tp("guild.contribution", 1, { n: 1 })).toBe("1 işlem");
    expect(en.tp("guild.duelYou", 1, { n: 1 })).toBe("You: 1 trade");
  });

  it("counts down a duel or a caravan", () => {
    expect(timeLeft(NOW + 125 * MIN, NOW)).toBe("2h 5m");
    expect(timeLeft(NOW + 45 * MIN, NOW)).toBe("45m");
    expect(timeLeft(NOW - MIN, NOW)).toBe("0m");
  });
});
