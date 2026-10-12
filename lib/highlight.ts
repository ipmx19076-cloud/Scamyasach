import type { Flag } from "./types";

export interface Segment {
  text: string;
  /** Index into the flags array, or undefined for plain text. */
  flag?: number;
}

/**
 * Splits text into plain and flagged segments. Each flag marks its first
 * occurrence; overlapping flags are skipped so nothing renders twice.
 */
export function segment(text: string, flags: readonly Flag[]): Segment[] {
  const ranges: { start: number; end: number; flag: number }[] = [];
  flags.forEach((f, i) => {
    const start = text.indexOf(f.text);
    if (start >= 0) ranges.push({ start, end: start + f.text.length, flag: i });
  });
  ranges.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start < pos) continue;
    if (r.start > pos) out.push({ text: text.slice(pos, r.start) });
    out.push({ text: text.slice(r.start, r.end), flag: r.flag });
    pos = r.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
