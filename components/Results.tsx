"use client";

import { useState } from "react";
import { SCAM_TYPE_LABEL } from "../lib/labels";
import { accuracyByType, mostMissed, rate, totalPoints } from "../lib/scoring";
import { emojiGrid, shareText } from "../lib/share";
import type { Answer, Mode } from "../lib/types";

interface Props {
  answers: Answer[];
  mode: Mode;
  dateKey: string;
  replay: boolean;
  best: number;
  newBest: boolean;
  shareUrl: () => string;
  onHome: () => void;
  onPractice: () => void;
  onSafety: () => void;
}

const RATING_NOTE = {
  "Fraud-proof": "Scammers will have a hard time with you.",
  Alert: "Good instincts. A few tricks still got through.",
  "Easy target": "Scammers count on this. Practice a few rounds and check the safety tips.",
} as const;

export function Results({ answers, mode, dateKey, replay, best, newBest, shareUrl, onHome, onPractice, onSafety }: Props) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "manual">("idle");
  const right = answers.filter((a) => a.correct).length;
  const rating = rate(answers);
  const pts = totalPoints(answers);
  const missed = mostMissed(answers);
  const byType = accuracyByType(answers).sort((a, b) => a.correct / a.total - b.correct / b.total);
  const text = shareText(answers, mode, dateKey, shareUrl());
  const good = rating !== "Easy target";

  const share = async () => {
    const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    if (coarse && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareState("copied");
    } catch {
      setShareState("manual");
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-10">
      <p className="text-sm text-muted">{mode === "daily" ? `Daily Challenge, ${prettyDate(dateKey)}` : "Practice round"}</p>

      <div className="mt-4 rounded-[22px] border border-line bg-card px-5 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-[family-name:var(--font-display)] text-6xl leading-none font-extrabold tabular-nums">
              {right}
              <span className="text-3xl text-muted">/{answers.length}</span>
            </div>
            <div className="mt-1 text-muted">spotted correctly, {pts} points</div>
          </div>
          <span className={`stamp stamp-in shrink-0 text-2xl ${good ? "text-sach" : "text-scam"}`}>{rating}</span>
        </div>
        <p className="mt-4">{RATING_NOTE[rating]}</p>
        <p className="mt-3 text-xl leading-none whitespace-nowrap" aria-label={`${right} right, ${answers.length - right} wrong or missed`}>
          {emojiGrid(answers)}
        </p>
        {mode === "practice" && (
          <p className="mt-2 text-sm text-muted">{newBest ? "New personal best!" : `Your best: ${best} points`}</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={share}
          className="h-14 rounded-2xl bg-ink font-[family-name:var(--font-display)] text-lg font-bold text-paper"
        >
          Share result
        </button>
        <button
          type="button"
          onClick={onPractice}
          className="h-14 rounded-2xl border-2 border-ink font-[family-name:var(--font-display)] text-lg font-bold"
        >
          {mode === "practice" ? "Play again" : "Practice"}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-6 text-center text-sm text-muted">
        {shareState === "copied" && "Copied. Paste it in your class group."}
      </p>
      {shareState === "manual" && (
        <textarea
          readOnly
          value={text}
          rows={5}
          className="mt-1 w-full rounded-xl border border-line bg-card p-3 text-sm"
          aria-label="Your result, select and copy"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}

      {missed.length > 0 && (
        <section className="mt-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Watch out for</h2>
          <p className="mt-1">
            {missed.map((t, i) => (
              <span key={t}>
                {i > 0 && " and "}
                <strong>{t === "genuine" ? "genuine messages you called scams" : SCAM_TYPE_LABEL[t]}</strong>
              </span>
            ))}
            .{missed.includes("genuine") && " Not every message is a scam. Look at what it asks you to do: no request, no risk."}
          </p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">By type</h2>
        <ul className="mt-2 divide-y divide-line">
          {byType.map((r) => (
            <li key={r.scamType} className="flex items-center gap-3 py-2">
              <span className="flex-1">{SCAM_TYPE_LABEL[r.scamType]}</span>
              <span className="h-2 w-20 overflow-hidden rounded-full bg-paper-2" aria-hidden>
                <span
                  className={`block h-full ${r.correct === r.total ? "bg-sach" : "bg-scam"}`}
                  style={{ width: `${(r.correct / r.total) * 100}%` }}
                />
              </span>
              <span className="w-10 text-right tabular-nums">
                {r.correct}/{r.total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {mode === "daily" && (
        <p className="mt-6 rounded-xl bg-paper-2 px-4 py-3 text-sm">
          {replay ? "You’ve already played today’s challenge. " : ""}A new set of 10 arrives at midnight, India time.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
        <button type="button" onClick={onSafety} className="underline underline-offset-4">
          How to stay safe
        </button>
        <button type="button" onClick={onHome} className="underline underline-offset-4">
          Home
        </button>
      </div>
    </div>
  );
}

function prettyDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "UTC" });
}
