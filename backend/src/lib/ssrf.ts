import dns from "node:dns/promises";
import net from "node:net";

// Guards outbound requests to user-supplied URLs (monitor targets, webhook
// endpoints). Without this, "monitor this URL" is a request forgery primitive:
// the caller picks the host, we make the request from inside the network, and
// the status code + latency come back to them — enough to reach cloud metadata
// (169.254.169.254), hit internal admin ports, or port-scan the private range.
//
// Self-hosters legitimately monitor internal hosts, so the whole guard can be
// switched off with ALLOW_PRIVATE_TARGETS=1. It is ON by default because the
// safe default matters more than the convenient one.

export class BlockedTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedTargetError";
  }
}

export function privateTargetsAllowed(): boolean {
  return process.env.ALLOW_PRIVATE_TARGETS === "1";
}

// IPv4 ranges that must never be reachable from a user-supplied URL.
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local — cloud metadata lives here
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + broadcast

  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0]; // strip zone index

  if (addr === "::" || addr === "::1") return true; // unspecified / loopback
  if (addr.startsWith("fe80")) return true; // link-local
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique-local
  if (addr.startsWith("ff")) return true; // multicast

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible — defer to the v4 rules
  // so ::ffff:169.254.169.254 can't slip past.
  const mapped = addr.match(/::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);

  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return true; // not a parseable IP — refuse
}

/**
 * Validates a user-supplied URL and resolves it to a set of safe addresses.
 *
 * Must be called immediately before the request, not only at save time: DNS
 * answers change, and a host that resolved publicly when the monitor was
 * created can point at 127.0.0.1 by the time we check it (DNS rebinding).
 *
 * Returns the resolved addresses so callers that can pin the connection do so
 * against the same answer we validated, closing the TOCTOU window.
 */
export async function assertPublicUrl(rawUrl: string): Promise<string[]> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BlockedTargetError("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedTargetError(
      `Unsupported protocol "${url.protocol}" — only http and https are allowed`,
    );
  }

  if (url.username || url.password) {
    throw new BlockedTargetError("Credentials in the URL are not allowed");
  }

  if (privateTargetsAllowed()) return [];

  const hostname = url.hostname.replace(/^\[|\]$/g, ""); // unwrap [::1]

  // A literal IP needs no lookup — check it directly.
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new BlockedTargetError(
        `Target address ${hostname} is in a private or reserved range`,
      );
    }
    return [hostname];
  }

  let resolved: Array<{ address: string; family: number }>;
  try {
    resolved = await dns.lookup(hostname, { all: true });
  } catch {
    throw new BlockedTargetError(`Could not resolve host "${hostname}"`);
  }

  if (resolved.length === 0) {
    throw new BlockedTargetError(`Could not resolve host "${hostname}"`);
  }

  // Every answer must be public. A host that returns one public and one private
  // address would otherwise be usable by retrying until the private one is
  // picked, so this is deliberately all-or-nothing.
  for (const { address } of resolved) {
    if (isBlockedAddress(address)) {
      throw new BlockedTargetError(
        `Host "${hostname}" resolves to ${address}, which is in a private or reserved range`,
      );
    }
  }

  return resolved.map((r) => r.address);
}

/**
 * Same checks, boolean result — for validation paths that want to reject a URL
 * without throwing (e.g. Zod refinements).
 */
export async function isPublicUrl(rawUrl: string): Promise<boolean> {
  try {
    await assertPublicUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}
