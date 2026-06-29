import { cn } from "@/lib/utils";

/**
 * AmbientGlow — soft, flowing, warm gradient field (pure CSS, no canvas).
 *
 * Large blurred honey/apricot/clay/rose blobs that drift, float and sway on
 * different timings so the field feels alive and liquid — the calm Claude/Zen
 * vibe. No particles, no WebGL. Animations are disabled under reduced-motion.
 *
 * `tone="vivid"` is stronger (hero); default is subtle (ambient).
 */
export default function AmbientGlow({
  className,
  tone = "subtle",
}: {
  className?: string;
  tone?: "subtle" | "vivid";
}) {
  const a = tone === "vivid" ? 1.25 : 0.85;
  const blob = (
    color: string,
    alpha: number,
    pos: string,
    size: string,
    anim: string,
    delay: string,
  ) => (
    <div
      className={cn("absolute rounded-full", anim, pos, size)}
      style={{
        background: `radial-gradient(circle, ${color.replace("ALPHA", String(alpha * a))}, transparent 70%)`,
        filter: "blur(70px)",
        animationDelay: delay,
      }}
    />
  );

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {blob("rgba(201,138,43,ALPHA)", 0.3, "-left-[14%] -top-[16%]", "h-[68vh] w-[68vh]", "animate-drift", "0s")}
      {blob("rgba(224,165,99,ALPHA)", 0.26, "right-[0%] top-[2%]", "h-[54vh] w-[54vh]", "animate-float", "2s")}
      {blob("rgba(176,118,80,ALPHA)", 0.22, "-bottom-[16%] left-[24%]", "h-[60vh] w-[60vh]", "animate-sway", "4s")}
      {blob("rgba(212,180,120,ALPHA)", 0.22, "-right-[10%] bottom-[4%]", "h-[48vh] w-[48vh]", "animate-drift", "1s")}
      {blob("rgba(196,128,96,ALPHA)", 0.16, "left-[8%] top-[34%]", "h-[44vh] w-[44vh]", "animate-float", "5s")}
    </div>
  );
}
