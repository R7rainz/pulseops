-- Scale work for the check pipeline.
--
-- 1. MonitorCheck / WebhookDeliveryLog primary keys Int4 -> Int8.
--    An Int4 sequence tops out at 2,147,483,647. At the 30s minimum interval a
--    single monitor writes ~2.9M checks/year, so ~1k monitors would overflow
--    this within a year. ALTER TYPE rewrites the table and takes an ACCESS
--    EXCLUSIVE lock — on a large existing table run this in a maintenance
--    window (a zero-downtime alternative is a new BigInt column backfilled in
--    batches, then swapped).
ALTER TABLE "MonitorCheck" ALTER COLUMN "id" TYPE BIGINT;
ALTER SEQUENCE "MonitorCheck_id_seq" AS BIGINT;

ALTER TABLE "WebhookDeliveryLog" ALTER COLUMN "id" TYPE BIGINT;
ALTER SEQUENCE "WebhookDeliveryLog_id_seq" AS BIGINT;

-- 2. Indexes matching the actual query shapes.
--    Every hot read is "this monitor, ordered by checkedAt" or "these monitors,
--    since T". The bare monitorId index forced a sort over the monitor's whole
--    history; the composite serves both patterns.
CREATE INDEX IF NOT EXISTS "MonitorCheck_monitorId_checkedAt_idx"
  ON "MonitorCheck"("monitorId", "checkedAt");
DROP INDEX IF EXISTS "MonitorCheck_monitorId_idx";

-- WebhookDeliveryLog previously had no index at all — the delivery log view was
-- a sequential scan over an unbounded table.
CREATE INDEX IF NOT EXISTS "WebhookDeliveryLog_webhookId_createdAt_idx"
  ON "WebhookDeliveryLog"("webhookId", "createdAt");

-- Incident lists are always ordered by startedAt desc.
CREATE INDEX IF NOT EXISTS "Incident_startedAt_idx" ON "Incident"("startedAt");

-- 3. Scheduling columns. nextCheckAt lets the dispatcher select exactly the due
--    monitors instead of loading every active monitor and filtering in Node.
ALTER TABLE "Monitor" ADD COLUMN IF NOT EXISTS "nextCheckAt" TIMESTAMP(3);
ALTER TABLE "Monitor" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Monitor_isActive_nextCheckAt_idx"
  ON "Monitor"("isActive", "nextCheckAt");

-- Seed nextCheckAt so existing monitors become due immediately rather than
-- never (a NULL nextCheckAt is treated as due by the scheduler, but seeding
-- keeps the index selective).
UPDATE "Monitor"
SET "nextCheckAt" = COALESCE("lastCheckedAt", NOW()) + ("intervalSeconds" || ' seconds')::interval
WHERE "nextCheckAt" IS NULL;

-- 4. Daily rollups. Long-range views read these instead of scanning raw checks,
--    which is what makes retention safe to run.
CREATE TABLE IF NOT EXISTS "MonitorCheckDaily" (
  "id"             BIGSERIAL    NOT NULL,
  "monitorId"      INTEGER      NOT NULL,
  "day"            DATE         NOT NULL,
  "totalChecks"    INTEGER      NOT NULL,
  "upChecks"       INTEGER      NOT NULL,
  "downChecks"     INTEGER      NOT NULL,
  "degradedChecks" INTEGER      NOT NULL,
  "avgResponseMs"  INTEGER,
  "minResponseMs"  INTEGER,
  "maxResponseMs"  INTEGER,
  "p50ResponseMs"  INTEGER,
  "p95ResponseMs"  INTEGER,
  "p99ResponseMs"  INTEGER,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MonitorCheckDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonitorCheckDaily_monitorId_day_key"
  ON "MonitorCheckDaily"("monitorId", "day");
CREATE INDEX IF NOT EXISTS "MonitorCheckDaily_day_idx" ON "MonitorCheckDaily"("day");

ALTER TABLE "MonitorCheckDaily"
  ADD CONSTRAINT "MonitorCheckDaily_monitorId_fkey"
  FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. At most one OPEN/ACKNOWLEDGED incident per monitor. Without this, two
--    concurrent check results racing on the same monitor can each decide to
--    open an incident.
--
--    Existing duplicates have to go first, or the index cannot be built. Keep
--    the oldest active incident per monitor (it has the true outage start) and
--    resolve the rest rather than deleting, so no history is lost.
UPDATE "Incident" i
SET "status" = 'RESOLVED',
    "resolvedAt" = COALESCE(i."resolvedAt", NOW())
WHERE i."status" IN ('OPEN', 'ACKNOWLEDGED')
  AND i."id" <> (
    SELECT keeper."id"
    FROM "Incident" keeper
    WHERE keeper."monitorId" = i."monitorId"
      AND keeper."status" IN ('OPEN', 'ACKNOWLEDGED')
    ORDER BY keeper."startedAt" ASC, keeper."id" ASC
    LIMIT 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS "Incident_one_active_per_monitor"
  ON "Incident"("monitorId")
  WHERE "status" IN ('OPEN', 'ACKNOWLEDGED');
