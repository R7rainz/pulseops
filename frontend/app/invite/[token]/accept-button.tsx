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
        className="w-full bg-[#EEEAE0] hover:bg-[#EEEAE0]/90 text-[#0A0F0C] rounded-[999px] py-4 border-0 transition-all text-label-md font-medium flex items-center justify-center gap-3"
      >
        <UserPlus className="w-5 h-5" />
        Accept Invite to {workspaceName}
      </button>
    </form>
  );
}
