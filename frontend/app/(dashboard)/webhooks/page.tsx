import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

export default async function WebhooksPage() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("pulseops_token");

  if (!tokenCookie?.value) {
    redirect("/login");
  }

  const token = tokenCookie.value;

  const res = await fetch(
    "http://127.0.0.1:4000/api/v1/workspaces/1/webhooks",
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  const rawJson = await res.json();
  const webhooks: Webhook[] = Array.isArray(rawJson.data) ? rawJson.data : [];

  return (
    <main className="p-10 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
            Webhook Integrations
          </h1>
          <p className="text-zinc-400 mt-2">
            Manage your automated alert endpoints.
          </p>
        </div>

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
                    No webhooks configured.
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
