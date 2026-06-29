"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends React.ComponentProps<"input"> {
  label?: string;
}

export default function PasswordInput({ label, className, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          className={cn("field pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
