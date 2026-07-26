// MonitorCheck.id and WebhookDeliveryLog.id are BigInt (an Int4 sequence would
// overflow at check volume). JSON.stringify throws on BigInt by default —
// "Do not know how to serialize a BigInt" — which would 500 every endpoint that
// returns a check row or a delivery log.
//
// Serialize as a JSON *number* while the value fits in a double, so the wire
// format is unchanged for existing clients (these ids were numbers before).
// Beyond 2^53 that would silently lose precision, so fall back to a string —
// a visible type change is far better than a wrong id. At current volumes the
// string branch is unreachable for centuries; it exists so it can never be
// silently wrong.
//
// Imported for side effects from app.ts, before any route is registered.

declare global {
  interface BigInt {
    toJSON(): number | string;
  }
}

if (!("toJSON" in BigInt.prototype)) {
  Object.defineProperty(BigInt.prototype, "toJSON", {
    value: function (this: bigint): number | string {
      return this <= BigInt(Number.MAX_SAFE_INTEGER) &&
        this >= BigInt(Number.MIN_SAFE_INTEGER)
        ? Number(this)
        : this.toString();
    },
    writable: true,
    configurable: true,
  });
}

export {};
