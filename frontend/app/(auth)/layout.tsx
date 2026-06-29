import Link from "next/link";
import { Activity, Radio, Bell, Globe } from "lucide-react";
import ParticleField from "@/components/ParticleField";
import { Brand } from "@/components/Brand";

const POINTS = [
  { icon: Radio, text: "Real-time monitoring across regions" },
  { icon: Bell, text: "Incident alerts before customers notice" },
  { icon: Globe, text: "Shareable public status pages" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh text-foreground selection:bg-primary/20 lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* LEFT — fluid brand panel (desktop only) */}
      <aside className="relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* fluid gradient field */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(140deg,#1e3a8a_0%,#2563eb_45%,#0ea5e9_100%)]" />
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="animate-drift absolute -left-1/4 -top-10 h-[65%] w-[70%] rounded-full bg-white/20 blur-3xl" />
          <div
            className="animate-float absolute -bottom-10 right-0 h-[55%] w-[60%] rounded-full bg-sky-200/30 blur-3xl"
            style={{ animationDelay: "1.5s" }}
          />
          <div
            className="animate-drift absolute left-1/3 top-1/3 h-[45%] w-[50%] rounded-full bg-indigo-300/25 blur-3xl"
            style={{ animationDelay: "3s" }}
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(130%_120%_at_50%_0%,transparent_55%,rgba(10,18,48,0.45)_100%)]" />

        {/* brand */}
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/30 bg-white/15 backdrop-blur">
            <Activity className="h-[18px] w-[18px]" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">PulseOps</span>
        </Link>

        {/* headline + value points */}
        <div className="fade-up max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-[1.15] tracking-tight xl:text-[2.6rem]">
            Calm visibility for everything you run.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">
            Uptime, latency, SSL and incidents — watched around the clock and surfaced the moment something moves.
          </p>
          <ul className="mt-9 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* footer */}
        <p className="text-xs text-white/55">Trusted by teams shipping at scale.</p>
      </aside>

      {/* RIGHT — form */}
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-10%,rgba(37,99,235,0.08),transparent_60%)]" />
          <ParticleField className="absolute inset-0 h-full w-full opacity-60 lg:opacity-35" max={50} />
        </div>

        {/* mobile brand */}
        <div className="absolute left-6 top-6 lg:hidden">
          <Brand href="/" />
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
