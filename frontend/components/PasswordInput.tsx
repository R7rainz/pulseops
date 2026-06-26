"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props extends React.ComponentProps<"input"> {
  label?: string;
}

export default function PasswordInput({ label, className, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={props.id} className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          className={`w-full bg-secondary border-2 border-border px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors ${className ?? ""}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
