"use client";

import { istDateKey } from "../lib/daily";
import { useStored } from "../lib/prefs";
import { loadDaily } from "../lib/storage";
import { Toggles } from "./Toggles";

interface Props {
  onDaily: () => void;
  onPractice: () => void;
  onSafety: () => void;
  onCheck: () => void;
}

export function GameHome({ onDaily, onPractice, onSafety, onCheck }: Props) {
  const dailyState = useStored(() => {
    const rec = loadDaily(istDateKey());
    return rec ? (rec.done ? "done" : "started") : "new";
  }, "new");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onCheck} className="h-10 rounded-full border border-line px-3 text-sm text-muted hover:text-ink">
          Check a real message
        </button>
        <Toggles />
      </div>

      <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(3.2rem,16vw,4.6rem)] leading-[0.9] font-extrabold tracking-tight">
        Scam
        <br />
        ya Sach?
      </h1>
      <p className="mt-4 max-w-[30ch] text-lg">
        Real-looking UPI requests, SMS, WhatsApp chats and calls. Ten messages, twelve seconds each. Can you tell which are
        scams?
      </p>

      {/* A sample card with the verdict stamped on it: the whole game at a glance. */}
      <figure aria-hidden className="relative mt-8 mb-4 select-none">
        <div className="rotate-[1.5deg] rounded-[20px] border border-line bg-card px-4 py-4 font-[family-name:var(--font-device)] shadow-[0_18px_40px_-24px_rgba(20,24,49,0.55)]">
          <div className="text-xs text-muted">Payment request from Prize Dept</div>
          <div className="mt-1 text-3xl font-bold">₹4,999</div>
          <p className="mt-2 rounded-xl bg-paper-2 px-3 py-2 text-[0.95rem] leading-snug">
            Cashback approved. Enter UPI PIN to receive ₹4,999 in your account.
          </p>
        </div>
        <span className="stamp stamp-in absolute -right-1 -bottom-4 bg-card/90 text-3xl text-scam">Scam hai!</span>
      </figure>

      <div className="mt-auto space-y-3 pt-8">
        <button
          type="button"
          onClick={onDaily}
          className="flex h-16 w-full items-center justify-between rounded-2xl bg-ink px-5 font-[family-name:var(--font-display)] text-xl font-bold text-paper"
        >
          <span>{dailyState === "done" ? "See today’s result" : dailyState === "started" ? "Continue today’s challenge" : "Play today’s challenge"}</span>
          <span className="font-[family-name:var(--font-body)] text-sm font-normal opacity-75">{dailyState === "done" ? "Done" : "10 cards"}</span>
        </button>
        <button
          type="button"
          onClick={onPractice}
          className="flex h-14 w-full items-center justify-between rounded-2xl border-2 border-ink px-5 font-[family-name:var(--font-display)] text-lg font-bold"
        >
          <span>Practice</span>
          <span className="font-[family-name:var(--font-body)] text-sm font-normal text-muted">Endless, 3 lives</span>
        </button>
        <button
          type="button"
          onClick={onSafety}
          className="h-12 w-full rounded-2xl text-lg font-semibold underline decoration-2 underline-offset-4"
        >
          How to stay safe
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        All game messages are invented training examples. Your game progress stays on this device.
      </p>
    </div>
  );
}
