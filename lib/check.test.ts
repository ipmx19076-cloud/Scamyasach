import { describe, expect, it } from "vitest";
import { CheckRequest, locateQuote, mergeResults, patternResult, type AiVerdict } from "./check";
import { checkPatterns } from "./rules";

const msg = "Dear customer, your account will be blocked today. Enter UPI PIN to receive ₹500 cashback.";

const ai = (over: Partial<AiVerdict>): AiVerdict => ({
  verdict: "scam",
  confidence: "high",
  summary: "This is a scam.",
  red_flags: [],
  safe_signs: [],
  what_to_do: ["Don't reply."],
  ...over,
});

describe("locateQuote", () => {
  it("finds exact and loosely matching quotes", () => {
    expect(locateQuote(msg, "will be blocked today")).toBe("will be blocked today");
    expect(locateQuote(msg, "“Enter  upi pin to receive”")).toBe("Enter UPI PIN to receive");
  });
  it("rejects text that isn't in the message", () => {
    expect(locateQuote(msg, "send your Aadhaar")).toBeNull();
  });
});

describe("mergeResults", () => {
  it("drops AI findings whose quote isn't in the message", () => {
    const r = mergeResults(
      ai({ red_flags: [{ quote: "will be blocked today", why: "Threat" }, { quote: "invented words", why: "x" }] }),
      checkPatterns(""),
      msg,
      "",
    );
    expect(r.flags.map((f) => f.quote)).toEqual(["will be blocked today"]);
  });

  it("adds pattern findings the AI missed", () => {
    const r = mergeResults(ai({}), checkPatterns(msg), msg, "");
    expect(r.flags.some((f) => /PIN/.test(f.quote))).toBe(true);
  });

  it("downgrades an AI 'genuine' verdict to suspicious when a severe red flag is present", () => {
    const r = mergeResults(ai({ verdict: "likely_genuine" }), checkPatterns(msg), msg, "");
    expect(r.verdict).toBe("suspicious");
    expect(r.note).toBeTruthy();
  });

  it("keeps a genuine verdict when nothing severe is found", () => {
    const ok = "Your order #EX12 is out for delivery today.";
    expect(mergeResults(ai({ verdict: "likely_genuine" }), checkPatterns(ok), ok, "").verdict).toBe("likely-genuine");
  });
});

describe("patternResult and request validation", () => {
  it("builds a usable fallback result", () => {
    const r = patternResult(msg, "", "AI unavailable");
    expect(r.verdict).toBe("scam");
    expect(r.source).toBe("patterns");
    expect(r.whatToDo.length).toBeGreaterThan(0);
  });
  it("rejects empty and overlong messages", () => {
    expect(CheckRequest.safeParse({ text: "  " }).success).toBe(false);
    expect(CheckRequest.safeParse({ text: "x".repeat(4001) }).success).toBe(false);
    expect(CheckRequest.safeParse({ text: msg }).success).toBe(true);
  });
});

describe("mergeResults overlap", () => {
  it("doesn't add a pattern finding that overlaps an AI finding", () => {
    const t = "Your OTP is [code]. Please share it with our executive.";
    const r = mergeResults(ai({ red_flags: [{ quote: "Please share it with our executive", why: "x" }] }), checkPatterns(t), t, "");
    expect(r.flags).toHaveLength(1);
  });
});
