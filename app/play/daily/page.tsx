import type { Metadata } from "next";
import { NextShell } from "../../../components/NextShell";

export const metadata: Metadata = { title: "Daily Challenge · Scam Ya Sach?" };

export default function DailyPage() {
  return <NextShell screen="daily" />;
}
