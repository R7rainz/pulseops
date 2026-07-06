import { useCallback, useEffect, useRef, useState } from "react";

export interface PollState<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  /** True while a refresh is in flight after the first load. */
  refreshing: boolean;
  /** Timestamp (ms) of the last successful load, or undefined. */
  updatedAt: number | undefined;
  refresh: () => void;
}

/**
 * Fetches `fn` on mount and every `intervalMs`, plus on-demand via `refresh`.
 * The latest `fn` is always used (kept in a ref) so callers can close over
 * changing state without resetting the interval.
 */
export function usePoll<T>(fn: () => Promise<T>, intervalMs: number): PollState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>();

  const fnRef = useRef(fn);
  fnRef.current = fn;
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const d = await fnRef.current();
      setData(d);
      setError(undefined);
      setUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  return { data, error, loading, refreshing, updatedAt, refresh: load };
}

/** A monotonically increasing tick every `ms`, to drive relative-time re-renders. */
export function useClock(ms = 1000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return tick;
}
