import { z } from "zod";
import { checkPatterns, type PatternResult } from "./rules";

/* Shared between the API route and the browser. No server-only imports here. */

export const CHANNELS = ["sms", "whatsapp", "email", "call", "upi", "other"] as const;
export type CheckChannel = (typeof CHANNELS)[number];

export const MAX_MESSAGE_CHARS = 4000;

export const CheckRequest = z.object({
  text: z.string().trim().min(5, "Paste a little more of the message.").max(MAX_MESSAGE_CHARS),
  sender: z.string().trim().max(120).optional().default(""),
  channel: z.enum(CHANNELS).optional().default("other"),
});
export type CheckRequest = z.infer<typeof CheckRequest>;

/** What the model must return (enforced through a tool schema, then validated here). */
export const AiVerdict = z.object({
  verdict: z.enum(["scam", "suspicious", "likely_genuine"]),
  confidence: z.enum(["low", "medium", "high"]),
  scam_type: z.string().max(80).optional().nullable(),
  summary: z.string().min(1).max(400),
  red_flags: z.array(z.object({ quote: z.string().min(1).max(300), why: z.string().min(1).max(300) })).max(8),
  safe_signs: z.array(z.object({ quote: z.string().min(1).max(300), why: z.string().min(1).max(300) })).max(6),
  what_to_do: z.array(z.string().min(1).max(200)).min(1).max(5),
});
export type AiVerdict = z.infer<typeof AiVerdict>;

export type FinalVerdict = "scam" | "suspicious" | "likely-genuine" | "no-flags";

export interface Finding {
  quote: string;
  why: string;
  where: "message" | "sender";
}

export interface CheckResult {
  verdict: FinalVerdict;
  confidence?: "low" | "medium" | "high";
  scamType?: string;
  summary: string;
  /** The text that was checked (after hiding codes and account numbers). */
  checkedText: string;
  flags: Finding[];
  safeSigns: { quote: string; why: string }[];
  whatToDo: string[];
  /** "ai" when Claude judged it, "patterns" when only the built-in check ran. */
  source: "ai" | "patterns";
  /** Shown above the result, for example when the AI was unavailable. */
  note?: string;
}

const DO_SCAM = [
  "Don’t reply, click any link, call the number, pay, or share any code.",
  "If it claims to be from your bank or a company, call them on the number on your card or their official app.",
  "Report the number: block it and report it as spam in your messaging app.",
  "If you already paid or shared details, call 1930 right away and report at cybercrime.gov.in.",
];
const DO_SUSPICIOUS = [
  "Don’t act on it yet. Don’t click links, pay, or share any code.",
  "Check it yourself: open the official app or call the official number you already have.",
  "Ask someone you trust to take a look before you respond.",
];
const DO_GENUINE = [
  "It looks normal, but still never share your OTP, PIN or passwords with anyone.",
  "If anything about it surprises you, check in the official app rather than through the message.",
];

export function whatToDoFor(v: FinalVerdict): string[] {
  return v === "scam" ? DO_SCAM : v === "suspicious" ? DO_SUSPICIOUS : DO_GENUINE;
}

/** A result from the pattern check alone. */
export function patternResult(text: string, sender: string, note?: string, pre?: PatternResult): CheckResult {
  const p = pre ?? checkPatterns(text, sender);
  const verdict: FinalVerdict = p.verdict;
  const summary =
    verdict === "scam"
      ? "This message has classic scam warning signs. Treat it as a scam."
      : verdict === "suspicious"
        ? "Some parts of this message are commonly used by scammers. Be careful and check it another way."
        : "Our pattern check found none of the common scam signs. That doesn’t prove it’s genuine: new tricks appear all the time.";
  return {
    verdict,
    summary,
    checkedText: text,
    flags: p.hits.map((h) => ({ quote: h.quote, why: h.why, where: h.where })),
    safeSigns: p.safeSigns,
    whatToDo: whatToDoFor(verdict),
    source: "patterns",
    note,
  };
}

/**
 * Finds a quote in the message, tolerating differences in whitespace and
 * case. Returns the exact text as it appears in the message, or null.
 */
export function locateQuote(text: string, quote: string): string | null {
  const q = quote.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
  if (!q) return null;
  if (text.includes(q)) return q;
  const pattern = q
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const m = new RegExp(pattern, "i").exec(text);
  return m ? m[0] : null;
}

/**
 * Combines the AI's judgement with the pattern check.
 * - Every AI finding must quote text that really is in the message (or the
 *   sender); anything else is dropped rather than shown.
 * - If the AI calls it genuine but the pattern check found a severe red flag,
 *   the verdict becomes "suspicious" and the reason is shown.
 */
export function mergeResults(ai: AiVerdict, patterns: PatternResult, text: string, sender: string): CheckResult {
  const flags: Finding[] = [];
  for (const f of ai.red_flags) {
    const inText = locateQuote(text, f.quote);
    if (inText) flags.push({ quote: inText, why: f.why, where: "message" });
    else if (sender && locateQuote(sender, f.quote)) flags.push({ quote: sender, why: f.why, where: "sender" });
  }
  const safeSigns = ai.safe_signs
    .map((s) => ({ quote: locateQuote(text, s.quote), why: s.why }))
    .filter((s): s is { quote: string; why: string } => s.quote !== null);

  // Add pattern findings the AI didn't already cover (no overlapping text).
  const range = (q: string): [number, number] => {
    const i = text.indexOf(q);
    return [i, i + q.length];
  };
  const taken = flags.filter((f) => f.where === "message").map((f) => range(f.quote));
  for (const h of patterns.hits) {
    if (h.where === "sender") {
      if (!flags.some((f) => f.where === "sender")) flags.push({ quote: h.quote, why: h.why, where: "sender" });
      continue;
    }
    const [a, b] = range(h.quote);
    if (a < 0 || taken.some(([x, y]) => a < y && b > x)) continue;
    taken.push([a, b]);
    flags.push({ quote: h.quote, why: h.why, where: "message" });
  }

  let verdict: FinalVerdict = ai.verdict === "likely_genuine" ? "likely-genuine" : ai.verdict;
  let note: string | undefined;
  const severe = patterns.hits.filter((h) => h.severity === 3);
  if (verdict === "likely-genuine" && severe.length > 0) {
    verdict = "suspicious";
    note = "The AI thought this looked genuine, but our pattern check found a serious warning sign, so we’re marking it as suspicious.";
  }

  return {
    verdict,
    confidence: ai.confidence,
    scamType: ai.scam_type ?? undefined,
    summary: ai.summary,
    checkedText: text,
    flags: flags.sort((a, b) => (a.where === b.where ? text.indexOf(a.quote) - text.indexOf(b.quote) : a.where === "message" ? -1 : 1)),
    safeSigns,
    whatToDo: ai.what_to_do.length ? ai.what_to_do : whatToDoFor(verdict),
    source: "ai",
    note,
  };
}
