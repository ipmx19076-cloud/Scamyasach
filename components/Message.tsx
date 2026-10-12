import type { ReactNode } from "react";
import { segment } from "../lib/highlight";
import { CHANNEL_LABEL, formatRupees } from "../lib/labels";
import type { Flag, Scenario } from "../lib/types";

interface TextProps {
  text: string;
  flags: readonly Flag[];
  reveal: boolean;
  isScam: boolean;
}

/** Message text, with numbered highlights once the answer is revealed. */
function Text({ text, flags, reveal, isScam }: TextProps) {
  if (!reveal) return <>{text}</>;
  return (
    <>
      {segment(text, flags).map((seg, i) =>
        seg.flag === undefined ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <mark key={i} className={`hl ${isScam ? "hl-scam" : "hl-sach"} text-inherit`}>
            <span className="hl-num" aria-label={`Point ${seg.flag + 1}:`}>
              {seg.flag + 1}
            </span>
            {seg.text}
          </mark>
        ),
      )}
    </>
  );
}

function Frame({ label, sender, children, tone }: { label: string; sender: string; children: ReactNode; tone?: "wa" }) {
  return (
    <div className="font-[family-name:var(--font-device)] text-[0.98rem] leading-snug">
      <div
        className={
          tone === "wa"
            ? "flex items-center gap-3 bg-[#1f6f62] px-4 py-3 text-white dark:bg-[#1d2f3a]"
            : "flex items-center gap-3 border-b border-line px-4 py-3"
        }
      >
        <span
          aria-hidden
          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${
            tone === "wa" ? "bg-white/20" : "bg-paper-2 text-muted"
          }`}
        >
          {initials(sender)}
        </span>
        <div className="min-w-0">
          <div className="truncate font-semibold">{sender}</div>
          <div className={`text-xs ${tone === "wa" ? "text-white/80" : "text-muted"}`}>{label}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function initials(name: string): string {
  if (/^[+\d]/.test(name)) return "#";
  const clean = name.replace(/[^A-Za-z ]/g, " ").trim();
  if (!clean) return "#";
  const parts = clean.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

const bubbles = (body: string) => body.split(/\n\n+/);

export function Message({ s, reveal }: { s: Scenario; reveal: boolean }) {
  const t = (text: string) => <Text text={text} flags={s.flags} reveal={reveal} isScam={s.isScam} />;

  switch (s.channel) {
    case "sms":
      return (
        <Frame label="Text message" sender={s.sender}>
          <div className="space-y-2 px-4 py-4">
            {bubbles(s.body).map((b, i) => (
              <p key={i} className="max-w-[92%] rounded-2xl rounded-tl-sm bg-paper-2 px-3.5 py-2.5 whitespace-pre-line">
                {t(b)}
              </p>
            ))}
          </div>
        </Frame>
      );

    case "whatsapp":
      return (
        <Frame label="WhatsApp chat" sender={s.sender} tone="wa">
          <div className="space-y-2 bg-[#efe7dc] px-3 py-4 dark:bg-[#0f1a20]">
            {bubbles(s.body).map((b, i) => (
              <p
                key={i}
                className="max-w-[92%] rounded-lg rounded-tl-none bg-white px-3 py-2 whitespace-pre-line text-[#111] shadow-[0_1px_0_rgba(0,0,0,0.08)] dark:bg-[#202c33] dark:text-[#e9edef]"
              >
                {t(b)}
              </p>
            ))}
          </div>
        </Frame>
      );

    case "upi":
      return (
        <div className="font-[family-name:var(--font-device)]">
          <div className="border-b border-line px-4 py-3 text-sm text-muted">Payment request</div>
          <div className="flex flex-col items-center gap-1 px-4 pt-5 pb-4 text-center">
            <span aria-hidden className="grid size-12 place-items-center rounded-full bg-paper-2 font-semibold text-muted">
              {initials(s.sender)}
            </span>
            {(() => {
              const m = s.sender.match(/^(.*) \(([^()]+@[^()]+)\)$/);
              return (
                <>
                  <div className="mt-1 font-semibold">{m ? m[1] : s.sender}</div>
                  {m && <div className="text-sm break-all text-muted">{m[2]}</div>}
                </>
              );
            })()}
            <div className="text-sm text-muted">is requesting</div>
            <div className="text-4xl font-bold tracking-tight">{formatRupees(s.amount ?? 0)}</div>
          </div>
          <p className="mx-4 rounded-xl bg-paper-2 px-3.5 py-3">{t(s.body)}</p>
          <div aria-hidden className="grid grid-cols-2 gap-2 p-4 text-center text-sm font-semibold">
            <span className="rounded-full border border-line py-2 text-muted">Decline</span>
            <span className="rounded-full bg-paper-2 py-2 text-muted">Pay</span>
          </div>
        </div>
      );

    case "email":
      return (
        <div className="font-[family-name:var(--font-device)]">
          <div className="border-b border-line px-4 py-3">
            <div className="text-xs text-muted">Email</div>
            <div className="text-lg leading-tight font-semibold">{s.subject}</div>
            <div className="mt-1 text-sm break-all text-muted">From: {s.sender}</div>
          </div>
          <div className="px-4 py-4 whitespace-pre-line">{t(s.body)}</div>
        </div>
      );

    case "call":
      return (
        <Frame label="Call transcript" sender={s.sender}>
          <dl className="space-y-2.5 px-4 py-4">
            {s.body.split("\n").map((line, i) => {
              const m = line.match(/^(Caller|You):\s*(.*)$/);
              const who = m?.[1] ?? "";
              const said = m?.[2] ?? line;
              return (
                <div key={i} className={`flex gap-3 ${who === "You" ? "text-muted" : ""}`}>
                  <dt className="w-12 shrink-0 pt-0.5 text-xs font-semibold text-muted">{who}</dt>
                  <dd>{t(said)}</dd>
                </div>
              );
            })}
          </dl>
        </Frame>
      );
  }
}

export function channelName(s: Scenario): string {
  return CHANNEL_LABEL[s.channel];
}
