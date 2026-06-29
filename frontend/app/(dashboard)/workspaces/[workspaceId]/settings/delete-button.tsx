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
      <button onClick={() => setConfirm(true)} className="btn btn-danger">
        <Trash2 className="h-4 w-4" /> Delete workspace
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm font-medium text-down">Are you sure? This can’t be undone.</p>
      <button onClick={handleDelete} disabled={pending} className="btn btn-danger">
        {pending ? "Deleting…" : "Confirm delete"}
      </button>
      <button onClick={() => setConfirm(false)} disabled={pending} className="btn btn-ghost">
        Cancel
      </button>
    </div>
  );
}
