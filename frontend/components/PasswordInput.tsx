"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends React.ComponentProps<"input"> {
  label?: string;
  /** "box" (default) uses the framed .field; "line" uses the editorial underline. */
  variant?: "box" | "line";
}

export default function PasswordInput({ label, className, variant = "box", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const isLine = variant === "line";

  return (
    <div className={isLine ? "space-y-1" : "space-y-1.5"}>
      {label && (
        <label
          htmlFor={props.id}
          className={cn(
            "block font-medium",
            isLine
              ? "text-xs uppercase tracking-[0.14em] text-muted-foreground"
              : "text-sm text-foreground",
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          className={cn(isLine ? "field-line pr-10" : "field pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground",
            isLine ? "right-0" : "right-2.5",
          )}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
