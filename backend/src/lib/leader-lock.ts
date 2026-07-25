import crypto from "node:crypto";
import { redis } from "./redis";

// Everything runs in one process today — API, Kafka consumer, dispatch
// scheduler, heartbeat sweep — so running two API replicas means two
// schedulers double-publishing to Kafka and two heartbeat sweeps racing on the
// same monitors. This makes the periodic jobs safe to run on every replica:
// each tick, exactly one instance wins the lock and does the work.
//
// The lock is deliberately short-lived (roughly one tick) and is NOT renewed:
// if the holder dies mid-tick the lock simply expires and the next tick is
// picked up by whoever wins it. Worst case is a skipped tick, never a stuck
// scheduler.

// Unique per process, so a holder can only release its own lock.
const INSTANCE_ID = crypto.randomUUID();

// Release only if we still hold it — a naive DEL could drop a lock that already
// expired and was re-acquired by another instance mid-tick.
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Runs `fn` only if this instance wins the lock for `name`.
 *
 * Returns the function's result, or `undefined` if another instance held the
 * lock. A Redis failure is treated as "not the leader" — with Redis down we
 * cannot establish exclusivity, and skipping a tick is safer than having every
 * replica dispatch simultaneously.
 */
export async function withLeaderLock<T>(
  name: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const key = `leader-lock:${name}`;

  let acquired: string | null = null;
  try {
    acquired = await redis.set(key, INSTANCE_ID, "PX", ttlMs, "NX");
  } catch (error) {
    console.error(`[LEADER_LOCK] Could not acquire "${name}":`, (error as Error).message);
    return undefined;
  }

  if (!acquired) return undefined;

  try {
    return await fn();
  } finally {
    try {
      await redis.eval(RELEASE_SCRIPT, 1, key, INSTANCE_ID);
    } catch {
      // Expiry will clean it up.
    }
  }
}
