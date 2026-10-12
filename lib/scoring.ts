import type { Answer, Difficulty, Scenario, ScamType } from "./types";

export const SECONDS_PER_CARD = 12;
export const PRACTICE_LIVES = 3;

const BASE_POINTS = 100;
const MAX_SPEED_BONUS = 100;
const STREAK_STEP = 20;
const MAX_STREAK_BONUS = 100;

/**
 * Points for one answer. Correct answers earn 100, plus up to 100 for speed
 * (linear in time left), plus 20 per answer in the current streak beyond the
 * first, capped at 100. Wrong or timed-out answers earn nothing.
 *
 * @param streak the streak length including this answer
 */
export function pointsFor(correct: boolean, msTaken: number, msAllowed: number, streak: number): number {
  if (!correct) return 0;
  const left = Math.max(0, Math.min(1, 1 - msTaken / msAllowed));
  const speed = Math.round(MAX_SPEED_BONUS * left);
  const streakBonus = Math.min(MAX_STREAK_BONUS, STREAK_STEP * Math.max(0, streak - 1));
  return BASE_POINTS + speed + streakBonus;
}

/** Builds the answer record for a scenario. `choseScam` is null on timeout. */
export function scoreAnswer(
  scenario: Scenario,
  choseScam: boolean | null,
  msTaken: number,
  msAllowed: number,
  previousStreak: number,
): { answer: Answer; streak: number } {
  const correct = choseScam !== null && choseScam === scenario.isScam;
  const streak = correct ? previousStreak + 1 : 0;
  return {
    streak,
    answer: {
      id: scenario.id,
      scamType: scenario.scamType,
      isScam: scenario.isScam,
      choseScam,
      correct,
      ms: Math.min(msTaken, msAllowed),
      points: pointsFor(correct, msTaken, msAllowed, streak),
    },
  };
}

export type Rating = "Easy target" | "Alert" | "Fraud-proof";

export function rate(answers: readonly Answer[]): Rating {
  if (answers.length === 0) return "Easy target";
  const acc = answers.filter((a) => a.correct).length / answers.length;
  if (acc >= 0.8) return "Fraud-proof";
  if (acc >= 0.5) return "Alert";
  return "Easy target";
}

export function totalPoints(answers: readonly Answer[]): number {
  return answers.reduce((sum, a) => sum + a.points, 0);
}

export interface TypeAccuracy {
  scamType: ScamType;
  correct: number;
  total: number;
}

/** Accuracy grouped by scam type ("genuine" included), in first-seen order. */
export function accuracyByType(answers: readonly Answer[]): TypeAccuracy[] {
  const map = new Map<ScamType, TypeAccuracy>();
  for (const a of answers) {
    const row = map.get(a.scamType) ?? { scamType: a.scamType, correct: 0, total: 0 };
    row.total += 1;
    if (a.correct) row.correct += 1;
    map.set(a.scamType, row);
  }
  return [...map.values()];
}

/** Up to `n` types with the most misses (ties broken by worst accuracy). */
export function mostMissed(answers: readonly Answer[], n = 2): ScamType[] {
  return accuracyByType(answers)
    .filter((r) => r.correct < r.total)
    .sort((a, b) => b.total - b.correct - (a.total - a.correct) || a.correct / a.total - b.correct / b.total)
    .slice(0, n)
    .map((r) => r.scamType);
}

/** Practice difficulty ceiling: rises with the number of correct answers. */
export function practiceLevel(correctSoFar: number): Difficulty {
  if (correctSoFar >= 8) return 3;
  if (correctSoFar >= 3) return 2;
  return 1;
}

/**
 * Picks the next Practice card. Prefers cards at the current level that
 * haven't been seen; widens to easier, then any unseen, then starts over.
 */
export function pickPractice(
  scenarios: readonly Scenario[],
  seenIds: ReadonlySet<string>,
  correctSoFar: number,
  rng: () => number,
): Scenario {
  const level = practiceLevel(correctSoFar);
  const unseen = scenarios.filter((s) => !seenIds.has(s.id));
  const pools = [
    unseen.filter((s) => s.difficulty === level),
    unseen.filter((s) => s.difficulty <= level),
    unseen,
    scenarios.slice(),
  ];
  const pool = pools.find((p) => p.length > 0)!;
  return pool[Math.floor(rng() * pool.length)];
}
