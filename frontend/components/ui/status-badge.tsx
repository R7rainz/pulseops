import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/status";

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: "sm" | "md";
  /** pulse the icon when DOWN to draw the eye */
  live?: boolean;
  className?: string;
}

/**
 * Status pill: icon + label + semantic colour. Accessible by design — meaning
 * survives without colour (icon + text), and the colour reinforces it.
 */
export function StatusBadge({ status, size = "md", live = true, className }: StatusBadgeProps) {
  const m = statusMeta(status);
  const Icon = m.icon;
  const sm = size === "sm";
  const isDown = (status ?? "").toUpperCase() === "DOWN";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-tight",
        sm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        m.bg,
        m.border,
        m.text,
        className,
      )}
    >
      <Icon
        className={cn(sm ? "h-3 w-3" : "h-3.5 w-3.5", live && isDown && "animate-pulse")}
        aria-hidden="true"
      />
      {m.label}
    </span>
  );
}

/** Bare status dot for dense rows — pairs with a visible text label elsewhere. */
export function StatusDot({ status, className }: { status: string | null | undefined; className?: string }) {
  const m = statusMeta(status);
  const isDown = (status ?? "").toUpperCase() === "DOWN";
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)} title={m.label}>
      {isDown && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", m.solid)} />}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", m.solid)} />
      <span className="sr-only">{m.label}</span>
    </span>
  );
}
