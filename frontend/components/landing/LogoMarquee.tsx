// Social-proof strip — a seamless, reduced-motion-safe marquee of wordmarks.
// Generic representative names (not real brand assets) styled uniformly.

const LOGOS = [
  "Northwind",
  "Acme Cloud",
  "Lumen",
  "Vertex",
  "Cobalt",
  "Meridian",
  "Halcyon",
  "Orbit Labs",
  "Ledger",
  "Aperture",
];

export default function LogoMarquee() {
  const items = [...LOGOS, ...LOGOS];
  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
      }}
    >
      <div className="flex w-max animate-marquee items-center gap-12 sm:gap-16">
        {items.map((name, i) => (
          <span
            key={i}
            aria-hidden={i >= LOGOS.length}
            className="whitespace-nowrap font-display text-lg font-semibold tracking-tight text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
