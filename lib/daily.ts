import { hashString, mulberry32, shuffle } from "./random";
import type { Scenario } from "./types";

export const DAILY_COUNT = 10;
export const DAILY_SCAMS = 6;

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** The calendar date in India (UTC+05:30, no daylight saving) as YYYY-MM-DD. */
export function istDateKey(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Picks the Daily Challenge for a date. Pure and deterministic: the same
 * scenario list and date always give the same cards in the same order, so
 * every phone in the room plays the identical set.
 *
 * Mix: 6 scams (distinct scam types where possible) and 4 genuine messages,
 * ordered from easy to hard so the round ramps up.
 */
export function pickDaily(
  scenarios: readonly Scenario[],
  dateKey: string,
  count = DAILY_COUNT,
  scamCount = DAILY_SCAMS,
): Scenario[] {
  // Sort by id first so the result never depends on file order.
  const sorted = scenarios.slice().sort((a, b) => a.id.localeCompare(b.id));
  const rng = mulberry32(hashString(`scam-ya-sach:${dateKey}`));

  const scams = shuffle(sorted.filter((s) => s.isScam), rng);
  const genuine = shuffle(sorted.filter((s) => !s.isScam), rng);

  // Prefer one scam per type, then fill with whatever is left.
  const picked: Scenario[] = [];
  const seenTypes = new Set<string>();
  for (const s of scams) {
    if (picked.length >= scamCount) break;
    if (!seenTypes.has(s.scamType)) {
      picked.push(s);
      seenTypes.add(s.scamType);
    }
  }
  for (const s of scams) {
    if (picked.length >= scamCount) break;
    if (!picked.includes(s)) picked.push(s);
  }

  const genuineCount = Math.min(count - picked.length, genuine.length);
  picked.push(...genuine.slice(0, genuineCount));

  // Shuffle, then a stable sort by difficulty keeps randomness within each level.
  return shuffle(picked, rng)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.difficulty - b.s.difficulty || a.i - b.i)
    .map(({ s }) => s);
}
