import { notFound } from "next/navigation";
import { API_URL } from "@/lib/constants";
import Link from "next/link";
import AmbientGlow from "@/components/AmbientGlow";
import { Brand } from "@/components/Brand";
import { StatusOverview, type StatusData } from "@/components/status/StatusOverview";

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let statusData: StatusData | null = null;
  try {
    const res = await fetch(`${API_URL}/api/v1/status/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) {
      if (res.status === 404) notFound();
      throw new Error("Failed to load status");
    }
    const json = await res.json();
    statusData = json.data;
  } catch (err) {
    console.error("Public status fetch error:", err);
  }

  if (!statusData) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6 text-center">
        <div>
          <p className="font-display text-lg font-medium text-foreground">Status unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">We couldn’t load this status page. Please try again.</p>
        </div>
      </div>
    );
  }

  const { workspaceName, description, generatedAt } = statusData;
  // Server-stamped: the page is revalidated every 30s, so rendering
  // `new Date()` here claimed the data was fresher than it actually was.
  const updated = generatedAt ? new Date(generatedAt) : null;

  return (
    <main className="relative min-h-dvh overflow-hidden text-foreground">
      {/* ambient background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-background" />
        <AmbientGlow />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <header className="flex items-center justify-between">
          <Brand href="/" size="sm" />
          {updated && (
            <span className="font-mono text-[11px] text-muted-foreground">
              Updated {updated.toLocaleString()}
            </span>
          )}
        </header>

        <div className="mt-12 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{workspaceName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {description || "System status & uptime"}
          </p>
        </div>

        <div className="mt-8">
          <StatusOverview data={statusData} />
        </div>

        <footer className="mt-14 border-t border-border pt-6 text-center">
          <Link href="/" className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-up">
            Powered by PulseOps
          </Link>
        </footer>
      </div>
    </main>
  );
}
