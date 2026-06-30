"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Light/dark toggle. Flips the `dark` class on <html> and persists the choice
 * in the `pulseops_theme` cookie (read by the root layout for SSR — no flash).
 * The icon is driven purely by the `dark:` variant, so there's no hydration
 * mismatch and no client state to initialise.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    document.cookie = `pulseops_theme=${isDark ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("icon-btn", className)}
      aria-label="Toggle dark mode"
      title="Toggle theme"
    >
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="block h-4 w-4 dark:hidden" />
    </button>
  );
}
