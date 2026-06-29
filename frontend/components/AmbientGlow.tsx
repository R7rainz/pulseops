import { cn } from "@/lib/utils";

/**
 * AmbientGlow — soft, calm, warm gradient field (pure CSS, no canvas).
 *
 * A few large blurred honey/apricot/clay blobs that drift slowly — the calm
 * Claude/Zen vibe. No particles, no WebGL. Respects reduced-motion (the
 * drift/float animations are disabled globally under prefers-reduced-motion).
 *
 * `tone="vivid"` is a touch stronger (hero); default is subtle (ambient).
 */
export default function AmbientGlow({
  className,
  tone = "subtle",
}: {
  className?: string;
  tone?: "subtle" | "vivid";
}) {
  const a = tone === "vivid" ? 1 : 0.6;
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <div
        className="animate-drift absolute -left-[12%] -top-[14%] h-[60vh] w-[60vh] rounded-full blur-[64px]"
        style={{ background: `radial-gradient(circle, rgba(201,138,43,${0.26 * a}), transparent 70%)` }}
      />
      <div
        className="animate-float absolute right-[2%] top-[6%] h-[48vh] w-[48vh] rounded-full blur-[64px]"
        style={{ background: `radial-gradient(circle, rgba(224,165,99,${0.22 * a}), transparent 70%)`, animationDelay: "2s" }}
      />
      <div
        className="animate-drift absolute -bottom-[14%] left-[28%] h-[55vh] w-[55vh] rounded-full blur-[72px]"
        style={{ background: `radial-gradient(circle, rgba(176,118,80,${0.18 * a}), transparent 70%)`, animationDelay: "4s" }}
      />
      <div
        className="animate-float absolute -right-[8%] bottom-[6%] h-[42vh] w-[42vh] rounded-full blur-[64px]"
        style={{ background: `radial-gradient(circle, rgba(212,180,120,${0.18 * a}), transparent 70%)`, animationDelay: "1s" }}
      />
    </div>
  );
}
