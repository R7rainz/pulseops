import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";
import { apiFetch } from "@/lib/apiFetch";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) redirect("/login");

  let workspaces = [];
  let workspacesStatus: number | null = null;

  try {
    const res = await apiFetch("http://127.0.0.1:4000/api/v1/workspaces", {
      token,
      cookieStore,
    });

    workspacesStatus = res.status;

    if (res.ok) {
      const json = await res.json();
      workspaces = json.data || [];
    }
  } catch (err) {
    console.error("Layout failed to fetch workspaces:", err);
  }

  if (workspacesStatus === 401 || workspacesStatus === 403) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-mono selection:bg-emerald-500/30 selection:text-emerald-400">
      <Sidebar workspaces={workspaces} />

      <div className="flex-1 min-w-0 bg-zinc-950 relative z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none -z-10" />
        {children}
      </div>
    </div>
  );
}
