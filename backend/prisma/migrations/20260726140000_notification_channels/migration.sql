-- Alert channels. Until now the only transport was a generic HTTP webhook
-- carrying a PulseOps-shaped payload, so there was no email-on-incident and no
-- way to point PulseOps at Slack/Discord/PagerDuty and have it render.

CREATE TYPE "NotificationChannelType" AS ENUM ('EMAIL', 'SLACK', 'DISCORD', 'PAGERDUTY', 'WEBHOOK');

CREATE TABLE "NotificationChannel" (
  "id"              SERIAL                    NOT NULL,
  "workspaceId"     INTEGER                   NOT NULL,
  "type"            "NotificationChannelType" NOT NULL,
  "name"            TEXT                      NOT NULL,
  "config"          JSONB                     NOT NULL,
  "events"          TEXT[]                    NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive"        BOOLEAN                   NOT NULL DEFAULT true,
  "failureCount"    INTEGER                   NOT NULL DEFAULT 0,
  "disabledUntil"   TIMESTAMP(3),
  "lastDeliveredAt" TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)              NOT NULL,

  CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationChannel_workspaceId_idx" ON "NotificationChannel"("workspaceId");

ALTER TABLE "NotificationChannel"
  ADD CONSTRAINT "NotificationChannel_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationDeliveryLog" (
  "id"             BIGSERIAL    NOT NULL,
  "channelId"      INTEGER      NOT NULL,
  "event"          TEXT         NOT NULL,
  "isSuccess"      BOOLEAN      NOT NULL,
  "responseStatus" INTEGER,
  "detail"         TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationDeliveryLog_channelId_createdAt_idx"
  ON "NotificationDeliveryLog"("channelId", "createdAt");

ALTER TABLE "NotificationDeliveryLog"
  ADD CONSTRAINT "NotificationDeliveryLog_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "NotificationChannel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Deliberately NOT importing existing WebhookEndpoint rows.
--
-- The legacy webhook path (WebhookEndpoint + sendWebhookNotifications) keeps
-- running unchanged, so existing endpoints continue to fire exactly as before.
-- Copying them into NotificationChannel as well would double-deliver every
-- alert, since both paths run on incident open/resolve. Channels are purely
-- additive; a user who wants their webhook managed as a channel can recreate it
-- and delete the legacy endpoint.
