import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { API_URL } from "@/lib/constants";
import { apiFetch } from "@/lib/apiFetch";
import { StatusOverview, type StatusData } from "@/components/status/StatusOverview";
import StatusPageForm, { type StatusPageConfig, type SelectableMonitor } from "./status-page-form";

interface Workspace {
  id: number;
  name: string;
  slug: string;
  // Gates the config form — only owners/admins may publish.
  role?: string;
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
  let config: StatusPageConfig | null = null;
  let monitors: SelectableMonitor[] = [];
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

    const [configRes, monitorsRes] = await Promise.all([
      apiFetch(`${API_URL}/api/v1/workspaces/${workspaceId}/status-page`, {
        token, cookieStore, cache: "no-store",
      }),
      apiFetch(`${API_URL}/api/v1/workspaces/${workspaceId}/monitors`, {
        token, cookieStore, cache: "no-store",
      }),
    ]);

    if (configRes.ok) {
      const json = await configRes.json();
      if (json.data) {
        config = {
          slug: json.data.slug,
          title: json.data.title,
          description: json.data.description,
          isPublic: json.data.isPublic,
          entries: (json.data.entries ?? []).map((e: { monitorId: number; displayName: string | null }) => ({
            monitorId: e.monitorId,
            displayName: e.displayName,
          })),
        };
      }
    }

    if (monitorsRes.ok) {
      const json = await monitorsRes.json();
      monitors = (json.data ?? []).map((m: { id: number; name: string }) => ({ id: m.id, name: m.name }));
    }

    // Preview mirrors exactly what the public page serves, so it only renders
    // once the page is actually published.
    if (config?.slug && config.isPublic) {
      const statusRes = await fetch(`${API_URL}/api/v1/status/${config.slug}`, { cache: "no-store" });
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        statusData = statusJson.data;
      }
    }
  } catch (err) {
    console.error("Dashboard status fetch error:", err);
  }

  if (authFailed) redirect("/login");

  const publicHref = config?.isPublic ? `/status/${config.slug}` : null;
  const canEdit = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

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

        <section className="glass rounded-lg p-6">
          <h2 className="mb-4 font-display text-sm font-semibold text-foreground">Configuration</h2>
          <StatusPageForm
            workspaceId={workspaceId}
            workspaceName={workspace?.name ?? `Workspace #${workspaceId}`}
            workspaceSlug={workspace?.slug ?? ""}
            config={config}
            monitors={monitors}
            canEdit={canEdit}
          />
        </section>

        {statusData ? (
          <section className="glass rounded-lg p-6">
            <h2 className="mb-4 font-display text-sm font-semibold text-foreground">Public preview</h2>
            <StatusOverview data={statusData} />
          </section>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="font-display text-base font-medium text-foreground">Not published</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick the monitors to publish above, tick “Publish this page”, then save to make it live.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
