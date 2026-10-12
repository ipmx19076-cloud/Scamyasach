/**
 * Entry point for the single-file build (npm run build:standalone).
 * Same game as the Next.js app, with in-page routing via the URL hash so it
 * works as one HTML file anywhere: an artifact preview, a USB stick, offline.
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App, type Screen } from "../components/App";

const SCREENS: Screen[] = ["home", "game", "daily", "practice", "safety"];

function fromHash(): Screen {
  const h = window.location.hash.replace("#", "") as Screen;
  return SCREENS.includes(h) ? h : "home";
}

function Standalone() {
  const [screen, setScreen] = useState<Screen>(fromHash);
  useEffect(() => {
    const onHash = () => setScreen(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return (
    <App
      screen={screen}
      go={(s) => {
        try {
          window.location.hash = s === "home" ? "" : s;
        } catch {
          /* sandboxed frames may block this */
        }
        setScreen(s);
        window.scrollTo(0, 0);
      }}
      shareUrl={() => `${window.location.href.split("#")[0]}#game`}
      checkUrl={null}
    />
  );
}

createRoot(document.getElementById("root")!).render(<Standalone />);
