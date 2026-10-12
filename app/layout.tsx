import type { Metadata, Viewport } from "next";
import { THEME_BOOT_SCRIPT } from "../lib/prefs";
// Self-hosted fonts (no Google request). Baloo 2 and Hind are Indian
// typefaces that include Devanagari, ready for a Hindi version.
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "@fontsource/hind/400.css";
import "@fontsource/hind/500.css";
import "@fontsource/hind/600.css";
import "@fontsource/hind/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scam Ya Sach? Spot the fraud in 2 minutes",
  description:
    "A quick phone game: swipe left on scams, right on genuine messages. Learn to spot UPI, SMS, WhatsApp and phone-call fraud.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6eee9" },
    { media: "(prefers-color-scheme: dark)", color: "#10142a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
