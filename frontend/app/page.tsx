import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Webhook {
  id: number;
  url: string;
  isActive: boolean;
  createdAt: string;
}

interface Monitor {
  id: number;
  name: string;
  url: string;
  status: "UP" | "DOWN" | "PAUSED";
  lastCheckedAt: string | null;
}

export default async function Home() {
  // ⚠️ Keep your hardcoded token here for now
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc4MDA3ODkxMSwiZXhwIjoxNzgwMDc5ODExfQ.09wu04AX6VdOc2FtFj67bezIlA9JxATQwwMlAYHAeZg";

  // Fetch both Webhooks AND Monitors in parallel for maximum speed
  const [webhooksRes, monitorsRes] = await Promise.all([
    fetch("http://localhost:4000/api/v1/workspaces/1/webhooks", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
    // Fix this URL right here 👇 (added /workspaces/1)
    fetch("http://localhost:4000/api/v1/workspaces/1/monitors", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  const webhooksJson = await webhooksRes.json();
  const monitorsJson = await monitorsRes.json();

  const webhooks: Webhook[] = Array.isArray(webhooksJson.data)
    ? webhooksJson.data
    : [];
  const monitors: Monitor[] = Array.isArray(monitorsJson.data)
    ? monitorsJson.data
    : [];

  console.log("RAW MONITORS API RESPONSE:", monitorsJson);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 p-10 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Webhook Integrations
          </h1>
          <p className="text-zinc-400 mt-2">
            Manage your automated alert endpoints for Workspace 1.
          </p>
        </div>
        {/* --- Monitors Grid Section --- */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-zinc-200">
            Active Monitors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitors.length === 0 ? (
              <div className="col-span-full p-6 border border-zinc-800 rounded-lg bg-zinc-900/30 text-zinc-500">
                No monitors configured.
              </div>
            ) : (
              monitors.map((monitor) => (
                <div
                  key={monitor.id}
                  className="p-5 border border-zinc-800 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors flex flex-col justify-between h-32"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-zinc-200">
                        {monitor.name}
                      </h3>
                      <p
                        className="text-xs text-zinc-500 truncate max-w-[180px]"
                        title={monitor.url}
                      >
                        {monitor.url}
                      </p>
                    </div>
                    {monitor.status === "UP" && (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                    {monitor.status === "DOWN" && (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {monitor.lastCheckedAt
                      ? `Last checked: ${new Date(monitor.lastCheckedAt).toLocaleTimeString()}`
                      : "Waiting for first check..."}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* --- End Monitors Grid --- */}

        {/* The shadcn/ui Data Table */}
        <div className="rounded-md border border-zinc-800 bg-zinc-900/50">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Endpoint URL</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400 text-right">
                  Created At
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.length === 0 ? (
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableCell
                    colSpan={3}
                    className="text-center text-zinc-500 h-24"
                  >
                    No webhooks configured or unable to fetch data.
                  </TableCell>
                </TableRow>
              ) : (
                webhooks.map((webhook) => (
                  <TableRow
                    key={webhook.id}
                    className="border-zinc-800 hover:bg-zinc-900/50"
                  >
                    <TableCell className="font-medium text-zinc-300">
                      {webhook.url}
                    </TableCell>
                    <TableCell>
                      {webhook.isActive ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-zinc-500 border-zinc-700 bg-zinc-800/50"
                        >
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-zinc-500">
                      {new Date(webhook.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}
