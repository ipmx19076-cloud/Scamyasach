"use client";

import { useIsClient } from "../lib/prefs";
import { Home } from "./Home";
import { Play } from "./Play";
import { Safety } from "./Safety";

export type Screen = "home" | "daily" | "practice" | "safety";

interface Props {
  screen: Screen;
  go: (screen: Screen) => void;
  /** Link included in shared results. */
  shareUrl: () => string;
}

/**
 * The whole game. Routing is passed in, so the same component runs inside
 * Next.js (real URLs) and in the single-file standalone build (in-memory).
 */
export function App({ screen, go, shareUrl }: Props) {
  const isClient = useIsClient();

  switch (screen) {
    case "home":
      return <Home onDaily={() => go("daily")} onPractice={() => go("practice")} onSafety={() => go("safety")} />;
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
          onHome={() => go("home")}
          onPractice={() => go("practice")}
          onSafety={() => go("safety")}
          shareUrl={shareUrl}
        />
      );
  }
}
