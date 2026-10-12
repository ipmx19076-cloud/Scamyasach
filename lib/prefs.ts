"use client";

import { useSyncExternalStore } from "react";
import { loadMuted, saveMuted, saveTheme, type Theme } from "./storage";

/**
 * Small stores for user preferences, read with useSyncExternalStore so the
 * server render and the first client render agree (no hydration mismatch).
 */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useMuted(): [boolean, (m: boolean) => void] {
  const muted = useSyncExternalStore(subscribe, loadMuted, () => false);
  return [
    muted,
    (m: boolean) => {
      saveMuted(m);
      emit();
    },
  ];
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);
  return [
    theme,
    (t: Theme) => {
      document.documentElement.dataset.theme = t;
      saveTheme(t);
      emit();
    },
  ];
}

const noop = () => () => {};

/** True only in the browser, after hydration. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Read any storage-backed value safely; `read` must return a primitive. */
export function useStored<T extends string | number | boolean | null>(read: () => T, fallback: T): T {
  return useSyncExternalStore(subscribe, read, () => fallback);
}

export const notifyStorage = emit;

/**
 * Inline script for <head>: sets the theme before first paint so there is
 * no flash. Uses the saved choice, otherwise the system setting.
 */
export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement,t=null;try{t=JSON.parse(localStorage.getItem("sys:theme"));}catch(e){}if(t!=="light"&&t!=="dark"){t=d.dataset.theme==="dark"||d.dataset.theme==="light"?d.dataset.theme:(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");}d.dataset.theme=t;})();`;
