"use client";

import { UserPlus } from "lucide-react";
import { acceptInvite } from "../actions";

export function AcceptInviteButton({
  token,
  workspaceName,
}: {
  token: string;
  workspaceName: string;
}) {
  return (
    <form action={acceptInvite.bind(null, token)}>
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest py-4 border-2 border-transparent transition-all text-sm flex items-center justify-center gap-3"
      >
        <UserPlus className="w-5 h-5" />
        Accept Invite to {workspaceName}
      </button>
    </form>
  );
}
