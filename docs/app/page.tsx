"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import { scalarThemeCss } from "@/lib/scalar-theme";
import ThemeToggle from "@/components/ThemeToggle";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function Page() {
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
          hideDarkModeToggle: true,
          customCss: scalarThemeCss,
        }}
      />
    </div>
  );
}
