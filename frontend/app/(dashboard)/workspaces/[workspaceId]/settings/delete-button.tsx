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
        className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#C2766B]/50 text-[#C2766B] hover:bg-[rgba(194,118,107,0.1)] text-xs font-medium transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete Workspace
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-[#C2766B] font-medium">
        Are you sure?
      </p>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="px-4 py-2 bg-[#C2766B] hover:bg-[#C2766B] text-zinc-950 font-medium text-xs rounded-[999px] transition-all disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Confirm"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        disabled={pending}
        className="px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#EEEAE0] text-xs font-medium transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
