import dns from "node:dns/promises";
import net from "node:net";
import type { Monitor } from "../../generated/prisma/client";
import { assertPublicUrl } from "../../lib/ssrf";

// Node-side implementations of the non-HTTP check types, used by the on-demand
// "check now" path. The scheduled path runs the Go engine's equivalents in
// workers/ping-engine/engine/probes.go — the two must stay behaviourally
// aligned, so the pass/fail rules here mirror that file deliberately.

export type ProbeOutcome = {
  isUp: boolean;
  latencyMs: number;
  errorMessage: string | null;
};

// Monitor URLs are stored with a scheme (the create form prepends https://),
// but TCP and DNS checks are host-based.
export function hostFromTarget(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname) return parsed.hostname;
  } catch {
    /* not a URL — fall through */
  }
  return trimmed.replace(/^\[|\]$/g, "").split(":")[0];
}

export async function probeTcp(monitor: Monitor): Promise<ProbeOutcome> {
  const start = performance.now();
  const host = hostFromTarget(monitor.url);
  const port = monitor.tcpPort;

  if (!port) {
    return { isUp: false, latencyMs: 0, errorMessage: "TCP check requires a port" };
  }

  try {
    await assertPublicUrl(`tcp://${host}:${port}`.replace("tcp://", "https://"));
  } catch (error) {
    return {
      isUp: false,
      latencyMs: Math.round(performance.now() - start),
      errorMessage: `Blocked: ${(error as Error).message}`,
    };
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (outcome: ProbeOutcome) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(outcome);
    };

    socket.setTimeout(monitor.timeoutMs);
    socket.once("connect", () =>
      finish({ isUp: true, latencyMs: Math.round(performance.now() - start), errorMessage: null }),
    );
    socket.once("timeout", () =>
      finish({
        isUp: false,
        latencyMs: Math.round(performance.now() - start),
        errorMessage: `Connection to ${host}:${port} timed out`,
      }),
    );
    socket.once("error", (error) =>
      finish({
        isUp: false,
        latencyMs: Math.round(performance.now() - start),
        errorMessage: `Connection failed: ${error.message}`,
      }),
    );

    socket.connect(port, host);
  });
}

export async function probeDns(monitor: Monitor): Promise<ProbeOutcome> {
  const start = performance.now();
  const host = hostFromTarget(monitor.url);
  const recordType = (monitor.dnsRecordType || "A").toUpperCase();

  try {
    const answers = await resolveRecords(host, recordType);
    const latencyMs = Math.round(performance.now() - start);

    if (answers.length === 0) {
      return { isUp: false, latencyMs, errorMessage: `No ${recordType} records found for ${host}` };
    }

    const expected = monitor.dnsExpectedValue?.trim();
    if (expected) {
      const matched = answers.some(
        (answer) =>
          answer.toLowerCase() === expected.toLowerCase() || answer.includes(expected),
      );
      if (!matched) {
        return {
          isUp: false,
          latencyMs,
          errorMessage: `${recordType} record for ${host} is ${answers.join(", ")}, expected ${expected}`,
        };
      }
    }

    return { isUp: true, latencyMs, errorMessage: null };
  } catch (error) {
    return {
      isUp: false,
      latencyMs: Math.round(performance.now() - start),
      errorMessage: `DNS lookup failed for ${host}: ${(error as Error).message}`,
    };
  }
}

async function resolveRecords(host: string, recordType: string): Promise<string[]> {
  switch (recordType) {
    case "A":
      return dns.resolve4(host);
    case "AAAA":
      return dns.resolve6(host);
    case "CNAME":
      return dns.resolveCname(host);
    case "NS":
      return dns.resolveNs(host);
    case "MX":
      return (await dns.resolveMx(host)).map((mx) => mx.exchange);
    case "TXT":
      return (await dns.resolveTxt(host)).map((chunks) => chunks.join(""));
    default:
      throw new Error(`Unsupported DNS record type "${recordType}"`);
  }
}

/**
 * Evaluates a response code against the monitor's expectation.
 *
 * Accepts an exact code, a class ("2xx"), an inclusive range ("200-299"), or a
 * comma-separated list. Falls back to the legacy single `expectedStatus` when
 * no matcher is configured, so existing monitors behave exactly as before.
 */
export function statusMatches(code: number, monitor: Monitor): boolean {
  const spec = monitor.expectedStatusMatch?.trim();
  if (!spec) return code === (monitor.expectedStatus || 200);

  return spec.split(",").some((rawPart) => {
    const part = rawPart.trim().toLowerCase();
    if (!part) return false;

    if (/^\dxx$/.test(part)) {
      return Math.floor(code / 100) === Number(part[0]);
    }

    if (part.includes("-")) {
      const [lo, hi] = part.split("-").map((n) => Number(n.trim()));
      return Number.isFinite(lo) && Number.isFinite(hi) && code >= lo && code <= hi;
    }

    return code === Number(part);
  });
}
