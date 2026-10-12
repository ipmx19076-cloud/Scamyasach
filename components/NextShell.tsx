"use client";

import { useRouter } from "next/navigation";
import { App, type Screen } from "./App";

const PATH: Record<Screen, string> = {
  home: "/",
  daily: "/play/daily",
  practice: "/play/practice",
  safety: "/safety",
};

export function NextShell({ screen }: { screen: Screen }) {
  const router = useRouter();
  return (
    <App
      screen={screen}
      go={(s) => {
        router.push(PATH[s]);
        window.scrollTo(0, 0);
      }}
      shareUrl={() => window.location.origin}
    />
  );
}
