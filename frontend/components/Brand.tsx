import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PulseOps wordmark. The icon sits in a soft mint-tinted tile; "Pulse" in the
 * display face, "Ops" in the up/mint accent.
 */
export function Brand({
  href = "/",
  size = "md",
  className,
}: {
  href?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const sm = size === "sm";
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid place-items-center rounded-md border border-primary/30 bg-primary/10",
          sm ? "h-7 w-7" : "h-8 w-8",
        )}
      >
        <Activity className={cn("text-primary", sm ? "h-4 w-4" : "h-[18px] w-[18px]")} aria-hidden="true" />
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          sm ? "text-base" : "text-lg",
        )}
      >
        Pulse<span className="text-primary">Ops</span>
      </span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="PulseOps home">
      {inner}
    </Link>
  );
}
