"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, HeartPulse, KeyRound } from "lucide-react";

export default function HeartbeatSetup({
  workspaceId,
  pingUrl,
  intervalSeconds,
  gracePeriodSeconds,
  lastHeartbeatAt,
}: {
  workspaceId: string;
  pingUrl: string;
  intervalSeconds: number;
  gracePeriodSeconds: number;
  lastHeartbeatAt: string | null;
}) {
  const [copied, setCopied] = useState<"url" | "curl" | null>(null);
  const curl = `curl -X POST ${pingUrl} \\\n  -H "x-api-key: YOUR_API_KEY"`;

  function copy(kind: "url" | "curl", text: string) {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="glass rounded-lg p-6">
      <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 font-display text-sm font-semibold text-foreground">
        <HeartPulse className="h-4 w-4 text-primary" /> Heartbeat setup
      </h2>

      <p className="mb-4 text-sm text-muted-foreground">
        Have your job POST to this endpoint at least every{" "}
        <span className="text-foreground">{intervalSeconds}s</span>. If no ping arrives within{" "}
        <span className="text-foreground">{intervalSeconds + gracePeriodSeconds}s</span> (interval + grace), this monitor is
        marked down and an incident opens.
      </p>

      {/* PING URL */}
      <div className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Ping URL</span>
        <div className="flex items-center gap-2">
          <code className="flex-1 select-all break-all rounded-lg border border-border bg-surface-raised px-3 py-2 font-mono text-xs text-foreground">
            POST {pingUrl}
          </code>
          <button onClick={() => copy("url", pingUrl)} className="icon-btn hover:border-primary/40 hover:text-primary" title="Copy URL" aria-label="Copy ping URL">
            {copied === "url" ? <Check className="h-4 w-4 text-up" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* CURL EXAMPLE */}
      <div className="mt-4 space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Example</span>
        <div className="flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-lg border border-border bg-surface-raised px-3 py-2 font-mono text-xs text-foreground">
{curl}
          </pre>
          <button onClick={() => copy("curl", curl)} className="icon-btn hover:border-primary/40 hover:text-primary" title="Copy command" aria-label="Copy curl command">
            {copied === "curl" ? <Check className="h-4 w-4 text-up" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5" />
          Authenticate with a workspace API key sent as the <span className="text-foreground">x-api-key</span> header.
        </p>
        <Link href={`/workspaces/${workspaceId}/settings`} className="btn btn-ghost h-9 text-xs">
          Manage API keys
        </Link>
      </div>

      <p className="mt-3 font-mono text-xs text-muted-foreground">
        Last heartbeat: {lastHeartbeatAt ? new Date(lastHeartbeatAt).toLocaleString() : "never — waiting for first ping"}
      </p>
    </section>
  );
}
