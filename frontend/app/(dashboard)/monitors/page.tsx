import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createMonitor } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface Monitor {
  id: number;
  name: string;
  url: string;
  status: "UP" | "DOWN" | "PAUSED";
  lastCheckedAt: string | null;
}

export default async function MonitorsPage() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("pulseops_token");

  if (!tokenCookie?.value) {
    redirect("/login");
  }

  const token = tokenCookie.value;
  let monitors: Monitor[] = [];
  let workspaceId = "1"; // Fallback default

  try {
    // 1. Fetch the user's workspaces dynamically
    const workspaceRes = await fetch(
      "http://127.0.0.1:4000/api/v1/workspaces",
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    if (workspaceRes.ok) {
      const workspaceJson = await workspaceRes.json();
      const workspaces = workspaceJson.data || workspaceJson;

      if (Array.isArray(workspaces) && workspaces.length > 0) {
        workspaceId = workspaces[0].id.toString();
      }
    }

    // 2. Inject the dynamic workspaceId into the monitors endpoint
    const res = await fetch(
      `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/monitors`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    if (res.ok) {
      const rawJson = await res.json();
      // Unpack the data safely whether it's wrapped in .data, .monitors, or raw
      const extractedMonitors = rawJson.data || rawJson.monitors || rawJson;

      monitors = Array.isArray(extractedMonitors) ? extractedMonitors : [];
    } else {
      console.error(`Backend returned status code: ${res.status}`);
      monitors = [];
    }
  } catch (error) {
    console.error("Failed to fetch dynamic workspace data:", error);
    monitors = []; // Graceful fallback on network crash
  }

  return (
    <main className="p-10 font-mono text-zinc-50">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              PulseOps Dashboard
            </h1>
            <p className="text-zinc-400 mt-2">
              Overview of your workspace health and active monitors.
            </p>
          </div>
        </div>

        {/* --- Create Monitor Action Form --- */}
        <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/40 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-200">
              Register New Endpoint
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add a target URL to start tracking uptime performance logs.
            </p>
          </div>

          <form
            action={createMonitor}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          >
            {/* 🚨 THE NEW HIDDEN INPUT 🚨 */}
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs text-zinc-400">
                Monitor Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Production API"
                required
                className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url" className="text-xs text-zinc-400">
                Target URL
              </Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="https://api.example.com/health"
                required
                className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium"
            >
              Add Monitor
            </Button>
          </form>
        </div>

        {/* --- Monitors Grid Section --- */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-200">
            Active Monitors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitors.length === 0 ? (
              <div className="col-span-full p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10 text-zinc-500">
                No targets monitored. Submit the form above to deploy your first
                checkpoint.
              </div>
            ) : (
              monitors.map((monitor) => (
                <Link
                  href={`/monitors/${monitor.id}`}
                  key={monitor.id}
                  className="p-5 border border-zinc-800 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-200 flex flex-col justify-between h-32 block"
                >
                  <div className="flex justify-between items-start gap-2 w-full">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-zinc-200 truncate">
                        {monitor.name}
                      </h3>
                      <p
                        className="text-xs text-zinc-500 truncate"
                        title={monitor.url}
                      >
                        {monitor.url}
                      </p>
                    </div>
                    {monitor.status === "UP" && (
                      <span className="flex h-3 w-3 relative flex-shrink-0 mt-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                    {monitor.status === "DOWN" && (
                      <span className="flex h-3 w-3 relative flex-shrink-0 mt-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                      </span>
                    )}
                    {monitor.status === "PAUSED" && (
                      <span className="h-3 w-3 rounded-full bg-zinc-600 flex-shrink-0 mt-1"></span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {monitor.lastCheckedAt
                      ? `Last checked: ${new Date(monitor.lastCheckedAt).toLocaleTimeString()}`
                      : "Waiting for first check..."}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
