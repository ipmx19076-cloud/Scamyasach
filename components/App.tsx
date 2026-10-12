"use client";

import { useIsClient } from "../lib/prefs";
import { Checker } from "./Checker";
import { GameHome } from "./GameHome";
import { Play } from "./Play";
import { Safety } from "./Safety";

export type Screen = "home" | "game" | "daily" | "practice" | "safety";

interface Props {
  screen: Screen;
  go: (screen: Screen) => void;
  /** Link included in shared game results. */
  shareUrl: () => string;
  /** AI check endpoint, or null for the pattern check only (offline copy). */
  checkUrl: string | null;
}

/**
 * The whole app. Routing is passed in, so the same component runs inside
 * Next.js (real URLs) and in the single-file standalone build (in-memory).
 */
export function App({ screen, go, shareUrl, checkUrl }: Props) {
  const isClient = useIsClient();

  switch (screen) {
    case "home":
      return <Checker checkUrl={checkUrl} onGame={() => go("game")} onSafety={() => go("safety")} />;
    case "game":
      return (
        <GameHome onDaily={() => go("daily")} onPractice={() => go("practice")} onSafety={() => go("safety")} onCheck={() => go("home")} />
      );
    case "safety":
      return <Safety onHome={() => go("home")} onDaily={() => go("daily")} />;
    case "daily":
    case "practice":
      // The game reads the date and local storage, so it renders in the browser only.
      if (!isClient) return <div className="min-h-dvh" aria-busy="true" />;
      return (
        <Play
          key={screen}
          mode={screen}
          onHome={() => go("game")}
          onPractice={() => go("practice")}
          onSafety={() => go("safety")}
          shareUrl={shareUrl}
        />
      );
  }
}
