"use client"

import useSWR from "swr"

interface LiveMonitorState {
    status: "UP" | "DOWN"
    latency: number
    statusCode: number
    lastChecked: string
}

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to fetch live state")
    const json = await res.json();
    return json.data as Record<number, LiveMonitorState>
}

export function useLiveMonitors(workspaceId: number) {
    const { data, error, isLoading } = useSWR(`/api/monitors/live?workspaceId=${workspaceId}`, fetcher,
        {
            refreshInterval: 5000,
            revalidateOnFocus: true,
            dedupingInterval: 2000,
        }
    )

    return { liveData: data || {}, isError: error, isLoading }
}
