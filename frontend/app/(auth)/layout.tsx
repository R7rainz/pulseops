import Aurora from "@/components/Aurora";
import { Brand } from "@/components/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground selection:bg-up/30">
      {/* aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Aurora className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_50%_40%,transparent_45%,rgba(7,11,9,0.65)_100%)]" />
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
