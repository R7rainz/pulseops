import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";
import Toast from "@/components/Toast";
import AmbientGlow from "@/components/AmbientGlow";
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
    <div className="relative min-h-dvh text-foreground selection:bg-primary/30 lg:flex">
      {/* subtle warm ambient glow behind everything */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <AmbientGlow className="opacity-60" />
      </div>

      <Sidebar workspaces={workspaces} user={currentUser} />

      <main className="relative z-0 min-w-0 flex-1">
        <Toast />
        {children}
      </main>
    </div>
  );
}
