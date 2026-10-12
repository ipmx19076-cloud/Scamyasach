import type { Locale, Scenario } from "../lib/types";
import { scenariosEn } from "./scenarios.en";

/**
 * Scenario sets by language. To add Hindi, create scenarios.hi.ts with the
 * same ids and add it here; missing languages fall back to English.
 */
const byLocale: Partial<Record<Locale, Scenario[]>> = {
  en: scenariosEn,
};

/** Numbers flags in the order they appear in the message, so ①②③ read top to bottom. */
function normalise(list: Scenario[]): Scenario[] {
  return list.map((s) => ({
    ...s,
    flags: s.flags.slice().sort((a, b) => s.body.indexOf(a.text) - s.body.indexOf(b.text)),
  }));
}

const cache = new Map<Locale, Scenario[]>();

export function getScenarios(locale: Locale = "en"): Scenario[] {
  if (!cache.has(locale)) cache.set(locale, normalise(byLocale[locale] ?? scenariosEn));
  return cache.get(locale)!;
}

export const scenarios = getScenarios("en");
