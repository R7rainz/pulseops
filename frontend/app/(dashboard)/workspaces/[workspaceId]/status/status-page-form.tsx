"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Save } from "lucide-react";
import { saveStatusPage, unpublishStatusPage } from "./actions";

export interface StatusPageConfig {
  slug: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  entries: { monitorId: number; displayName: string | null }[];
}

export interface SelectableMonitor {
  id: number;
  name: string;
}

export default function StatusPageForm({
  workspaceId,
  workspaceName,
  workspaceSlug,
  config,
  monitors,
  canEdit,
}: {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  config: StatusPageConfig | null;
  monitors: SelectableMonitor[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing selection, or nothing — monitors are opt-in, so a page with no
  // config starts empty rather than silently publishing everything.
  const published = new Map(config?.entries.map((e) => [e.monitorId, e.displayName]) ?? []);
  const [selected, setSelected] = useState<Set<number>>(new Set(published.keys()));

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("workspaceId", workspaceId);

    const result = await saveStatusPage(formData);
    if (result?.error) setError(result.error);
    else router.refresh();

    setPending(false);
  }

  if (!canEdit) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Only workspace owners and admins can configure the status page.
      </p>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="sp-title" className="block text-sm font-medium text-foreground">Title</label>
          <input
            id="sp-title"
            name="title"
            defaultValue={config?.title ?? workspaceName}
            required
            maxLength={100}
            className="field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sp-slug" className="block text-sm font-medium text-foreground">Public URL</label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">/status/</span>
            <input
              id="sp-slug"
              name="slug"
              defaultValue={config?.slug ?? workspaceSlug}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Lowercase letters, numbers and hyphens"
              className="field font-mono"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sp-description" className="block text-sm font-medium text-foreground">
          Description <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="sp-description"
          name="description"
          defaultValue={config?.description ?? ""}
          maxLength={500}
          placeholder="Live status for our public API"
          className="field"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Published monitors</legend>
        <p className="mt-1 text-xs text-muted-foreground">
          Only checked monitors appear publicly. Give one a display name to avoid exposing an internal hostname.
        </p>

        {monitors.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No monitors in this workspace yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {monitors.map((monitor) => {
              const checked = selected.has(monitor.id);
              return (
                <li key={monitor.id} className="flex flex-wrap items-center gap-3 p-3">
                  <label className="flex min-w-0 flex-1 items-center gap-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      name="monitorIds"
                      value={monitor.id}
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(monitor.id);
                        else next.delete(monitor.id);
                        setSelected(next);
                      }}
                      className="h-4 w-4 shrink-0 accent-[var(--up)]"
                    />
                    <span className="truncate">{monitor.name}</span>
                  </label>
                  <input
                    name={`alias-${monitor.id}`}
                    defaultValue={published.get(monitor.id) ?? ""}
                    disabled={!checked}
                    placeholder="Public name (optional)"
                    aria-label={`Public display name for ${monitor.name}`}
                    className="field w-full sm:w-56 disabled:opacity-40"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      <label className="flex items-center gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={config?.isPublic ?? false}
          className="h-4 w-4 accent-[var(--up)]"
        />
        <span className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Publish this page — anyone with the link can view it
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-down/40 bg-down/5 px-3 py-2 text-xs text-down">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          <Save className="h-4 w-4" />
          {pending ? "Saving…" : "Save status page"}
        </button>

        {/* Separate action, so it can't be nested inside the save form. */}
        {config && (
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              if (!window.confirm("Take the public status page offline? The URL will stop working.")) {
                return;
              }
              setPending(true);
              const formData = new FormData();
              formData.set("workspaceId", workspaceId);
              await unpublishStatusPage(formData);
              router.refresh();
              setPending(false);
            }}
            className="btn btn-ghost"
          >
            Take offline
          </button>
        )}
      </div>

      <input type="hidden" name="workspaceId" value={workspaceId} />
    </form>
  );
}
