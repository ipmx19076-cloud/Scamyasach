/**
 * Hides sensitive numbers before a message leaves the phone. The checker
 * doesn't need them to judge a message, and a pasted real message may contain
 * the person's own OTP or account number.
 *
 * - One-time codes (4–8 digits near "OTP", "code", "PIN" or "password") → [code]
 * - Long digit runs of 11–19 digits (account and card numbers) → [number]
 * - Indian mobile numbers are kept but partly masked, because "call this
 *   personal number" is itself a useful red flag: 98765 43210 → 98XXX XX210
 */
export interface Redaction {
  text: string;
  codes: number;
  numbers: number;
}

const CODE_WORD = /(otp|o\.t\.p|one[- ]time|code|pin|password|passcode)/i;

export function redact(input: string): Redaction {
  let codes = 0;
  let numbers = 0;

  // Long digit runs, allowing spaces or dashes inside (card numbers are often grouped).
  let text = input.replace(/\b\d(?:[ -]?\d){10,18}\b/g, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length === 12 && /^91[6-9]/.test(digits)) return maskMobile(m); // +91 mobile written without +
    numbers++;
    return "[number]";
  });

  // Mobile numbers: 10 digits starting 6–9, optionally with +91 / spaces.
  text = text.replace(/(?<![\d[])(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g, maskMobile);

  // One-time codes: 4–8 digit numbers within ~30 characters of a code word.
  text = text.replace(/\b\d{4,8}\b/g, (m, offset: number, whole: string) => {
    const around = whole.slice(Math.max(0, offset - 30), offset + m.length + 30);
    if (CODE_WORD.test(around)) {
      codes++;
      return "[code]";
    }
    return m;
  });

  return { text, codes, numbers };
}

function maskMobile(m: string): string {
  // Keep the shape and the first two and last three digits.
  let seen = 0;
  const total = m.replace(/\D/g, "").length;
  return m.replace(/\d/g, (d) => {
    seen++;
    const fromEnd = total - seen;
    const isPrefix = total > 10 && seen <= total - 10; // country code
    const pos = isPrefix ? -1 : seen - (total - 10); // 1-based within the 10 digits
    if (isPrefix || pos <= 2 || fromEnd < 3) return d;
    return "X";
  });
}
