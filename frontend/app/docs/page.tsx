"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import ThemeToggle from "@/components/ThemeToggle";
import { scalarThemeCss } from "@/lib/scalar-theme";

// API reference, embedded in the app. Scalar reads the spec from the
// same-origin proxy (/docs/spec) and is themed via app tokens (see
// scalar-theme), so it tracks the site's light/dark toggle.
export default function ApiDocsPage() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
        <Link
          href="/workspaces"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            API reference
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ApiReferenceReact
          configuration={{
            url: "/docs/spec",
            theme: "default",
            hideDarkModeToggle: true,
            customCss: scalarThemeCss,
          }}
        />
      </div>
    </div>
  );
}
