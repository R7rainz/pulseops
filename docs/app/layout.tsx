import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
// Scalar's stylesheet, imported in a server layout so the side-effect survives
// Next's client bundling (paired with transpilePackages in next.config).
import "@scalar/api-reference-react/style.css";

export const metadata: Metadata = {
  title: "PulseOps API Reference",
  description: "Programmatic access to PulseOps monitors and incidents.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Match the main app: dark is default, light opt-in via the shared
  // `pulseops_theme` cookie (SSR — no flash).
  const isDark = (await cookies()).get("pulseops_theme")?.value !== "light";

  return (
    <html lang="en" className={isDark ? "dark" : undefined}>
      <body>{children}</body>
    </html>
  );
}
