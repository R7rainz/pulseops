"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function acceptInvite(
  token: string,
  formData?: FormData,
) {
  const resolvedToken = formData?.get("token") as string || token;

  const cookieStore = await cookies();
  const userToken = cookieStore.get("pulseops_token")?.value;
  if (!userToken) redirect("/login");

  const res = await fetch(
    `http://127.0.0.1:4000/api/v1/invites/${resolvedToken}/accept`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    cookieStore.set("pulseops_toast", JSON.stringify({
      message: data.message || "Failed to accept invite",
      type: "error",
    }), { path: "/", maxAge: 5 });
    redirect("/login");
  }

  const data = await res.json();
  redirect(`/workspaces/${data.data.workspaceId}/monitors`);
}
