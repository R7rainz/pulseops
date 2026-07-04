"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Workspace {
  id: number | string;
  name: string;
  slug: string;
}

function initial(name: string) {
  return (name || "?").charAt(0).toUpperCase();
}

/**
 * Compact workspace picker: shows the active workspace and opens a menu to
 * switch between workspaces or create a new one. Replaces the old per-workspace
 * accordion — the workspace's options live in the grouped nav below.
 */
export default function WorkspaceSwitcher({
  workspaces,
  active,
}: {
  workspaces: Workspace[];
  active: Workspace | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close whenever the route changes (e.g. after picking a workspace).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close menu on navigation
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
          open
            ? "border-primary/40 bg-primary/[0.06]"
            : "border-border bg-surface-raised/40 hover:border-primary/30 hover:bg-surface-raised",
        )}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10 font-display text-sm font-semibold text-primary">
          {active ? initial(active.name) : "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold tracking-tight text-foreground">
            {active ? active.name : "Select workspace"}
          </span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Workspace
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-black/30"
        >
          <div className="max-h-64 overflow-y-auto p-1">
            {workspaces.map((ws) => {
              const isActive = String(ws.id) === String(active?.id);
              return (
                <Link
                  key={ws.id}
                  href={`/workspaces/${ws.id}/monitors`}
                  role="menuitem"
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                    isActive ? "bg-primary/[0.08] text-primary" : "text-foreground/90 hover:bg-surface-raised",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-md border font-display text-xs font-semibold",
                      isActive ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-surface-raised text-muted-foreground",
                    )}
                  >
                    {initial(ws.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{ws.name}</span>
                  {isActive && <Check className="h-4 w-4 shrink-0" />}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-border p-1">
            <Link
              href="/workspaces/new"
              role="menuitem"
              className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-dashed border-border">
                <Plus className="h-3.5 w-3.5" />
              </span>
              New workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
