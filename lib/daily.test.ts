import { describe, expect, it } from "vitest";
import { scenarios } from "../content/scenarios";
import { DAILY_COUNT, istDateKey, pickDaily } from "./daily";

describe("istDateKey", () => {
  it("uses the India date, not UTC", () => {
    // 18:29 UTC = 23:59 IST on 12 Oct
    expect(istDateKey(new Date("2026-10-12T18:29:00Z"))).toBe("2026-10-12");
    // 18:30 UTC = 00:00 IST on 13 Oct
    expect(istDateKey(new Date("2026-10-12T18:30:00Z"))).toBe("2026-10-13");
  });
});

describe("pickDaily", () => {
  it("returns 10 unique cards", () => {
    const set = pickDaily(scenarios, "2026-10-13");
    expect(set).toHaveLength(DAILY_COUNT);
    expect(new Set(set.map((s) => s.id)).size).toBe(DAILY_COUNT);
  });

  it("is identical for the same date (two phones, same day)", () => {
    const a = pickDaily(scenarios, "2026-10-13").map((s) => s.id);
    const b = pickDaily(scenarios, "2026-10-13").map((s) => s.id);
    expect(a).toEqual(b);
  });

  it("does not depend on the order of the scenario file", () => {
    const a = pickDaily(scenarios, "2026-10-13").map((s) => s.id);
    const b = pickDaily(scenarios.slice().reverse(), "2026-10-13").map((s) => s.id);
    expect(a).toEqual(b);
  });

  it("changes from day to day", () => {
    const a = pickDaily(scenarios, "2026-10-13").map((s) => s.id).join();
    const b = pickDaily(scenarios, "2026-10-14").map((s) => s.id).join();
    expect(a).not.toBe(b);
  });

  it("always has 6 scams with distinct types, 4 genuine, ordered easy to hard", () => {
    for (let d = 1; d <= 60; d++) {
      const date = `2026-11-${String((d % 28) + 1).padStart(2, "0")}-${d}`;
      const set = pickDaily(scenarios, date);
      const scams = set.filter((s) => s.isScam);
      expect(scams).toHaveLength(6);
      expect(new Set(scams.map((s) => s.scamType)).size).toBe(6);
      expect(set.filter((s) => !s.isScam)).toHaveLength(4);
      const diffs = set.map((s) => s.difficulty);
      expect(diffs).toEqual(diffs.slice().sort());
    }
  });
});
