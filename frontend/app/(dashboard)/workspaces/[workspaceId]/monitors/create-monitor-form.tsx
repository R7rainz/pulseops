"use client";

import { useState } from "react";
import { Plus, Globe, HeartPulse, Network, Globe2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { createMonitor } from "./actions";

type MonitorType = "HTTP" | "HEARTBEAT" | "TCP" | "DNS" | "KEYWORD";

const TYPE_OPTIONS: {
  value: MonitorType;
  title: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  { value: "HTTP", title: "HTTP", desc: "We ping your URL", icon: <Globe className="h-4 w-4" /> },
  { value: "KEYWORD", title: "Keyword", desc: "Body must contain text", icon: <Search className="h-4 w-4" /> },
  { value: "TCP", title: "TCP port", desc: "Port accepts connections", icon: <Network className="h-4 w-4" /> },
  { value: "DNS", title: "DNS", desc: "Record resolves correctly", icon: <Globe2 className="h-4 w-4" /> },
  { value: "HEARTBEAT", title: "Heartbeat", desc: "Your job pings us", icon: <HeartPulse className="h-4 w-4" /> },
];

export default function CreateMonitorForm({ workspaceId }: { workspaceId: string }) {
  const [type, setType] = useState<MonitorType>("HTTP");
  const isHeartbeat = type === "HEARTBEAT";
  // HTTP and KEYWORD both make a real HTTP request, so they share the method /
  // timeout / status-matcher fields.
  const isHttpLike = type === "HTTP" || type === "KEYWORD";

  return (
    <form action={createMonitor} className="space-y-5">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="type" value={type} />

      {/* TYPE TOGGLE */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TYPE_OPTIONS.map((option) => (
          <TypeOption
            key={option.value}
            active={type === option.value}
            onClick={() => setType(option.value)}
            icon={option.icon}
            title={option.title}
            desc={option.desc}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
        <div className="space-y-1.5 md:col-span-4">
          <label htmlFor="name" className="block text-sm font-medium text-foreground">Name</label>
          <input id="name" name="name" type="text" placeholder="e.g. API Gateway" required className="field" />
        </div>

        {isHeartbeat ? (
          <>
            <div className="space-y-1.5 md:col-span-4">
              <label htmlFor="intervalSeconds" className="block text-sm font-medium text-foreground">Expected every (s)</label>
              <input id="intervalSeconds" name="intervalSeconds" type="number" min={30} defaultValue={60} className="field" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="gracePeriodSeconds" className="block text-sm font-medium text-foreground">Grace (s)</label>
              <input id="gracePeriodSeconds" name="gracePeriodSeconds" type="number" min={0} defaultValue={60} className="field" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn btn-primary h-11 w-full">
                <Plus className="h-4 w-4" />
                Add monitor
              </button>
            </div>
            <p className="md:col-span-12 text-xs text-muted-foreground">
              A heartbeat monitor waits for your job to check in. If no ping arrives within{" "}
              <span className="text-foreground">interval + grace</span> seconds, it&apos;s marked down and an incident opens.
              You&apos;ll get the ping URL after creating it.
            </p>
          </>
        ) : (
          <>
            <div className={cn("space-y-1.5", type === "TCP" ? "md:col-span-5" : "md:col-span-8")}>
              <label htmlFor="url" className="block text-sm font-medium text-foreground">
                {type === "TCP" || type === "DNS" ? "Host" : "URL"}
              </label>
              <input
                id="url"
                name="url"
                type="text"
                placeholder={type === "TCP" || type === "DNS" ? "db.example.com" : "api.example.com"}
                required
                className="field"
              />
            </div>

            {type === "TCP" && (
              <div className="space-y-1.5 md:col-span-3">
                <label htmlFor="tcpPort" className="block text-sm font-medium text-foreground">Port</label>
                <input id="tcpPort" name="tcpPort" type="number" min={1} max={65535} placeholder="5432" required className="field" />
              </div>
            )}

            {type === "DNS" && (
              <>
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="dnsRecordType" className="block text-sm font-medium text-foreground">Record</label>
                  <select id="dnsRecordType" name="dnsRecordType" defaultValue="A" className="field">
                    {["A", "AAAA", "CNAME", "MX", "TXT", "NS"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="dnsExpectedValue" className="block text-sm font-medium text-foreground">
                    Expected <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input id="dnsExpectedValue" name="dnsExpectedValue" type="text" placeholder="93.184.216.34" className="field" />
                </div>
              </>
            )}

            {type === "KEYWORD" && (
              <>
                <div className="space-y-1.5 md:col-span-3">
                  <label htmlFor="keyword" className="block text-sm font-medium text-foreground">Keyword</label>
                  <input id="keyword" name="keyword" type="text" placeholder="Welcome back" required className="field" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="keywordShouldExist" className="block text-sm font-medium text-foreground">Condition</label>
                  <select id="keywordShouldExist" name="keywordShouldExist" defaultValue="true" className="field">
                    <option value="true">Must be present</option>
                    <option value="false">Must be absent</option>
                  </select>
                </div>
              </>
            )}

            {isHttpLike && (
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="method" className="block text-sm font-medium text-foreground">Method</label>
                <select id="method" name="method" defaultValue="GET" className="field">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="intervalSeconds" className="block text-sm font-medium text-foreground">Interval (s)</label>
              <input id="intervalSeconds" name="intervalSeconds" type="number" min={30} defaultValue={60} className="field" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <label htmlFor="timeoutMs" className="block text-sm font-medium text-foreground">Timeout (ms)</label>
              <input id="timeoutMs" name="timeoutMs" type="number" min={1000} max={30000} defaultValue={5000} className="field" />
            </div>

            {isHttpLike && (
              <div className="space-y-1.5 md:col-span-3">
                <label htmlFor="expectedStatusMatch" className="block text-sm font-medium text-foreground">Expected status</label>
                <input
                  id="expectedStatusMatch"
                  name="expectedStatusMatch"
                  type="text"
                  defaultValue="2xx"
                  placeholder="2xx"
                  className="field"
                />
                <p className="text-[11px] text-muted-foreground">Code, class (2xx), range (200-299) or list (200,204).</p>
              </div>
            )}

            <div className="md:col-span-2">
              <button type="submit" className="btn btn-primary h-11 w-full">
                <Plus className="h-4 w-4" />
                Add monitor
              </button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}

function TypeOption({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-primary/50 bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md border", active ? "border-primary/40 bg-primary/10 text-primary" : "border-border")}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}
