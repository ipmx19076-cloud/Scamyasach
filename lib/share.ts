import { rate, totalPoints } from "./scoring";
import type { Answer, Mode } from "./types";

/** 🟩 correct, 🟥 wrong, ⬜ timer ran out. */
export function emojiGrid(answers: readonly Answer[]): string {
  return answers.map((a) => (a.correct ? "🟩" : a.choseScam === null ? "⬜" : "🟥")).join("");
}

export function shareText(answers: readonly Answer[], mode: Mode, dateKey: string, url: string): string {
  const right = answers.filter((a) => a.correct).length;
  const head = mode === "daily" ? `Scam Ya Sach? Daily ${dateKey}` : "Scam Ya Sach? Practice";
  return [
    head,
    `${right}/${answers.length} · ${rate(answers)} · ${totalPoints(answers)} pts`,
    emojiGrid(answers),
    `Can you spot the scam? ${url}`,
  ].join("\n");
}
