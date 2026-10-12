import { describe, expect, it } from "vitest";
import { scenarios } from "../content/scenarios";
import { redact } from "./redact";
import { checkPatterns } from "./rules";

describe("pattern check on the game's 40 scenarios", () => {
  it.each(scenarios.map((s) => [s.id, s] as const))("%s", (_id, s) => {
    const r = checkPatterns(s.body, s.sender);
    if (s.isScam) expect(r.verdict, r.hits.map((h) => h.id).join()).not.toBe("no-flags");
    else expect(r.verdict, r.hits.map((h) => h.id).join()).not.toBe("scam");
  });
});

describe("pattern check on messages written separately from the game", () => {
  const scams = [
    "Dear user your BPB acount will be closed today pls update PAN card click https://bpb-kyc.top/upd",
    "Hello sir I am from customer care, kindly download AnyDesk so I can process your refund",
    "Your SwiftDak parcel has illegal items. Mumbai police will call you. Do not tell anyone about this case.",
    "Earn 5000 daily!! Just like videos. Part time job, work from home. Reply YES",
    "Hi dear, I have sent you ₹2000 by mistake, kindly approve the request to send it back",
    "Congratulations you are winner of Mega lottery 25 lakh. Pay registration fee ₹4500 to claim",
    "Your electricity will be disconnected tonight. Call 9123456789 immediately",
    "Mom this is my new number, my phone broke. Can you share the OTP you just got? urgent",
  ];
  const genuine = [
    "Rs 499.00 spent on your credit card XX1234 at EXAMPLEMART on 12-10-26. Not you? Call the number on the back of your card.",
    "Your FoodDash order is on the way! Track it in the app.",
    "123456 is your OTP for login. Do not share it with anyone. Valid 5 mins.",
    "Hi! Are we still on for dinner on Saturday at 8?",
    "Your appointment at City Dental is confirmed for 15 Oct, 10:30 AM. Reply C to cancel.",
    "Your bill of Rs 845 for September is generated. Due date 28-Oct. Ignore if paid.",
  ];
  it.each(scams)("flags: %s", (msg) => {
    expect(checkPatterns(msg).verdict).not.toBe("no-flags");
  });
  it.each(genuine)("doesn't call a scam: %s", (msg) => {
    expect(checkPatterns(msg).verdict).not.toBe("scam");
  });

  it("quotes text that really appears in the message", () => {
    const msg = scams[0];
    for (const h of checkPatterns(msg).hits) expect(msg).toContain(h.quote);
  });

  it("treats 'do not share your OTP' as advice, not a request", () => {
    expect(checkPatterns("Never share your OTP or PIN with anyone.").hits.find((h) => h.id === "share-code")).toBeUndefined();
  });

  it("flags an official-sounding message from a personal mobile", () => {
    const r = checkPatterns("Your bank KYC is pending", "+91 98765 43210");
    expect(r.hits.some((h) => h.id === "official-from-mobile" && h.where === "sender")).toBe(true);
  });
});

describe("redact", () => {
  it("hides OTPs near a code word", () => {
    expect(redact("Your OTP is 482913. Do not share.")).toMatchObject({ text: "Your OTP is [code]. Do not share.", codes: 1 });
    expect(redact("482913 is your verification code").text).toBe("[code] is your verification code");
  });
  it("hides account and card numbers", () => {
    expect(redact("A/c 123456789012 credited").text).toBe("A/c [number] credited");
    expect(redact("Card 4111 1111 1111 1111 used").text).toBe("Card [number] used");
  });
  it("keeps mobile numbers recognisable but masked", () => {
    expect(redact("Call 9876543210 now").text).toBe("Call 98XXXXX210 now");
    expect(redact("Call +91 98765 43210 now").text).toBe("Call +91 98XXX XX210 now");
  });
  it("leaves amounts, dates and short numbers alone", () => {
    const t = "Rs 2,150.00 debited on 12-10-26, ref 20231009";
    expect(redact(t).text).toBe(t);
  });
});
