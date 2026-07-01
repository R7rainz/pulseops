"use client";

import { useState } from "react";
import { Plus, Globe, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";
import { createMonitor } from "./actions";

type MonitorType = "HTTP" | "HEARTBEAT";

export default function CreateMonitorForm({ workspaceId }: { workspaceId: string }) {
  const [type, setType] = useState<MonitorType>("HTTP");
  const isHeartbeat = type === "HEARTBEAT";

  return (
    <form action={createMonitor} className="space-y-5">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="type" value={type} />

      {/* TYPE TOGGLE */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <TypeOption
          active={!isHeartbeat}
          onClick={() => setType("HTTP")}
          icon={<Globe className="h-4 w-4" />}
          title="HTTP"
          desc="We ping your URL"
        />
        <TypeOption
          active={isHeartbeat}
          onClick={() => setType("HEARTBEAT")}
          icon={<HeartPulse className="h-4 w-4" />}
          title="Heartbeat"
          desc="Your job pings us"
        />
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
            <div className="space-y-1.5 md:col-span-8">
              <label htmlFor="url" className="block text-sm font-medium text-foreground">URL</label>
              <input id="url" name="url" type="text" placeholder="api.example.com" required className="field" />
            </div>
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
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="intervalSeconds" className="block text-sm font-medium text-foreground">Interval (s)</label>
              <input id="intervalSeconds" name="intervalSeconds" type="number" min={30} defaultValue={60} className="field" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <label htmlFor="timeoutMs" className="block text-sm font-medium text-foreground">Timeout (ms)</label>
              <input id="timeoutMs" name="timeoutMs" type="number" min={1000} max={30000} defaultValue={5000} className="field" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <label htmlFor="expectedStatus" className="block text-sm font-medium text-foreground">Expected status</label>
              <input id="expectedStatus" name="expectedStatus" type="number" min={100} max={500} defaultValue={200} className="field" />
            </div>
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
