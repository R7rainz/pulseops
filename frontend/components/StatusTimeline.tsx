import type { MonitorCheck } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  checks: MonitorCheck[];
  limit?: number;
}

const BAR_CLASS: Record<MonitorCheck["status"], string> = {
  UP: "bg-up",
  DEGRADED: "bg-degraded",
  DOWN: "bg-down",
  PAUSED: "bg-paused",
};

export default function StatusTimeline({ checks, limit = 60 }: Props) {
  if (checks.length === 0) {
    return (
      <div className="glass flex h-16 items-center justify-center rounded-lg border-dashed text-sm text-muted-foreground">
        No check history yet
      </div>
    );
  }

  // `checks` arrives newest-first; take the most recent `limit` and lay them
  // out oldest → newest, left → right, like a status-page timeline strip.
  const recent = [...checks].slice(0, limit).reverse();

  return (
    <div className="glass rounded-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">Status timeline</h3>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          last {recent.length} checks
        </span>
      </div>

      <div className="flex h-8 items-stretch gap-px" role="img" aria-label="Recent check status timeline">
        {recent.map((check) => (
          <span
            key={check.id}
            className={cn("flex-1 rounded-[1px]", BAR_CLASS[check.status])}
            title={`${new Date(check.checkedAt).toLocaleString()} — ${check.status}${check.statusCode ? ` (HTTP ${check.statusCode})` : ""}`}
          />
        ))}
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{new Date(recent[0].checkedAt).toLocaleString()}</span>
        <span>{new Date(recent[recent.length - 1].checkedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}
