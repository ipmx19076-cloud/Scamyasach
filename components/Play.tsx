"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scenarios } from "../content/scenarios";
import { istDateKey, pickDaily } from "../lib/daily";
import { useMuted } from "../lib/prefs";
import { PRACTICE_LIVES, SECONDS_PER_CARD, pickPractice, scoreAnswer, totalPoints } from "../lib/scoring";
import { play } from "../lib/sound";
import { loadDaily, loadPracticeBest, saveDaily, savePracticeBest } from "../lib/storage";
import type { Answer, Mode, Scenario } from "../lib/types";
import { Results } from "./Results";
import { SwipeCard } from "./SwipeCard";
import { Timer } from "./Timer";

type Phase = "card" | "reveal" | "results";

interface GameState {
  dateKey: string;
  deck: Scenario[];
  answers: Answer[];
  current: Scenario;
  phase: Phase;
  streak: number;
  lives: number;
  seen: string[];
  /** Daily only: the player had already finished today's set before opening this screen. */
  replay: boolean;
  /** Daily only: note shown on the first card after progress was restored. */
  resumeNote: string | null;
  resumeAt: number;
  best: number;
  newBest: boolean;
}

const MS = SECONDS_PER_CARD * 1000;

function initDaily(): GameState {
  // The date is fixed when the round starts, so a midnight rollover mid-round
  // keeps the original day's set.
  const dateKey = istDateKey();
  const deck = pickDaily(scenarios, dateKey);
  const rec = loadDaily(dateKey);
  const answers = rec?.answers.slice() ?? [];
  let streak = 0;
  for (const a of answers) streak = a.correct ? streak + 1 : 0;

  let resumeNote: string | null = answers.length > 0 ? "Welcome back. Picking up where you left off." : null;
  // Reloaded while a card was on screen: that card counts as timed out, so a
  // reload can't be used to see the card and retry it.
  if (rec && !rec.done && rec.shown > answers.length && answers.length < deck.length) {
    const r = scoreAnswer(deck[answers.length], null, MS, MS, streak);
    answers.push(r.answer);
    streak = r.streak;
    resumeNote = "Welcome back. You left in the middle of a card, so that one counts as missed.";
    saveDaily({ date: dateKey, answers, shown: answers.length, done: answers.length >= deck.length });
  }

  const finished = answers.length >= deck.length;
  return {
    dateKey,
    deck,
    answers,
    current: deck[Math.min(answers.length, deck.length - 1)],
    phase: finished ? "results" : "card",
    streak,
    lives: 0,
    seen: [],
    replay: Boolean(rec?.done),
    resumeNote: finished ? null : resumeNote,
    resumeAt: answers.length,
    best: 0,
    newBest: false,
  };
}

function initPractice(rng: () => number): GameState {
  const first = pickPractice(scenarios, new Set(), 0, rng);
  return {
    dateKey: istDateKey(),
    deck: [],
    answers: [],
    current: first,
    phase: "card",
    streak: 0,
    lives: PRACTICE_LIVES,
    seen: [first.id],
    replay: false,
    resumeNote: null,
    resumeAt: 0,
    best: loadPracticeBest(),
    newBest: false,
  };
}

interface Props {
  mode: Mode;
  onHome: () => void;
  onPractice: () => void;
  onSafety: () => void;
  shareUrl: () => string;
}

export function Play({ mode, onHome, onPractice, onSafety, shareUrl }: Props) {
  const [g, setG] = useState<GameState>(() => (mode === "daily" ? initDaily() : initPractice(Math.random)));
  const [muted] = useMuted();
  const shownAt = useRef(0);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const cardTop = useRef<HTMLDivElement>(null);

  // Record when each card appears; for the daily, remember it was shown.
  useEffect(() => {
    if (g.phase !== "card") return;
    shownAt.current = performance.now();
    if (mode === "daily") {
      saveDaily({ date: g.dateKey, answers: g.answers, shown: g.answers.length + 1, done: false });
    }
    cardTop.current?.scrollIntoView({ block: "nearest" });
  }, [g.phase, g.current.id, g.answers, g.dateKey, mode]);

  useEffect(() => {
    if (g.phase === "reveal") nextBtn.current?.focus({ preventScroll: true });
  }, [g.phase]);

  const answer = useCallback(
    (choseScam: boolean | null) => {
      setG((prev) => {
        if (prev.phase !== "card") return prev;
        const ms = choseScam === null ? MS : performance.now() - shownAt.current;
        const { answer: a, streak } = scoreAnswer(prev.current, choseScam, ms, MS, prev.streak);
        const answers = [...prev.answers, a];
        const lives = mode === "practice" && !a.correct ? prev.lives - 1 : prev.lives;
        if (mode === "daily") {
          saveDaily({ date: prev.dateKey, answers, shown: answers.length, done: answers.length >= prev.deck.length });
        }
        return { ...prev, answers, streak, lives, phase: "reveal" };
      });
      play(choseScam === null ? "timeout" : "stamp", muted);
    },
    [mode, muted],
  );

  // Play the right/wrong sound just after the stamp lands.
  const last = g.answers[g.answers.length - 1];
  useEffect(() => {
    if (g.phase !== "reveal" || !last || last.choseScam === null) return;
    const id = window.setTimeout(() => play(last.correct ? "correct" : "wrong", muted), 140);
    return () => window.clearTimeout(id);
  }, [g.phase, last, muted]);

  const next = useCallback(() => {
    setG((prev) => {
      if (prev.phase !== "reveal") return prev;
      if (mode === "daily") {
        if (prev.answers.length >= prev.deck.length) return { ...prev, phase: "results" };
        return { ...prev, current: prev.deck[prev.answers.length], phase: "card" };
      }
      if (prev.lives <= 0) {
        const pts = totalPoints(prev.answers);
        const newBest = pts > prev.best;
        if (newBest) savePracticeBest(pts);
        return { ...prev, phase: "results", newBest, best: Math.max(pts, prev.best) };
      }
      const correct = prev.answers.filter((a) => a.correct).length;
      const n = pickPractice(scenarios, new Set(prev.seen), correct, Math.random);
      return { ...prev, current: n, seen: [...prev.seen, n.id], phase: "card" };
    });
  }, [mode]);

  // Keyboard: ← Scam, → Sach. Enter on the focused Next button moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (g.phase !== "card" || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        answer(true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        answer(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [g.phase, answer]);

  if (g.phase === "results") {
    return (
      <Results
        answers={g.answers}
        mode={mode}
        dateKey={g.dateKey}
        replay={g.replay}
        best={g.best}
        newBest={g.newBest}
        shareUrl={shareUrl}
        onHome={onHome}
        onPractice={mode === "practice" ? () => setG(initPractice(Math.random)) : onPractice}
        onSafety={onSafety}
      />
    );
  }

  const s = g.current;
  const a = g.phase === "reveal" ? last : undefined;
  const points = totalPoints(g.answers);
  const cardNo = mode === "daily" ? Math.min(g.answers.length + (g.phase === "card" ? 1 : 0), g.deck.length) : g.answers.length + (g.phase === "card" ? 1 : 0);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 bg-paper/95 px-4 pt-3 pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onHome}
            className="inline-flex h-10 items-center rounded-full border border-line px-3 text-sm text-muted hover:text-ink"
          >
            Quit
          </button>
          <div className="text-center text-sm leading-tight">
            <div className="font-semibold">{mode === "daily" ? `Card ${cardNo} of ${g.deck.length}` : `Practice, card ${cardNo}`}</div>
            {mode === "practice" ? (
              <div className="text-muted" aria-label={`${g.lives} lives left`}>
                <span aria-hidden className="text-scam">
                  {"♥".repeat(Math.max(0, g.lives))}
                </span>
                <span aria-hidden className="opacity-30">
                  {"♥".repeat(PRACTICE_LIVES - Math.max(0, g.lives))}
                </span>{" "}
                {g.lives} {g.lives === 1 ? "life" : "lives"}
              </div>
            ) : (
              g.streak > 1 && <div className="text-gold">Streak {g.streak}</div>
            )}
          </div>
          <div className="min-w-16 rounded-full bg-gold-wash px-3 py-1.5 text-right font-[family-name:var(--font-display)] font-bold text-gold tabular-nums">
            {points}
            <span className="sr-only"> points</span>
          </div>
        </div>
        <div className="mt-3">
          <Timer
            seconds={SECONDS_PER_CARD}
            runKey={`${s.id}-${g.answers.length}`}
            running={g.phase === "card"}
            onExpire={() => answer(null)}
            onTick={(left) => left <= 3 && left > 0 && play("tick", muted)}
          />
        </div>
      </header>

      {g.resumeNote && g.answers.length === g.resumeAt && (
        <p className="mb-3 rounded-xl bg-gold-wash px-3 py-2 text-sm">{g.resumeNote}</p>
      )}

      <div ref={cardTop} className="scroll-mt-28">
        <SwipeCard key={`${s.id}-${g.answers.length}`} s={s} reveal={g.phase === "reveal"} onSwipe={answer} />
      </div>

      {g.phase === "card" ? (
        <div className="sticky bottom-0 -mx-4 mt-auto bg-gradient-to-t from-paper via-paper to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="mb-2 text-center text-sm text-muted">Swipe left for scam, right for genuine</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => answer(true)}
              className="h-16 rounded-2xl border-[3px] border-scam bg-scam-wash font-[family-name:var(--font-display)] text-xl font-bold text-scam active:translate-y-px"
            >
              <span aria-hidden>← </span>Scam hai!
            </button>
            <button
              type="button"
              onClick={() => answer(false)}
              className="h-16 rounded-2xl border-[3px] border-sach bg-sach-wash font-[family-name:var(--font-display)] text-xl font-bold text-sach active:translate-y-px"
            >
              Sach hai!<span aria-hidden> →</span>
            </button>
          </div>
        </div>
      ) : (
        a && <Reveal s={s} a={a} next={next} nextRef={nextBtn} lastCard={mode === "daily" ? g.answers.length >= g.deck.length : g.lives <= 0} />
      )}
    </div>
  );
}

function Reveal({
  s,
  a,
  next,
  nextRef,
  lastCard,
}: {
  s: Scenario;
  a: Answer;
  next: () => void;
  nextRef: React.RefObject<HTMLButtonElement | null>;
  lastCard: boolean;
}) {
  const verdict = a.choseScam === null ? "Time’s up." : a.correct ? "Sahi pakda!" : "Galat!";
  const icon = a.choseScam === null ? "⏱" : a.correct ? "✓" : "✗";
  return (
    <section aria-live="polite" className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mt-5 flex items-baseline gap-2">
        <span
          aria-hidden
          className={`grid size-8 shrink-0 place-items-center rounded-full text-lg font-bold text-white dark:text-paper ${
            a.correct ? "bg-sach" : "bg-scam"
          }`}
        >
          {icon}
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight font-bold">
          {verdict}{" "}
          <span className="font-normal text-muted">{s.isScam ? "This was a scam." : "This was genuine."}</span>
        </h2>
      </div>
      {a.correct && a.points > 0 && <p className="mt-1 ml-10 text-sm text-gold">+{a.points} points</p>}

      <h3 className="mt-4 text-sm font-semibold text-muted">{s.isScam ? "Red flags" : "Why it’s safe"}</h3>
      <ol className="mt-2 space-y-2">
        {s.flags.map((f, i) => (
          <li key={i} className="flex gap-2.5">
            <span className={`hl ${s.isScam ? "hl-scam" : "hl-sach"} h-fit !p-0 !no-underline`}>
              <span className="hl-num !m-0">{i + 1}</span>
            </span>
            <span>{f.why}</span>
          </li>
        ))}
        {s.senderNote && (
          <li className="flex gap-2.5">
            <span aria-hidden className="w-[1.15rem] text-center text-muted">
              ↳
            </span>
            <span>
              <span className="font-semibold">Sender: </span>
              {s.senderNote}
            </span>
          </li>
        )}
      </ol>

      <p className="mt-4 border-l-4 border-gold pl-3 font-medium">{s.takeaway}</p>

      <button
        ref={nextRef}
        type="button"
        onClick={next}
        className="mt-5 h-14 w-full rounded-2xl bg-ink font-[family-name:var(--font-display)] text-lg font-bold text-paper"
      >
        {lastCard ? "See my result" : "Next message"}
      </button>
    </section>
  );
}
