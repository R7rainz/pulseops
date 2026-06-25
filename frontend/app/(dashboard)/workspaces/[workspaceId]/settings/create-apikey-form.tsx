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
      <div className="border border-[#9FD8BD]/30 bg-[rgba(159,216,189,0.05)] p-4">
        <p className="text-[10px] font-medium text-[#9FD8BD] mb-2">
          API Key Created — Copy it now
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-3 py-2 text-xs text-[#EEEAE0] break-all select-all">
            {newKey}
          </code>
          <button
            onClick={handleCopy}
            className="p-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#9FD8BD] hover:border-[#9FD8BD]/40 transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#9FD8BD]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <button
          onClick={() => setNewKey(null)}
          className="mt-3 text-[10px] text-[#93A096] hover:text-[#EEEAE0] font-medium transition-colors"
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
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#9FD8BD] hover:bg-[rgba(159,216,189,0.1)] text-xs font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Key
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <label
              htmlFor="key-name"
              className="block text-[10px] font-medium text-[#93A096]"
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
              className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-3 py-2 text-[#EEEAE0] placeholder:text-[rgba(238,234,224,0.2)] focus:outline-none focus:border-[#9FD8BD] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="px-4 py-2 bg-[#9FD8BD] hover:bg-[#9FD8BD] text-zinc-950 font-medium text-xs rounded-[999px] transition-all disabled:opacity-50 h-[42px]"
          >
            {pending ? "..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#EEEAE0] text-xs font-medium transition-colors h-[42px]"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
