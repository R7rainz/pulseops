"use client";

import { cn } from "@/lib/utils";

/**
 * Submit button that confirms before firing — for destructive server-action
 * forms (delete monitor, revoke key, remove member). Preserves the native
 * <form action={serverAction}> flow; just gates submission on a confirm.
 */
export function ConfirmSubmit({
  message,
  children,
  className,
  title,
  "aria-label": ariaLabel,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="submit"
      title={title}
      aria-label={ariaLabel}
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
