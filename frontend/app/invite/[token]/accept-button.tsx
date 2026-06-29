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
      <button type="submit" className="btn btn-primary w-full py-3">
        <UserPlus className="h-4 w-4" />
        Join {workspaceName}
      </button>
    </form>
  );
}
