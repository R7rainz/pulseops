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
      <div className="border-2 border-emerald-500/30 bg-emerald-500/5 p-4">
        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
          API Key Created — Copy it now
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-xs text-zinc-200 break-all font-mono select-all">
            {newKey}
          </code>
          <button
            onClick={handleCopy}
            className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <button
          onClick={() => setNewKey(null)}
          className="mt-3 text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest font-bold transition-colors"
        >
          &larr; Create another
        </button>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Key
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <label
              htmlFor="key-name"
              className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest"
            >
              Key Name
            </label>
            <input
              id="key-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CI/CD Pipeline"
              required
              className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest text-xs border-2 border-transparent transition-all disabled:opacity-50 h-[42px]"
          >
            {pending ? "..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-400 hover:text-zinc-100 text-xs font-bold uppercase tracking-widest transition-colors h-[42px]"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
