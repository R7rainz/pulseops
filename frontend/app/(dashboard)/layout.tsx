import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";
import Toast from "@/components/Toast";
import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/constants";

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
  let currentUser = { name: "", email: "" };

  try {
    const [wsRes, meRes] = await Promise.all([
      apiFetch(`${API_URL}/api/v1/workspaces`, { token, cookieStore }),
      apiFetch(`${API_URL}/api/v1/auth/me`, { token, cookieStore }),
    ]);

    workspacesStatus = wsRes.status;

    if (wsRes.ok) {
      const json = await wsRes.json();
      workspaces = json.data || [];
    }
    if (meRes.ok) {
      const json = await meRes.json();
      currentUser = json.data || { name: "", email: "" };
    }
  } catch (err) {
    console.error("Layout failed to fetch:", err);
  }

  if (workspacesStatus === 401 || workspacesStatus === 403) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-mono selection:bg-emerald-500/30 selection:text-emerald-400">
      <Sidebar workspaces={workspaces} user={currentUser} />

      <div className="flex-1 min-w-0 bg-zinc-950 relative z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none -z-10" />
        <Toast />
        {children}
      </div>
    </div>
  );
}
