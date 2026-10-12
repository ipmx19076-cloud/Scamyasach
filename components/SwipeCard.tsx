"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { Scenario } from "../lib/types";
import { Message } from "./Message";

const THRESHOLD = 90;

interface Props {
  s: Scenario;
  reveal: boolean;
  /** Left = Scam (true), right = Sach (false). */
  onSwipe: (choseScam: boolean) => void;
}

export function Stamp({ scam, animate = true, className = "" }: { scam: boolean; animate?: boolean; className?: string }) {
  return (
    <span className={`stamp inline-block ${animate ? "stamp-in" : ""} ${scam ? "text-scam" : "text-sach"} ${className}`}>
      {scam ? "Scam hai!" : "Sach hai!"}
    </span>
  );
}

export function SwipeCard({ s, reveal, onSwipe }: Props) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragging = useRef(false);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (reveal || e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragging.current = false;
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const st = start.current;
    if (!st || st.id !== e.pointerId) return;
    const x = e.clientX - st.x;
    const y = e.clientY - st.y;
    if (!dragging.current) {
      if (Math.abs(x) < 10 || Math.abs(x) < Math.abs(y)) return;
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDx(x);
  };

  const up = () => {
    const x = dx;
    start.current = null;
    dragging.current = false;
    setDx(0);
    if (x <= -THRESHOLD) onSwipe(true);
    else if (x >= THRESHOLD) onSwipe(false);
  };

  const pull = Math.min(1, Math.abs(dx) / THRESHOLD);

  return (
    <div
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{
        transform: dx ? `translateX(${dx}px) rotate(${dx / 30}deg)` : undefined,
        transition: dx ? "none" : "transform 200ms ease-out",
        touchAction: "pan-y",
      }}
      className="relative overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_18px_40px_-24px_rgba(20,24,49,0.55)] select-none"
      aria-roledescription="message card"
    >
      <div className="flex items-center justify-between border-b border-dashed border-line bg-paper-2/60 px-4 py-1.5 text-xs text-muted">
        <span>Training example</span>
        <span className={reveal ? "invisible" : ""}>Not a real message</span>
      </div>

      <Message s={s} reveal={reveal} />

      {/* Drag hint: shows which verdict a release would give */}
      {dx !== 0 && !reveal && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-14 flex justify-center" style={{ opacity: pull }}>
          <Stamp scam={dx < 0} animate={false} className="bg-card/80 text-3xl" />
        </div>
      )}

      {reveal && (
        <div className="pointer-events-none absolute -top-1 right-2">
          <Stamp scam={s.isScam} className="bg-card/90 text-xl" />
        </div>
      )}
    </div>
  );
}
