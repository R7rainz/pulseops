"use client"

import useSWR from "swr"
import { API_URL } from "@/lib/constants";

interface LiveMonitorState {
    status: "UP" | "DOWN"
    latency: number
    statusCode: number
    lastChecked: string
}

const fetcher = async (url: string) => {
    const token = document.cookie.split("; ").find((row) => row.startsWith("pulseops_token"))?.split("=")[1]

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) throw new Error("Failed to fetch live state")
    const json = await res.json();
    return json.data as Record<number, LiveMonitorState>
}

export function useLiveMonitors(workspaceId: number) {
    const { data, error, isLoading } = useSWR(`${API_URL}/api/v1/workspaces/${workspaceId}/monitors/live`, fetcher,
        {
            refreshInterval: 5000,
            revalidateOnFocus: true,
            dedupingInterval: 2000,
        }
    )

    return { liveData: data || {}, isError: error, isLoading }
}
