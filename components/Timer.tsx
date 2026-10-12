"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  seconds: number;
  /** Change this to restart the timer (for example the card id). */
  runKey: string;
  running: boolean;
  onExpire: () => void;
  onTick?: (secondsLeft: number) => void;
}

/** Countdown bar with the number of seconds left shown as text too. */
export function Timer({ seconds, runKey, running, onExpire, onTick }: Props) {
  const [left, setLeft] = useState(seconds * 1000);
  const expire = useRef(onExpire);
  const tick = useRef(onTick);
  useEffect(() => {
    expire.current = onExpire;
    tick.current = onTick;
  });

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let lastWhole = seconds;
    let done = false;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, seconds * 1000 - (performance.now() - start));
      setLeft(remaining);
      const whole = Math.ceil(remaining / 1000);
      if (whole !== lastWhole) {
        lastWhole = whole;
        tick.current?.(whole);
      }
      if (remaining <= 0 && !done) {
        done = true;
        window.clearInterval(id);
        expire.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [running, runKey, seconds]);

  const secs = running ? Math.ceil(left / 1000) : seconds;
  const frac = running ? left / (seconds * 1000) : 1;
  const low = running && secs <= 3;

  return (
    <div className="flex items-center gap-3" role="timer" aria-label={`${secs} seconds left`}>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2">
        <div
          className={`timer-bar h-full rounded-full ${low ? "bg-scam" : "bg-gold"}`}
          style={{ transform: `scaleX(${frac})` }}
        />
      </div>
      <span className={`w-9 text-right font-[family-name:var(--font-display)] text-lg font-bold tabular-nums ${low ? "text-scam" : ""}`}>
        {secs}s
      </span>
    </div>
  );
}
