import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400" });
const mono = JetBrains_Mono({ variable: "--font-mono-jb", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrackBack — missing cashback, resolved in seconds",
  description:
    "A product case study and working MVP: an AI-assisted resolver for missing, pending and cancelled cashback, built from 6,000 app reviews.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${mono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted flex flex-col md:flex-row gap-2 md:justify-between">
            <p>
              TrackBack is an independent concept by Shraman Hazra. Not affiliated with or endorsed by CashKaro.
              Store rules and volumes are illustrative assumptions; review data is public Play Store content.
            </p>
            <a className="underline underline-offset-4 hover:text-ink" href="https://github.com/Shraman123/TrackBack">
              Source on GitHub
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
