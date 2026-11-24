import { FESTIVAL_WINDOW_DAYS, festivalMonthKey, isFestivalWindowOpen } from "../townFestival";

describe("festivalMonthKey", () => {
  it("formats as YYYY-MM", () => {
    expect(festivalMonthKey("2026-03-02")).toBe("2026-03");
  });

  it("is the same for any day within the month", () => {
    expect(festivalMonthKey("2026-03-01")).toBe(festivalMonthKey("2026-03-31"));
  });
});

describe("isFestivalWindowOpen", () => {
  it("is open on the first day of the window", () => {
    expect(isFestivalWindowOpen("2026-03-01")).toBe(true);
  });

  it("is open on the last day of the window", () => {
    expect(isFestivalWindowOpen(`2026-03-0${FESTIVAL_WINDOW_DAYS}`)).toBe(true);
  });

  it("is closed right after the window", () => {
    expect(isFestivalWindowOpen(`2026-03-${String(FESTIVAL_WINDOW_DAYS + 1).padStart(2, "0")}`)).toBe(false);
  });

  it("is closed deep in the month", () => {
    expect(isFestivalWindowOpen("2026-03-20")).toBe(false);
  });
});
