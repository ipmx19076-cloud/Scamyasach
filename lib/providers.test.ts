import { describe, expect, it } from "vitest";
import { AiVerdict } from "./check";
import { pickProvider, trimAnswer } from "./providers";

describe("pickProvider", () => {
  it("uses whichever key is set", () => {
    expect(pickProvider({})).toBeNull();
    expect(pickProvider({ OPENAI_API_KEY: "x" })).toBe("openai");
    expect(pickProvider({ ANTHROPIC_API_KEY: "x" })).toBe("anthropic");
  });
  it("prefers Anthropic when both are set, unless forced", () => {
    expect(pickProvider({ OPENAI_API_KEY: "x", ANTHROPIC_API_KEY: "y" })).toBe("anthropic");
    expect(pickProvider({ OPENAI_API_KEY: "x", ANTHROPIC_API_KEY: "y", AI_PROVIDER: "openai" })).toBe("openai");
  });
  it("ignores a forced provider whose key is missing", () => {
    expect(pickProvider({ AI_PROVIDER: "anthropic", OPENAI_API_KEY: "x" })).toBe("openai");
  });
});

describe("trimAnswer", () => {
  it("trims long lists so a valid answer isn't rejected, and accepts a null scam type", () => {
    const raw = {
      verdict: "scam",
      confidence: "high",
      scam_type: null,
      summary: "s",
      red_flags: Array.from({ length: 12 }, (_, i) => ({ quote: `q${i}`, why: "w" })),
      safe_signs: [],
      what_to_do: ["a", "b", "c", "d", "e", "f"],
    };
    expect(AiVerdict.safeParse(raw).success).toBe(false);
    expect(AiVerdict.safeParse(trimAnswer(raw)).success).toBe(true);
  });
});
