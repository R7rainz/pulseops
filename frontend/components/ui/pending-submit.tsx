"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Submit button that disables itself (and spins any icon inside) while its
 * server-action form is pending — for actions that must not be double-fired,
 * like "run check now". Preserves the native <form action={serverAction}> flow.
 */
export function PendingSubmit({
  children,
  className,
  title,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      aria-label={ariaLabel}
      className={cn(
        "cursor-pointer",
        pending && "pointer-events-none opacity-50 [&_svg]:animate-spin",
        className,
      )}
    >
      {children}
    </button>
  );
}
