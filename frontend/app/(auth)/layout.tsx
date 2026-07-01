import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col text-foreground selection:bg-primary/20">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-8">
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

      {/* CENTERED CARD over the global mesh */}
      <main className="flex flex-1 items-center justify-center px-6 pb-24 pt-4">
        <div className="fade-up w-full max-w-md">
          <div className="glass rounded-[1.75rem] p-8 sm:p-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
