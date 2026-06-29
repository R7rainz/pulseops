"use client";

import { useState } from "react";
import { Plus, Copy, Check } from "lucide-react";
import { createApiKey } from "./actions";

export default function CreateApiKeyForm({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setPending(true);
    const form = new FormData();
    form.set("workspaceId", workspaceId);
    form.set("name", name);

    try {
      const result = await createApiKey(form);
      if (result?.key) {
        setNewKey(result.key);
        setName("");
      }
    } catch {
      // Toast handles error
    }
    setPending(false);
  }

  function handleCopy() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (newKey) {
    return (
      <div className="rounded-lg border border-up/30 bg-up/[0.05] p-4">
        <p className="mb-2 text-xs font-medium text-up">API key created — copy it now, it won’t be shown again.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 select-all break-all rounded-lg border border-border bg-surface-raised px-3 py-2 font-mono text-xs text-foreground">
            {newKey}
          </code>
          <button onClick={handleCopy} className="icon-btn hover:border-up/40 hover:text-up" title="Copy" aria-label="Copy API key">
            {copied ? <Check className="h-4 w-4 text-up" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <button onClick={() => setNewKey(null)} className="mt-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          ← Create another
        </button>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-accent">
          <Plus className="h-4 w-4" /> Generate key
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="key-name" className="block text-sm font-medium text-foreground">Key name</label>
            <input
              id="key-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CI/CD pipeline"
              required
              className="field"
            />
          </div>
          <button type="submit" disabled={pending || !name.trim()} className="btn btn-primary h-11">
            {pending ? "…" : "Create"}
          </button>
          <button type="button" onClick={() => setOpen(false)} disabled={pending} className="btn btn-ghost h-11">
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
