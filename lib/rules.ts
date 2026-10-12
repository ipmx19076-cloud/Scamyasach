/**
 * Pattern check: a fast, offline red-flag detector. It runs in the browser on
 * every check, backs up the AI when it's unavailable, and catches the classic
 * tricks even if the AI misses them. Each finding quotes the exact text it
 * matched so it can be highlighted.
 */

export type Severity = 1 | 2 | 3;
export type Verdict = "scam" | "suspicious" | "no-flags";

export interface RuleHit {
  id: string;
  /** Exact text from the message (or the sender) that triggered the rule. */
  quote: string;
  why: string;
  severity: Severity;
  where: "message" | "sender";
}

interface Rule {
  id: string;
  pattern: RegExp;
  why: string;
  severity: Severity;
}

// Words that turn a warning into advice ("do not share your OTP").
const NEGATION = /\b(not|never|don'?t|do not|no one|nobody|will never|won'?t)\b[^.!?\n]{0,45}$/i;

const RULES: Rule[] = [
  {
    id: "pin-to-receive",
    pattern: /\b(enter|type|use|put)\b[^.!?\n]{0,30}\b(upi )?pin\b[^.!?\n]{0,40}\b(receive|get|credit|claim|refund|cashback|back)\b/i,
    why: "A UPI PIN is only used to send money. You never enter it to receive money.",
    severity: 3,
  },
  {
    id: "approve-request",
    pattern: /\b(approve|accept)\b[^.!?\n]{0,30}\b(request|collect)\b[^.!?\n]{0,40}\b(receive|get|back|refund|return)\b|\b(scan|approve)\b[^.!?\n]{0,25}\b(qr|request)\b[^.!?\n]{0,30}\bto (receive|get)\b/i,
    why: "Approving a request or scanning a QR code sends money from your account.",
    severity: 3,
  },
  {
    id: "share-code",
    pattern: /\b(share|send|tell|read( it)? out|forward|give)\b[^.!?\n]{0,30}\b(otp|code|pin|password|cvv)\b|\b(otp|code)\b[^.!?\n]{0,25}\b(share|send|tell|forward|read)\b[^.!?\n]{0,15}\b(me|us|our (executive|agent|team))\b|\b(otp|code)\b[\s\S]{0,80}\b(forward|send|share|tell) (it|that|the code)\b/i,
    why: "Anyone who asks for an OTP, PIN or code is trying to get into your account.",
    severity: 3,
  },
  {
    id: "apk",
    pattern: /\b[\w-]+\.apk\b|\bapk (file|link)\b/i,
    why: "An .apk file installs an app outside the app store. It can read your messages and OTPs.",
    severity: 3,
  },
  {
    id: "remote-app",
    pattern: /\b(anydesk|any desk|teamviewer|team viewer|quick ?support|rustdesk|screen[- ]?shar\w*|remote (access|support|desktop))\b/i,
    why: "Screen-sharing and remote-access apps let a stranger watch or control your phone.",
    severity: 3,
  },
  {
    id: "digital-arrest",
    pattern: /\b(digital(ly)? arrest\w*|under arrest|arrest warrant|non[- ]bailable|money laundering|narcotics|drugs (were |was )?(found|seized)|video (call )?(hearing|statement|interrogation))\b/i,
    why: "Police and agencies don’t arrest or question people over video calls or messages.",
    severity: 3,
  },
  {
    id: "secrecy",
    pattern: /\b(do not|don'?t) (tell|inform) (anyone|anybody|your (family|bank))|keep (this|it) (secret|confidential)|stay on (the )?(video )?call\b/i,
    why: "Being told to keep it secret or stay on the line is how scammers stop you from checking.",
    severity: 3,
  },
  {
    id: "card-details",
    pattern: /\b(card number|cvv|expiry date|card details|net ?banking (password|login)|atm pin|account password)\b/i,
    why: "No genuine organisation asks for card details, CVV or passwords in a message.",
    severity: 3,
  },
  {
    id: "guaranteed-returns",
    pattern: /\b(guaranteed|sure[- ]shot|risk[- ]free|double your money|assured returns?)\b|\b\d{2,3}\s?% (returns?|profit|gain)s?\b|\b\d+x (returns?|profit|listing)\b/i,
    why: "Guaranteed or very high returns are the hallmark of investment scams.",
    severity: 3,
  },
  {
    id: "pay-to-receive",
    pattern: /\b(processing|registration|clearance|redelivery|release|unlock\w*|activation|claim) (fee|charge|amount)\b|\bpay\b[^.!?\n]{0,25}\b(to (claim|receive|release|unlock))\b|\bdeposit\b[^.!?\n]{0,30}\b(unlock|tasks?|wallet|earn)\b/i,
    why: "Being asked to pay a fee to receive a prize, parcel, job or refund is a scam pattern.",
    severity: 2,
  },
  {
    id: "card-via-link",
    pattern: /\b(pay|enter|use)\b[^.!?\n]{0,60}\b(debit card|credit card|card)\b[^.!?\n]{0,40}\blink\b/i,
    why: "Paying by card through a link in a message is how card details get stolen.",
    severity: 3,
  },
  {
    id: "call-for-refund",
    pattern: /\b(call|contact)\b[^.!?\n]{0,90}\b(refund|cancel\w*|reverse|dispute)\b/i,
    why: "A surprise charge with a number to call for a refund is bait for a fake helpline.",
    severity: 2,
  },
  {
    id: "kyc-link",
    pattern: /\b(kyc|pan|aadhaar|account)\b[^\n]{0,80}\b(update|verify|link)\b[^\n]{0,60}(https?:\/\/|www\.|\b[a-z0-9-]+\.[a-z]{2,}\/)/i,
    why: "Banks don’t send links to update KYC, PAN or Aadhaar.",
    severity: 3,
  },
  {
    id: "threat",
    pattern: /\b(will be|has been|is) (blocked|suspended|deactivated|disconnected|frozen|closed|cancelled)\b|\b(disconnected|blocked|suspended) (today|tonight)\b|\blegal action\b/i,
    why: "Threats of blocking, disconnection or legal action are used to make you panic.",
    severity: 2,
  },
  {
    id: "urgency",
    pattern: /\b(within \d+ ?(hours?|hrs?|minutes?|mins?)|immediately|urgent(ly)?|right now|act now|last chance|expires? (today|tonight)|only today|valid (only )?today)\b/i,
    why: "Pressure to act fast is the most common scam tactic. Real organisations give you time.",
    severity: 1,
  },
  {
    id: "prize",
    pattern: /\b(you have won|you('| ha)ve been selected|lucky draw|lottery|winner|jackpot|bumper (draw|prize))\b/i,
    why: "You can’t win a draw you never entered.",
    severity: 2,
  },
  {
    id: "easy-money-job",
    pattern: /\b(part[- ]time job|work from home|per (task|like|review)|daily (income|earning)|earn ₹?\s?[\d,]+ (daily|per day)|like (videos|posts)|rate (hotels|products))\b/i,
    why: "Easy money for simple online tasks is how task scams begin.",
    severity: 2,
  },
  {
    id: "personal-number",
    pattern: /\b(call|contact|whatsapp|message|reach)\b[^.!?\n]{0,40}(\+?91[\s-]?)?[6-9][\dX]{4}[\s-]?[\dX]{5}\b/i,
    why: "Being told to call or WhatsApp a personal mobile number instead of an official helpline.",
    severity: 2,
  },
  {
    id: "short-link",
    pattern: /\b(bit\.ly|tinyurl\.com|cutt\.ly|t\.co|rb\.gy|is\.gd|shorturl\.at|tiny\.cc|goo\.gl)\/\S+/i,
    why: "A shortened link hides where it really goes.",
    severity: 2,
  },
  {
    id: "odd-link",
    pattern: /\bhttps?:\/\/\S+|\b[a-z0-9-]+\.(xyz|top|live|online|site|info|click|link|buzz|icu|shop|vip|cc)\b(\/\S*)?/i,
    why: "Links in unexpected messages often lead to fake sites. Type the official address yourself.",
    severity: 1,
  },
];

const SAFE_SIGNS: { pattern: RegExp; why: string }[] = [
  { pattern: /\b(do not|don'?t|never) share\b[^.!?\n]{0,30}\b(otp|code|pin|password)\b/i, why: "Warns you not to share your code." },
  { pattern: /\b(we|bank|will) (will )?never (ask|call)\b/i, why: "Reminds you they never ask for sensitive details." },
  { pattern: /\bignore if (already )?(paid|done)\b/i, why: "Gives you the option to ignore it." },
  { pattern: /\bno action (is )?needed\b/i, why: "Asks nothing of you." },
];

export interface PatternResult {
  verdict: Verdict;
  score: number;
  hits: RuleHit[];
  safeSigns: { quote: string; why: string }[];
}

function negated(text: string, index: number): boolean {
  return NEGATION.test(text.slice(Math.max(0, index - 40), index));
}

export function checkPatterns(message: string, sender = ""): PatternResult {
  const hits: RuleHit[] = [];
  const used: [number, number][] = [];

  for (const rule of RULES) {
    const m = rule.pattern.exec(message);
    if (!m) continue;
    // "Do not share your OTP" is advice, not a request.
    if ((rule.id === "share-code" || rule.id === "card-details") && negated(message, m.index)) continue;
    if (rule.id === "share-code" && /\b(not|never|don'?t)\s+(\w+\s+){0,2}(share|send|tell|forward|give|read)\b/i.test(m[0])) continue;
    // Delivery OTPs are meant to be given to the agent at your door.
    if (rule.id === "share-code" && /only (with|to) the (delivery|agent)|at (your|the) door/i.test(message.slice(m.index, m.index + m[0].length + 60))) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (used.some(([a, b]) => start < b && end > a)) continue; // keep highlights from overlapping
    used.push([start, end]);
    hits.push({ id: rule.id, quote: m[0], why: rule.why, severity: rule.severity, where: "message" });
  }

  // A bank, utility or government claim sent from a personal mobile number.
  const claimsOfficial = /\b(bank|kyc|electricity|power|bill|police|customs|courier|parcel|income tax|refund|customer care)\b/i.test(message);
  const senderMobile = sender.match(/^\s*(\+?91[\s-]?)?[6-9][\dX]{4}[\s-]?[\dX]{5}\s*$/);
  if (claimsOfficial && senderMobile) {
    hits.push({
      id: "official-from-mobile",
      quote: sender.trim(),
      why: "It claims to be from a bank, utility or authority but came from a personal mobile number. Official alerts come from short sender IDs.",
      severity: 2,
      where: "sender",
    });
  }

  const safeSigns: { quote: string; why: string }[] = [];
  for (const s of SAFE_SIGNS) {
    const m = s.pattern.exec(message);
    if (m) safeSigns.push({ quote: m[0], why: s.why });
  }

  const score = hits.reduce((n, h) => n + h.severity, 0) - safeSigns.length;
  const hasSevere = hits.some((h) => h.severity === 3);
  const verdict: Verdict = hasSevere || score >= 4 ? "scam" : score >= 2 ? "suspicious" : "no-flags";

  // Order highlights as they appear in the message.
  hits.sort((a, b) => (a.where === b.where ? message.indexOf(a.quote) - message.indexOf(b.quote) : a.where === "message" ? -1 : 1));
  return { verdict, score, hits, safeSigns };
}
