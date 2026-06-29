import ParticleField from "@/components/ParticleField";
import { Brand } from "@/components/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden text-foreground selection:bg-primary/20">
      {/* particle background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_-5%,rgba(37,99,235,0.10),transparent_60%)]" />
        <ParticleField className="absolute inset-0 h-full w-full" />
      </div>

      <div className="absolute left-6 top-6 z-10">
        <Brand href="/" />
      </div>

      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
