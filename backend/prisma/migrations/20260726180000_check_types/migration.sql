-- Additional check types. HTTP + HEARTBEAT were the only options; TCP port,
-- DNS record and body-keyword checks cover most of what's actually missing.

ALTER TYPE "MonitorType" ADD VALUE IF NOT EXISTS 'TCP';
ALTER TYPE "MonitorType" ADD VALUE IF NOT EXISTS 'DNS';
ALTER TYPE "MonitorType" ADD VALUE IF NOT EXISTS 'KEYWORD';

ALTER TABLE "Monitor"
  -- expectedStatus was a single Int, so "any 2xx" was inexpressible. NULL here
  -- means "fall back to expectedStatus", keeping existing monitors unchanged.
  ADD COLUMN IF NOT EXISTS "expectedStatusMatch" TEXT,
  ADD COLUMN IF NOT EXISTS "tcpPort"             INTEGER,
  ADD COLUMN IF NOT EXISTS "dnsRecordType"       TEXT,
  ADD COLUMN IF NOT EXISTS "dnsExpectedValue"    TEXT,
  ADD COLUMN IF NOT EXISTS "keyword"             TEXT,
  ADD COLUMN IF NOT EXISTS "keywordShouldExist"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sslWarningDays"      INTEGER;
