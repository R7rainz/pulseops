import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bricolage_Grotesque, Instrument_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Toast from "@/components/Toast";
import CookieConsent from "@/components/CookieConsent";

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
  const cookieStore = await cookies();
  // Light (Osaka Dawn) is the default; dark is opt-in via the toggle (cookie-driven, SSR — no flash).
  const isDark = cookieStore.get("pulseops_theme")?.value === "dark";
  const hasCookieConsent = cookieStore.get("pulseops_cookie_consent")?.value === "accepted";

  return (
    <html
      lang="en"
      className={cn(isDark && "dark", "h-full", "antialiased", "font-sans", display.variable, sans.variable, geistMono.variable)}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toast />
        {!hasCookieConsent && <CookieConsent />}
      </body>
    </html>
  );
}
