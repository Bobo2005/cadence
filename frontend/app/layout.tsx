import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Typography — two fonts, per docs/DESIGN-SYSTEM.md:
 *   Inter        → sans-serif for labels, body copy, buttons
 *   JetBrains Mono → monospace for numbers, countdowns, addresses, amounts
 */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cadence — Crypto Inheritance Protocol",
  description:
    "Privacy-preserving multi-signal crypto inheritance. Proof-of-Life Consensus: your assets reach your heirs, even if you can't.",
};

import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
