import Link from "next/link";
import { logoutUser } from "./actions";
import { Activity, Webhook, LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-mono">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/40 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            PulseOps
          </h2>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/monitors"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/80 transition-colors text-zinc-300 hover:text-zinc-50"
          >
            <Activity size={18} className="text-emerald-400" />
            Monitors
          </Link>
          <Link
            href="/webhooks"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/80 transition-colors text-zinc-300 hover:text-zinc-50"
          >
            <Webhook size={18} className="text-indigo-400" />
            Webhooks
          </Link>
        </nav>

        {/* Real Logout Action */}
        <div className="p-4 border-t border-zinc-800">
          <form action={logoutUser}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2 rounded-md hover:bg-red-500/10 hover:text-red-400 transition-colors text-zinc-500 cursor-pointer"
            >
              <LogOut size={18} />
              Disconnect
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
