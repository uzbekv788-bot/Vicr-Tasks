import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";

const body = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const display = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-display", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Vice Tasks — AI менеджер задач",
  description: "Brain dump → ИИ → матрица Эйзенхауэра",
};

export const viewport: Viewport = { themeColor: "#0b0620" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${body.variable} ${display.variable}`}>
      <body>
        <div className="sky" aria-hidden>
          <div className="orb a" />
          <div className="orb b" />
          <div className="orb c" />
          <div className="horizon" />
          <div className="grid-floor" />
        </div>
        {children}
      </body>
    </html>
  );
}
