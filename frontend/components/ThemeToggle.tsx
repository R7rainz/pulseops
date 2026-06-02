"use client";

import { useState, useCallback } from "react";
import { Palette } from "lucide-react";
import { themes, type ThemeId } from "@/lib/themes";

interface Props {
  initialTheme: ThemeId;
}

export default function ThemeToggle({ initialTheme }: Props) {
  const [current, setCurrent] = useState<ThemeId>(initialTheme);
  const [open, setOpen] = useState(false);

  const select = useCallback((id: ThemeId) => {
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\w+/g, "")
      .trim();
    document.documentElement.classList.add(id);
    document.cookie = `pulseops_theme=${id}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setCurrent(id);
    setOpen(false);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
        title="Switch theme"
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-40 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => select(t.id)}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-accent transition-colors ${
                  current === t.id ? "text-primary font-medium" : "text-popover-foreground"
                }`}
              >
                <span>{t.name}</span>
                {current === t.id && <span className="text-primary">&#10003;</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
