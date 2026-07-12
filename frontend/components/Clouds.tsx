import { cn } from "@/lib/utils";

/**
 * Clouds — soft, slow-drifting blurred blobs in the Osaka signal/teal palette.
 * The app's ambient motif: drop it into page backgrounds, card corners, or any
 * `position: relative; overflow: hidden` container (put content above with
 * `relative z-10`). Purely decorative → aria-hidden. Uses the reduced-motion
 * gated `animate-float/drift/sway` keyframes, so it freezes when motion is off.
 */
const BLOBS = [
  { cls: "animate-drift", pos: "left-[-8%] top-[6%]", size: "h-52 w-80", color: "var(--signal-cyan)", o: 0.24, delay: "0s" },
  { cls: "animate-float", pos: "right-[-10%] top-[22%]", size: "h-64 w-96", color: "var(--signal-indigo)", o: 0.2, delay: "1.6s" },
  { cls: "animate-sway", pos: "left-[24%] bottom-[-14%]", size: "h-48 w-72", color: "var(--accent-mid)", o: 0.18, delay: "3.1s" },
  { cls: "animate-float", pos: "right-[16%] bottom-[2%]", size: "h-44 w-64", color: "var(--signal-cyan)", o: 0.16, delay: "2.2s" },
  { cls: "animate-drift", pos: "left-[40%] top-[-10%]", size: "h-40 w-64", color: "var(--signal-indigo)", o: 0.15, delay: "4s" },
];

const COUNT = { low: 2, med: 3, high: 5 } as const;

export default function Clouds({
  className,
  density = "med",
  blur = "blur-3xl",
}: {
  className?: string;
  density?: keyof typeof COUNT;
  blur?: string;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {BLOBS.slice(0, COUNT[density]).map((b, i) => (
        <span
          key={i}
          className={cn("absolute rounded-full", blur, b.cls, b.pos, b.size)}
          style={{
            background: `radial-gradient(circle, color-mix(in oklab, ${b.color} 62%, transparent), transparent 70%)`,
            opacity: b.o,
            animationDelay: b.delay,
            mixBlendMode: "screen",
          }}
        />
      ))}
    </div>
  );
}
