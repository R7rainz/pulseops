import { cn } from "@/lib/utils";

/**
 * AmbientGlow — black-dominant background with a metallic sheen (pure CSS).
 *
 * The base stays black; the metallic scale (steel → silver → white) appears
 * only as corner-anchored radial blobs that fall off to transparent well
 * before mid-screen, giving a subtle shiny sheen — not a page-wide wash. Two
 * layers drift in opposite directions for slow motion. Theme-driven via the
 * --sheen-* tokens. No canvas, no particles.
 * Animation pauses under prefers-reduced-motion.
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
  const op = tone === "vivid" ? 0.26 : 0.12;
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {/* Corner-anchored glows — steel + silver read on both black and white. */}
      <div
        className="gradient-flow absolute inset-[-30%]"
        style={{
          background:
            "radial-gradient(50% 45% at 12% 8%, var(--sheen-deep), transparent 60%), radial-gradient(45% 45% at 88% 92%, var(--sheen-mid), transparent 60%)",
          backgroundSize: "220% 220%",
          filter: "blur(90px)",
          opacity: op,
        }}
      />
      {/* Smaller bright specular, reverse drift — the "shiny, metallic" layer. */}
      <div
        className="gradient-flow absolute inset-[-30%]"
        style={{
          background: "radial-gradient(38% 38% at 72% 22%, var(--sheen-light), transparent 62%)",
          backgroundSize: "200% 200%",
          filter: "blur(80px)",
          opacity: op * 0.8,
          animationDirection: "reverse",
          animationDuration: "28s",
        }}
      />
    </div>
  );
}
