import { describe, expect, it } from "vitest";
import { segment } from "../lib/highlight";
import { scenarios } from "./scenarios";

const SCAM_TYPES = [
  "kyc",
  "upi-collect",
  "fake-care",
  "digital-arrest",
  "electricity",
  "job-task",
  "parcel-fee",
  "lottery",
  "screen-share",
  "otp-request",
  "investment",
] as const;

describe("scenario content", () => {
  it("has about 40 scenarios, roughly 60% scams", () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(40);
    const share = scenarios.filter((s) => s.isScam).length / scenarios.length;
    expect(share).toBeGreaterThan(0.55);
    expect(share).toBeLessThan(0.65);
  });

  it("has unique ids", () => {
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
  });

  it("covers every scam type in the brief", () => {
    for (const t of SCAM_TYPES) expect(scenarios.some((s) => s.scamType === t), t).toBe(true);
  });

  it("labels genuine messages consistently", () => {
    for (const s of scenarios) expect(s.scamType === "genuine", s.id).toBe(!s.isScam);
  });

  it.each(scenarios.map((s) => [s.id, s] as const))("%s: every flag appears in the message and is highlighted", (_id, s) => {
    expect(s.flags.length).toBeGreaterThan(0);
    expect(s.takeaway.length).toBeGreaterThan(0);
    for (const f of s.flags) expect(s.body, f.text).toContain(f.text);
    const highlighted = segment(s.body, s.flags).filter((seg) => seg.flag !== undefined);
    expect(highlighted).toHaveLength(s.flags.length);
  });

  it("contains no working links, real-looking numbers or real UPI handles", () => {
    for (const s of scenarios) {
      const text = [s.sender, s.subject ?? "", s.body].join(" ");
      // Every domain-like token must use the reserved .example TLD.
      const withoutUpi = text.replace(/[a-z0-9._-]+@exampay\b/gi, "");
      const domains = withoutUpi.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)+\b/gi) ?? [];
      for (const d of domains) {
        if (/^\d+(\.\d+)+(am|pm)?$/i.test(d)) continue; // amounts and times like 2,150.00 or 9.30pm
        if (/^(rs|dr|a\/c|no)\./i.test(d)) continue;
        expect(d.toLowerCase().endsWith(".example") || /\.example\//.test(d), `${s.id}: ${d}`).toBe(true);
      }
      // Phone numbers: 7+ digits in a row would be dialable. Real-looking ones are masked with X.
      expect(text, s.id).not.toMatch(/\d{7,}/);
      // UPI handles must use the invented @exampay provider.
      for (const h of text.match(/@[a-z]+\b/gi) ?? []) {
        if (s.channel === "email") continue;
        expect(h, s.id).toBe("@exampay");
      }
      expect(text).not.toMatch(/https?:\/\/(?![a-z0-9-]+\.example)/i);
    }
  });
});
