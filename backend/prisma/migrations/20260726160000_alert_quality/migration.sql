-- Alert quality: suppression, reminders, snooze, and acknowledgement
-- attribution.
--
-- graceThreshold (consecutive failures) was the only debounce, so a flapping
-- monitor could page over and over, a long outage went silent after the first
-- alert, and ACKNOWLEDGED recorded no who or when.

ALTER TABLE "Monitor"
  ADD COLUMN IF NOT EXISTS "alertCooldownSeconds"    INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS "reminderIntervalSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "mutedUntil"              TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastAlertAt"             TIMESTAMP(3);

ALTER TABLE "Incident"
  ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acknowledgedBy" INTEGER,
  ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);

-- Existing acknowledged incidents have no recorded time; use startedAt as a
-- lower bound rather than inventing one, and leave the actor null since it was
-- never captured.
UPDATE "Incident"
SET "acknowledgedAt" = "startedAt"
WHERE "status" = 'ACKNOWLEDGED' AND "acknowledgedAt" IS NULL;

ALTER TABLE "Incident"
  ADD CONSTRAINT "Incident_acknowledgedBy_fkey"
  FOREIGN KEY ("acknowledgedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Reminder sweep looks for open incidents past their reminder interval.
CREATE INDEX IF NOT EXISTS "Incident_status_lastReminderAt_idx"
  ON "Incident"("status", "lastReminderAt");
