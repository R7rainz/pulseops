"use client";

import { useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

// Lightweight cookie notice. The app only sets essential/functional cookies
// (auth session, theme, transient toasts) — no tracking or ads — so this is an
// informational acknowledgement, not a consent gate. Whether it renders at all
// is decided server-side in the root layout from the `pulseops_cookie_consent`
// cookie, so there's no flash or hydration mismatch.
export default function CookieConsent() {
  const [dismissed, setDismissed] = useState(false);

  function accept() {
    document.cookie = `pulseops_cookie_consent=accepted; Path=/; Max-Age=31536000; SameSite=Lax`;
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
    >
      <div className="glass mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border border-border p-4 shadow-lg sm:flex-row sm:items-center sm:gap-4">
        <Cookie className="hidden h-5 w-5 shrink-0 text-primary sm:block" aria-hidden="true" />
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          We use <span className="font-medium text-foreground">essential cookies</span> to keep you
          signed in and remember your preferences — no tracking or ads. See our{" "}
          <Link href="/cookie-policy" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/cookie-policy" className="btn btn-ghost h-9 px-4 text-sm">
            Learn more
          </Link>
          <button type="button" onClick={accept} className="btn btn-primary h-9 px-5 text-sm">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
