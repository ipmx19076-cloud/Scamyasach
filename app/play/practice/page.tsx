import type { Metadata } from "next";
import { NextShell } from "../../../components/NextShell";

export const metadata: Metadata = { title: "Practice · Scam Ya Sach?" };

export default function PracticePage() {
  return <NextShell screen="practice" />;
}
