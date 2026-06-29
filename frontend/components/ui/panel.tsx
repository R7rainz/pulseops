import { cn } from "@/lib/utils";

/**
 * Glass surface panel — the standard container for the dark theme.
 * `tone="shell"` wraps it in a gradient-border hairline for hero/feature cards.
 */
export function Panel({
  className,
  children,
  tone = "flat",
  interactive = false,
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "flat" | "shell";
  interactive?: boolean;
}) {
  const surface = (
    <div
      className={cn(
        "glass rounded-lg",
        interactive &&
          "transition-colors duration-200 hover:border-up/30 focus-within:border-up/40",
        className,
      )}
    >
      {children}
    </div>
  );

  if (tone === "shell") {
    return <div className="pulse-shell">{surface}</div>;
  }
  return surface;
}

/** Small uppercase field/section label — Geist Mono, muted. */
export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
