import { describe, expect, it } from "vitest";
import { scenarios } from "../content/scenarios";
import { mulberry32 } from "./random";
import { accuracyByType, mostMissed, pickPractice, pointsFor, rate, scoreAnswer } from "./scoring";
import { emojiGrid, shareText } from "./share";
import type { Answer } from "./types";

const scam = scenarios.find((s) => s.isScam)!;
const real = scenarios.find((s) => !s.isScam)!;

function ans(partial: Partial<Answer>): Answer {
  return { id: "x", scamType: "kyc", isScam: true, choseScam: true, correct: true, ms: 1000, points: 100, ...partial };
}

describe("pointsFor", () => {
  it("gives nothing for a wrong answer", () => {
    expect(pointsFor(false, 1000, 12000, 0)).toBe(0);
  });
  it("rewards speed", () => {
    expect(pointsFor(true, 0, 12000, 1)).toBe(200);
    expect(pointsFor(true, 6000, 12000, 1)).toBe(150);
    expect(pointsFor(true, 12000, 12000, 1)).toBe(100);
  });
  it("adds a capped streak bonus", () => {
    expect(pointsFor(true, 12000, 12000, 3)).toBe(140);
    expect(pointsFor(true, 12000, 12000, 50)).toBe(200);
  });
});

describe("scoreAnswer", () => {
  it("counts a timeout as wrong and resets the streak", () => {
    const { answer, streak } = scoreAnswer(scam, null, 12000, 12000, 4);
    expect(answer.correct).toBe(false);
    expect(answer.choseScam).toBeNull();
    expect(streak).toBe(0);
  });
  it("marks Sach on a genuine message as correct", () => {
    const { answer, streak } = scoreAnswer(real, false, 3000, 12000, 2);
    expect(answer.correct).toBe(true);
    expect(streak).toBe(3);
  });
  it("marks Scam on a genuine message as wrong", () => {
    expect(scoreAnswer(real, true, 3000, 12000, 0).answer.correct).toBe(false);
  });
});

describe("rating and breakdown", () => {
  const ten = (n: number) => Array.from({ length: 10 }, (_, i) => ans({ correct: i < n }));
  it("rates by accuracy", () => {
    expect(rate(ten(8))).toBe("Fraud-proof");
    expect(rate(ten(5))).toBe("Alert");
    expect(rate(ten(4))).toBe("Easy target");
  });
  it("finds the two most-missed types", () => {
    const answers = [
      ans({ scamType: "kyc", correct: false }),
      ans({ scamType: "kyc", correct: false }),
      ans({ scamType: "lottery", correct: false }),
      ans({ scamType: "otp-request", correct: true }),
      ans({ scamType: "genuine", correct: false, isScam: false }),
      ans({ scamType: "genuine", correct: true, isScam: false }),
    ];
    expect(mostMissed(answers)).toEqual(["kyc", "lottery"]);
    expect(accuracyByType(answers).find((r) => r.scamType === "genuine")).toEqual({ scamType: "genuine", correct: 1, total: 2 });
  });
});

describe("share text", () => {
  it("builds an emoji grid", () => {
    expect(emojiGrid([ans({}), ans({ correct: false, choseScam: false }), ans({ correct: false, choseScam: null })])).toBe("🟩🟥⬜");
  });
  it("includes date, score and link", () => {
    const text = shareText([ans({})], "daily", "2026-10-13", "https://example.test");
    expect(text).toContain("Daily 2026-10-13");
    expect(text).toContain("1/1");
    expect(text).toContain("https://example.test");
  });
});

describe("pickPractice", () => {
  it("starts with easy cards and avoids repeats", () => {
    const rng = mulberry32(1);
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const s = pickPractice(scenarios, seen, 0, rng);
      expect(s.difficulty).toBe(1);
      expect(seen.has(s.id)).toBe(false);
      seen.add(s.id);
    }
  });
  it("moves to hard cards as the player improves", () => {
    expect(pickPractice(scenarios, new Set(), 10, mulberry32(2)).difficulty).toBe(3);
  });
  it("never runs out", () => {
    const all = new Set(scenarios.map((s) => s.id));
    expect(pickPractice(scenarios, all, 0, mulberry32(3))).toBeDefined();
  });
});
