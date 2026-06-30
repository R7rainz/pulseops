import { cn } from "@/lib/utils";

/**
 * AmbientGlow — a soft, flowing pastel gradient background (pure CSS).
 *
 * Two large blurred gradient layers (cyan / lavender / pink) that flow in
 * opposite directions, giving a calm liquid motion over the slate base.
 * No canvas, no particles. Animation pauses under prefers-reduced-motion.
 *
 * `tone="vivid"` is stronger (hero); default is subtle (ambient surfaces).
 */
export default function AmbientGlow({
  className,
  tone = "subtle",
}: {
  className?: string;
  tone?: "subtle" | "vivid";
}) {
  const op = tone === "vivid" ? 0.55 : 0.32;
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <div
        className="gradient-flow absolute inset-[-30%]"
        style={{
          background: "linear-gradient(120deg, #A8DADC 0%, #B39CD0 38%, #FFC1CC 68%, #A8DADC 100%)",
          backgroundSize: "300% 300%",
          filter: "blur(90px)",
          opacity: op,
        }}
      />
      <div
        className="gradient-flow absolute inset-[-30%]"
        style={{
          background:
            "radial-gradient(60% 60% at 28% 30%, #B39CD0, transparent 60%), radial-gradient(55% 55% at 80% 72%, #FFC1CC, transparent 60%)",
          backgroundSize: "200% 200%",
          filter: "blur(80px)",
          opacity: op * 0.85,
          animationDirection: "reverse",
          animationDuration: "28s",
        }}
      />
    </div>
  );
}
