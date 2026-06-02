"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteWorkspace } from "../../../actions";

export default function DeleteWorkspaceButton({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setPending(true);
    const form = new FormData();
    form.set("workspaceId", workspaceId);

    try {
      const result = await deleteWorkspace(form);
      if (result?.success) {
        router.push("/");
      } else {
        setPending(false);
        setConfirm(false);
      }
    } catch {
      setPending(false);
      setConfirm(false);
    }
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase tracking-widest transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete Workspace
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-red-400 uppercase tracking-widest font-bold">
        Are you sure?
      </p>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="px-4 py-2 bg-red-500 hover:bg-red-400 text-zinc-950 font-bold uppercase tracking-widest text-xs border-2 border-transparent transition-all disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Confirm"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        disabled={pending}
        className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-400 hover:text-zinc-100 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
