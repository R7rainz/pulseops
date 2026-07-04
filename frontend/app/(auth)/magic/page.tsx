"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { verifyMagicLink } from "../auth.actions";

function MagicVerify() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setError("This sign-in link is invalid.");
      return;
    }

    // On success the action redirects (navigation happens automatically); we
    // only get here with a returned value on failure.
    verifyMagicLink(token).then((res) => {
      if (res?.error) setError(res.error);
    });
  }, [token]);

  return (
    <div>
      <div className="fade-up">
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-foreground">Signing you in</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Verifying your sign-in link…</p>
      </div>

      <div className="fade-up mt-8" style={{ animationDelay: "80ms" }}>
        {error ? (
          <div>
            <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
            <Link href="/magic-link" className="inline-flex items-center gap-2 text-sm font-medium text-info transition-colors hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Request a new link
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Hang tight…</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MagicPage() {
  return (
    <Suspense>
      <MagicVerify />
    </Suspense>
  );
}
