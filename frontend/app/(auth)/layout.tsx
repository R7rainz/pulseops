import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import { StatusDot } from "@/components/ui/status-badge";

// tiny decorative uptime sparkline (self-contained, no data)
function Spark() {
  const pts = [10, 8, 12, 7, 9, 6, 11, 5, 8, 4, 7, 3];
  const w = 132;
  const h = 34;
  const max = Math.max(...pts);
  const d = pts
    .map((p, i) => `${(i / (pts.length - 1)) * w},${h - (p / max) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 overflow-visible" aria-hidden="true">
      <polyline points={d} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col text-foreground selection:bg-primary/20">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Brand href="/" />
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
          <ThemeToggle className="h-9 w-9" />
        </div>
      </header>

      {/* CONTENT — full-bleed over the global mesh, editorial left column */}
      <main className="relative flex flex-1 items-center px-6 pb-16 sm:px-10">
        {/* floating product motifs (desktop only, decorative) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
          <div className="glass fade-up absolute right-[9%] top-[26%] flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium">
            <StatusDot status="UP" /> All systems operational
          </div>
          <div className="glass fade-up absolute bottom-[24%] right-[15%] rounded-2xl p-4" style={{ animationDelay: "160ms" }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Uptime · 90d</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-primary">99.98%</p>
            <Spark />
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md lg:mx-0 lg:ml-[9%] xl:ml-[13%]">{children}</div>
      </main>
    </div>
  );
}
