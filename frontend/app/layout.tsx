import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Space_Grotesk, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Toast from "@/components/Toast";

// Display / headings — Space Grotesk (modern geometric grotesque)
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

// Body / UI copy — Geist (clean, modern, neutral)
const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Metrics / numerals / timestamps — Geist Mono (cohesive with Geist)
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
