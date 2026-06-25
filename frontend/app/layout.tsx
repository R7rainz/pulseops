import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Toast from "@/components/Toast";
import WebGLWrapper from "@/components/WebGLWrapper";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-display",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "PulseOps — Nexus",
  description: "Strict telemetry. Zero bloat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        bricolage.variable,
        instrument.variable,
        "font-body"
      )}
    >
      <body className="min-h-full flex flex-col">
        <WebGLWrapper />
        {children}
        <Toast />
      </body>
    </html>
  );
}
