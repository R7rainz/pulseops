import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bricolage_Grotesque, Instrument_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Toast from "@/components/Toast";

// Display / headings — Bricolage Grotesque (variable weight)
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

// Body / UI copy — Instrument Sans
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Metrics / numerals / timestamps — Geist Mono
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PulseOps — Uptime & Telemetry",
  description: "Monitor uptime, latency, and incidents across your infrastructure.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Slate (dark) is the default; light is opt-in via the toggle (cookie-driven, SSR — no flash).
  const isDark = (await cookies()).get("pulseops_theme")?.value !== "light";

  return (
    <html
      lang="en"
      className={cn(isDark && "dark", "h-full", "antialiased", "font-sans", display.variable, sans.variable, geistMono.variable)}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toast />
      </body>
    </html>
  );
}
