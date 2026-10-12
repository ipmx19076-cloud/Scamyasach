import type { Metadata } from "next";
import { NextShell } from "../../components/NextShell";

export const metadata: Metadata = { title: "How to stay safe · Scam Ya Sach?" };

export default function SafetyPage() {
  return <NextShell screen="safety" />;
}
