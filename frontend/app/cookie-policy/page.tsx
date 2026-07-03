import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Cookie Policy — PulseOps",
  description: "The cookies PulseOps uses and why. No tracking, no ads.",
};

const COOKIES = [
  {
    name: "pulseops_token",
    purpose: "Signs you in and keeps your session active (HTTP-only, not readable by scripts).",
    type: "Essential",
    retention: "7 days",
  },
  {
    name: "pulseops_cookie_consent",
    purpose: "Remembers that you've acknowledged this cookie notice so it isn't shown again.",
    type: "Essential",
    retention: "1 year",
  },
  {
    name: "pulseops_theme",
    purpose: "Remembers your light / dark theme choice.",
    type: "Functional",
    retention: "1 year",
  },
  {
    name: "pulseops_toast",
    purpose: "Briefly carries a one-off status message (e.g. “Monitor created”) across a redirect.",
    type: "Functional",
    retention: "~5 seconds",
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Brand href="/" />
          <ThemeToggle className="h-9 w-9" />
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Cookie Policy</h1>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          PulseOps uses a small number of cookies that are strictly necessary to run the app and
          remember your preferences. We <span className="font-medium text-foreground">do not</span>{" "}
          use analytics, advertising, or third-party tracking cookies, and we never sell your data.
          Because these cookies are essential to the service, disabling them in your browser may stop
          parts of the app (like staying signed in) from working.
        </p>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Cookies we set
          </h2>
          <div className="glass overflow-x-auto rounded-lg">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Purpose</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COOKIES.map((c) => (
                  <tr key={c.name} className="align-top">
                    <td className="px-5 py-3.5 font-mono text-xs text-foreground">{c.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{c.purpose}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          c.type === "Essential"
                            ? "inline-flex rounded-full border border-up/30 bg-up/10 px-2 py-0.5 text-[11px] font-medium text-up"
                            : "inline-flex rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[11px] font-medium text-info"
                        }
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-muted-foreground">
                      {c.retention}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Local storage
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your monitors view preference (grid vs. table) is saved in your browser's local storage
            as <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-foreground">pulseops_view_pref</code>.
            It stays on your device and is never sent to our servers.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Managing cookies
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You can clear or block cookies at any time through your browser settings. Signing out
            removes your session cookie. Since every cookie above is essential or functional, there's
            nothing extra to opt into — the notice simply confirms you've seen this policy.
          </p>
        </section>

        <p className="mt-10 border-t border-border pt-6 font-mono text-[11px] text-muted-foreground">
          Last updated {new Date().getFullYear()} · PulseOps
        </p>
      </main>
    </div>
  );
}
