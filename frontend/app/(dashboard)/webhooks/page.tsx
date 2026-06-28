import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/constants";
import { apiFetch } from "@/lib/apiFetch";

export default async function WebhooksPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) redirect("/login");

  const res = await apiFetch(
    `${API_URL}/api/v1/workspaces`,
    { token, cookieStore, cache: "no-store" },
  );

  if (!res.ok) redirect("/login");

  const data = await res.json();
  const workspaces: { id: number; name: string }[] = data.data || [];

  if (workspaces.length === 0) {
    redirect("/workspaces/new");
  }

  redirect(`/workspaces/${workspaces[0].id}/settings`);
}
