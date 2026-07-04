import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { API_URL } from "@/lib/constants";
import { apiFetch } from "@/lib/apiFetch";
import { StatusOverview, type StatusData } from "@/components/status/StatusOverview";

interface Workspace {
  id: number;
  name: string;
  slug: string;
}

export default async function WorkspaceStatusPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) redirect("/login");

  let workspace: Workspace | null = null;
  let statusData: StatusData | null = null;
  let authFailed = false;

  try {
    const wsRes = await apiFetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}`,
      { token, cookieStore, cache: "no-store" },
    );

    authFailed = wsRes.status === 401 || wsRes.status === 403;

    if (wsRes.ok) {
      const wsJson = await wsRes.json();
      workspace = wsJson.data;
    }

    if (workspace?.slug) {
      const statusRes = await fetch(`${API_URL}/api/v1/status/${workspace.slug}`, { cache: "no-store" });
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        statusData = statusJson.data;
      }
    }
  } catch (err) {
    console.error("Dashboard status fetch error:", err);
  }

  if (authFailed) redirect("/login");

  const publicHref = workspace?.slug ? `/status/${workspace.slug}` : null;

  return (
    <main className="min-h-dvh p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Status page</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {workspace?.name ?? `Workspace #${workspaceId}`} public uptime view
            </p>
          </div>

          {publicHref && (
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary self-start md:self-auto"
            >
              <ExternalLink className="h-4 w-4" />
              Public page
            </a>
          )}
        </div>

        {statusData ? (
          <StatusOverview data={statusData} />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="font-display text-base font-medium text-foreground">Status unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">We couldn’t load this status page. Please try again.</p>
          </div>
        )}
      </div>
    </main>
  );
}
