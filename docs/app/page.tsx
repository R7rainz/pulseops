"use client";

import { useEffect, useState } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import { scalarThemeCss } from "@/lib/scalar-theme";
import ThemeToggle from "@/components/ThemeToggle";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function Page() {
  // Keep Scalar's own light/dark mode in lockstep with the app's `.dark` class
  // (flipped by ThemeToggle). Without this, Scalar's internal styles don't
  // follow the toggle and the theme looks half-applied.
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => {
      const dark = el.classList.contains("dark");
      setIsDark(dark);
      // Scalar keys its mode-specific styles off `.dark-mode` / `.light-mode`
      // on <body>. It sets this once from `darkMode` and doesn't flip it when
      // the app's `.dark` class toggles, so drive it ourselves to keep code
      // blocks, cards, etc. in sync with the rest of the theme.
      document.body.classList.toggle("dark-mode", dark);
      document.body.classList.toggle("light-mode", !dark);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div id="scalar-host">
      {/* Floating controls — fixed so they don't take layout height. */}
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 12,
          zIndex: 80,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <a
          href={APP_URL}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 32,
            padding: "0 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "color-mix(in oklab, var(--background) 80%, transparent)",
            color: "var(--muted-foreground)",
            fontSize: 12,
            fontWeight: 500,
            textDecoration: "none",
            backdropFilter: "blur(6px)",
          }}
        >
          ← Back to app
        </a>
        <ThemeToggle />
      </div>

      <ApiReferenceReact
        configuration={{
          url: "/openapi.json",
          theme: "default",
          darkMode: isDark,
          hideDarkModeToggle: true,
          customCss: scalarThemeCss,
        }}
      />
    </div>
  );
}
