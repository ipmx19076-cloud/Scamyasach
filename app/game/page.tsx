import type { Metadata } from "next";
import { NextShell } from "../../components/NextShell";

export const metadata: Metadata = { title: "Test yourself · Scam Ya Sach?" };

export default function GamePage() {
  return <NextShell screen="game" />;
}
