"use client";

interface Props {
  onHome: () => void;
  onDaily: () => void;
}

const RULES: { rule: string; detail: string }[] = [
  { rule: "A UPI PIN only sends money.", detail: "You never enter a PIN or scan a QR code to receive money." },
  { rule: "Never share an OTP.", detail: "Not with the bank, the police, a delivery agent on the phone, or family. Whoever asks is the scammer." },
  { rule: "Don’t install apps a stranger asks for.", detail: "Screen-sharing apps and .apk files let them see your OTPs and control your phone." },
  { rule: "No one can arrest you on a video call.", detail: "“Digital arrest” doesn’t exist. Police don’t ask for money to “verify” it. Hang up and tell someone." },
  { rule: "Find helplines yourself.", detail: "Use the number on your card, passbook or the official app, not one from a message or a web search." },
  { rule: "Don’t tap links in messages.", detail: "Type the address yourself or open the app you already use." },
  { rule: "Guaranteed returns are a lie.", detail: "Stock tips groups, task jobs and pre-IPO “quotas” that promise big money are scams." },
  { rule: "Urgency is the biggest red flag.", detail: "Blocked today, disconnected tonight, expires in 2 hours: slow down and ask someone." },
];

export function Safety({ onHome, onDaily }: Props) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-4 pb-12">
      <button
        type="button"
        onClick={onHome}
        className="inline-flex h-10 items-center rounded-full border border-line px-3 text-sm text-muted hover:text-ink"
      >
        Home
      </button>

      <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl leading-tight font-extrabold">How to stay safe</h1>
      <p className="mt-2 text-lg">Eight rules that beat almost every scam in this game.</p>

      <ol className="mt-6 space-y-4">
        {RULES.map((r, i) => (
          <li key={r.rule} className="flex gap-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gold-wash font-bold text-gold tabular-nums">
              {i + 1}
            </span>
            <div>
              <div className="font-semibold">{r.rule}</div>
              <div className="text-muted">{r.detail}</div>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-10 rounded-[22px] border-[3px] border-scam bg-scam-wash px-5 py-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">Lost money to a scam?</h2>
        <p className="mt-1">Act fast. The sooner you report, the better the chance of stopping the money.</p>
        <ol className="mt-4 space-y-3">
          <li>
            <a
              href="tel:1930"
              className="flex h-14 items-center justify-between rounded-2xl bg-scam px-5 font-[family-name:var(--font-display)] text-xl font-bold text-white dark:text-paper"
            >
              <span>Call 1930</span>
              <span className="font-[family-name:var(--font-body)] text-sm font-normal">Cyber crime helpline</span>
            </a>
          </li>
          <li>
            Report online at{" "}
            <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
              cybercrime.gov.in
            </a>
          </li>
          <li>Call your bank on the number on your card and ask them to block your card or UPI.</li>
        </ol>
      </section>

      <button
        type="button"
        onClick={onDaily}
        className="mt-8 h-14 w-full rounded-2xl bg-ink font-[family-name:var(--font-display)] text-lg font-bold text-paper"
      >
        Test yourself: play today’s challenge
      </button>
    </div>
  );
}
