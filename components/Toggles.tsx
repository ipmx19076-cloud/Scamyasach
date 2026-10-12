"use client";

import { useMuted, useTheme } from "../lib/prefs";

const btn =
  "inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm text-muted hover:text-ink hover:border-ink/40";

export function Toggles({ sound = true }: { sound?: boolean }) {
  const [muted, setMuted] = useMuted();
  const [theme, setTheme] = useTheme();
  return (
    <div className="flex gap-2">
      {sound && (
      <button type="button" className={btn} onClick={() => setMuted(!muted)} aria-pressed={muted}>
        <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
        {muted ? "Sound off" : "Sound on"}
      </button>
      )}
      <button
        type="button"
        className={btn}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>
        {theme === "dark" ? "Light" : "Dark"}
      </button>
    </div>
  );
}
