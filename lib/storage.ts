import type { Answer } from "./types";

/**
 * localStorage wrappers that never throw. In private mode or when storage is
 * blocked, reads return null and writes are ignored, so the game still works;
 * only the one-attempt-per-day limit stops being enforced.
 */
function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: ignore */
  }
}

const DAILY_KEY = "sys:daily";
const MUTE_KEY = "sys:muted";
const THEME_KEY = "sys:theme";
const BEST_KEY = "sys:practiceBest";

export interface DailyRecord {
  date: string;
  answers: Answer[];
  /** Index of the card that was on screen; if ahead of answers, a reload happened mid-card. */
  shown: number;
  done: boolean;
}

export function loadDaily(date: string): DailyRecord | null {
  const rec = read<DailyRecord>(DAILY_KEY);
  return rec && rec.date === date ? rec : null;
}

export function saveDaily(rec: DailyRecord): void {
  write(DAILY_KEY, rec);
}

export function loadMuted(): boolean {
  return read<boolean>(MUTE_KEY) ?? false;
}

export function saveMuted(muted: boolean): void {
  write(MUTE_KEY, muted);
}

export type Theme = "light" | "dark";

export function loadTheme(): Theme | null {
  return read<Theme>(THEME_KEY);
}

export function saveTheme(theme: Theme): void {
  write(THEME_KEY, theme);
}

export function loadPracticeBest(): number {
  return read<number>(BEST_KEY) ?? 0;
}

export function savePracticeBest(points: number): void {
  write(BEST_KEY, points);
}
