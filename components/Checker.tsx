"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CHANNELS, MAX_MESSAGE_CHARS, patternResult, type CheckChannel, type CheckResult, type FinalVerdict } from "../lib/check";
import { redact } from "../lib/redact";
import { ReportBox } from "./ReportBox";
import { Toggles } from "./Toggles";

interface Props {
  /** API endpoint for the AI check, or null to use the pattern check only (offline copy). */
  checkUrl: string | null;
  onGame: () => void;
  onSafety: () => void;
}

const CHANNEL_LABEL: Record<CheckChannel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
  call: "Phone call",
  upi: "UPI request",
  other: "Other",
};

/** Invented examples so the checker can be demonstrated without a real message. */
const EXAMPLES: { label: string; channel: CheckChannel; sender: string; text: string }[] = [
  {
    label: "KYC link",
    channel: "sms",
    sender: "+91 7XXXX X8812",
    text: "Dear Customer, your Bharat Pragati Bank account will be BLOCKED today. Update your PAN and KYC now: http://bpb-kyc-update.example/verify",
  },
  {
    label: "Bank OTP",
    channel: "sms",
    sender: "VM-BPBANK",
    text: "123456 is your OTP for a transaction of ₹1,250 at ExampleMart. Do NOT share this OTP with anyone. - Bharat Pragati Bank",
  },
  {
    label: "“Sent by mistake”",
    channel: "whatsapp",
    sender: "Unknown number",
    text: "Hi I sent ₹1,500 to your UPI by mistake 🙏 I have sent you a request, please approve it to send it back. Urgent, it was my hospital money.",
  },
];

const VERDICT: Record<FinalVerdict, { stamp: string; line: string; tone: string }> = {
  scam: { stamp: "Scam hai!", line: "This looks like a scam.", tone: "text-scam" },
  suspicious: { stamp: "Savdhaan!", line: "Be careful. This could be a scam.", tone: "text-gold" },
  "likely-genuine": { stamp: "Sach lagta hai", line: "This looks genuine.", tone: "text-sach" },
  "no-flags": { stamp: "No red flags", line: "No common scam signs found.", tone: "text-sach" },
};

export function Checker({ checkUrl, onGame, onSafety }: Props) {
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [channel, setChannel] = useState<CheckChannel>("other");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [hidden, setHidden] = useState(0);
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultRef.current?.focus({ preventScroll: true });
    }
  }, [result]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (text.trim().length < 5) {
      setError("Paste the message you received into the box first.");
      return;
    }
    const r = redact(text);
    const s = redact(sender);
    setHidden(r.codes + r.numbers);
    setLoading(true);
    setResult(null);
    try {
      if (!checkUrl) {
        setResult(patternResult(r.text, s.text, "This offline copy uses the built-in pattern check only, not the AI."));
        return;
      }
      const res = await fetch(checkUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: r.text, sender: s.text, channel }),
      });
      if (res.ok) {
        setResult((await res.json()) as CheckResult);
      } else if (res.status === 400 || res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "That message couldn’t be checked. Try again.");
      } else {
        setResult(patternResult(r.text, s.text, "The AI check is unavailable right now, so this result is from the pattern check only."));
      }
    } catch {
      setResult(patternResult(r.text, s.text, "You seem to be offline, so this result is from the pattern check on your phone only."));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setText("");
    setSender("");
    setChannel("other");
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onGame} className="h-10 rounded-full border border-line px-3 text-sm text-muted hover:text-ink">
          Test yourself: play the game
        </button>
        <Toggles sound={false} />
      </div>

      <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.8rem,13vw,4rem)] leading-[0.92] font-extrabold tracking-tight">
        Scam ya Sach?
      </h1>
      <p className="mt-3 max-w-[34ch] text-lg">Got a message that feels off? Paste it here and find out if it’s a scam before you reply.</p>

      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <fieldset>
          <legend className="text-sm font-semibold">Where did it come from?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input
                  type="radio"
                  name="channel"
                  id={`channel-${c}`}
                  value={c}
                  checked={channel === c}
                  onChange={() => setChannel(c)}
                  className="peer sr-only"
                />
                <span className="inline-flex h-10 items-center rounded-full border border-line bg-card px-4 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]">
                  {CHANNEL_LABEL[c]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="sender" className="text-sm font-semibold">
            Who sent it? <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="sender"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            maxLength={120}
            placeholder="A number, a sender ID like VM-BANKIN, or a name"
            className="mt-1.5 h-12 w-full rounded-xl border border-line bg-card px-3.5 placeholder:text-muted/70"
            autoComplete="off"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="message" className="text-sm font-semibold">
              The message
            </label>
            <span className="text-xs text-muted tabular-nums">
              {text.length}/{MAX_MESSAGE_CHARS}
            </span>
          </div>
          <textarea
            id="message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_MESSAGE_CHARS}
            rows={7}
            placeholder="Paste the full message here. For a phone call, write down what the caller said."
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-3 leading-relaxed placeholder:text-muted/70"
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted">Try an example:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                className="underline decoration-line underline-offset-4 hover:decoration-ink"
                onClick={() => {
                  setText(ex.text);
                  setSender(ex.sender);
                  setChannel(ex.channel);
                  setResult(null);
                  setError(null);
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-scam-wash px-3.5 py-2.5 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-16 w-full rounded-2xl bg-ink font-[family-name:var(--font-display)] text-xl font-bold text-paper disabled:opacity-70"
        >
          {loading ? "Checking the message…" : "Check message"}
        </button>
        <p className="text-xs text-muted">
          Before checking, we hide OTPs and account or card numbers. {checkUrl ? "The message is then checked by an AI model and isn’t stored." : "This copy checks on your device only."}
        </p>
      </form>

      {loading && (
        <div aria-live="polite" className="mt-8 animate-pulse rounded-[22px] border border-line bg-card p-5 text-muted">
          Reading the message and looking for warning signs…
        </div>
      )}

      {result && <Result r={result} hidden={hidden} headingRef={resultRef} onReset={reset} onSafety={onSafety} />}
    </div>
  );
}

function Result({
  r,
  hidden,
  headingRef,
  onReset,
  onSafety,
}: {
  r: CheckResult;
  hidden: number;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onReset: () => void;
  onSafety: () => void;
}) {
  const v = VERDICT[r.verdict];
  const red = r.flags.filter((f) => f.where === "message");
  const senderFlags = r.flags.filter((f) => f.where === "sender");
  const danger = r.verdict === "scam" || r.verdict === "suspicious";

  return (
    <section aria-labelledby="verdict" className="mt-10 scroll-mt-4">
      <div className="relative overflow-hidden rounded-[22px] border border-line bg-card px-5 pt-6 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <h2 id="verdict" ref={headingRef} tabIndex={-1} className="max-w-[18ch] font-[family-name:var(--font-display)] text-3xl leading-tight font-bold">
            {v.line}
          </h2>
          <span className={`stamp stamp-in shrink-0 bg-card text-2xl ${v.tone}`}>{v.stamp}</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          {r.source === "ai" ? `Checked by AI${r.confidence ? `, ${r.confidence} confidence` : ""}, plus our pattern check` : "Pattern check only"}
          {r.scamType && danger ? `. Type: ${r.scamType}` : ""}
          {hidden > 0 ? `. We hid ${hidden} private ${hidden === 1 ? "number" : "numbers"} before checking.` : "."}
        </p>
        {r.note && <p className="mt-3 rounded-xl bg-gold-wash px-3.5 py-2.5 text-sm">{r.note}</p>}
        <p className="mt-4 text-lg">{r.summary}</p>

        <div className="mt-5 rounded-xl bg-paper-2 px-4 py-3.5 whitespace-pre-line">
          <Highlighted text={r.checkedText} red={red.map((f) => f.quote)} safe={r.safeSigns.map((s) => s.quote)} />
        </div>
      </div>

      {(red.length > 0 || senderFlags.length > 0) && (
        <div className="mt-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">Red flags</h3>
          <ol className="mt-2 space-y-2.5">
            {red.map((f, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="hl hl-scam h-fit !p-0 !no-underline">
                  <span className="hl-num !m-0">{i + 1}</span>
                </span>
                <span>{f.why}</span>
              </li>
            ))}
            {senderFlags.map((f, i) => (
              <li key={`s${i}`} className="flex gap-2.5">
                <span aria-hidden className="w-[1.15rem] text-center text-muted">
                  ↳
                </span>
                <span>
                  <span className="font-semibold">Sender ({f.quote}): </span>
                  {f.why}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {r.safeSigns.length > 0 && (
        <div className="mt-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">Signs it’s genuine</h3>
          <ul className="mt-2 space-y-2.5">
            {r.safeSigns.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="hl hl-sach h-fit !p-0 !no-underline">
                  <span className="hl-num !m-0">✓</span>
                </span>
                <span>{s.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">What to do now</h3>
        <ul className="mt-2 space-y-2 border-l-4 border-gold pl-4">
          {r.whatToDo.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>

      {danger && (
        <div className="mt-8">
          <ReportBox title="Already paid or shared details?" />
        </div>
      )}

      <p className="mt-6 text-sm text-muted">
        This is a second opinion, not a guarantee. When in doubt, contact the organisation on a number or app you already trust.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={onReset} className="h-14 rounded-2xl bg-ink font-[family-name:var(--font-display)] text-lg font-bold text-paper">
          Check another
        </button>
        <button type="button" onClick={onSafety} className="h-14 rounded-2xl border-2 border-ink font-[family-name:var(--font-display)] text-lg font-bold">
          Safety tips
        </button>
      </div>
    </section>
  );
}

/** The checked message with red flags numbered and safe signs ticked. */
function Highlighted({ text, red, safe }: { text: string; red: string[]; safe: string[] }) {
  type Mark = { start: number; end: number; kind: "red" | "safe"; n: number };
  const marks: Mark[] = [];
  const add = (q: string, kind: Mark["kind"], n: number) => {
    const start = text.indexOf(q);
    if (start < 0) return;
    const end = start + q.length;
    if (marks.some((m) => start < m.end && end > m.start)) return;
    marks.push({ start, end, kind, n });
  };
  red.forEach((q, i) => add(q, "red", i + 1));
  safe.forEach((q) => add(q, "safe", 0));
  marks.sort((a, b) => a.start - b.start);

  const out: React.ReactNode[] = [];
  let pos = 0;
  marks.forEach((m, i) => {
    if (m.start > pos) out.push(<span key={`t${i}`}>{text.slice(pos, m.start)}</span>);
    out.push(
      <mark key={`m${i}`} className={`hl ${m.kind === "red" ? "hl-scam" : "hl-sach"} text-inherit`}>
        <span className="hl-num" aria-label={m.kind === "red" ? `Red flag ${m.n}:` : "Genuine sign:"}>
          {m.kind === "red" ? m.n : "✓"}
        </span>
        {text.slice(m.start, m.end)}
      </mark>,
    );
    pos = m.end;
  });
  if (pos < text.length) out.push(<span key="end">{text.slice(pos)}</span>);
  return <>{out}</>;
}
