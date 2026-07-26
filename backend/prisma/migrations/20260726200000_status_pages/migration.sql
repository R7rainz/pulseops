-- Opt-in public status pages.
--
-- /status/:slug previously auto-exposed every active monitor in a workspace,
-- with no opt-in — a monitor named after an internal hostname became public the
-- moment it was created. Monitors are now published explicitly.

CREATE TABLE "StatusPage" (
  "id"          SERIAL       NOT NULL,
  "workspaceId" INTEGER      NOT NULL,
  "slug"        TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "description" TEXT,
  "isPublic"    BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StatusPage_workspaceId_key" ON "StatusPage"("workspaceId");
CREATE UNIQUE INDEX "StatusPage_slug_key" ON "StatusPage"("slug");

ALTER TABLE "StatusPage"
  ADD CONSTRAINT "StatusPage_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StatusPageMonitor" (
  "id"           SERIAL  NOT NULL,
  "statusPageId" INTEGER NOT NULL,
  "monitorId"    INTEGER NOT NULL,
  "displayName"  TEXT,
  "position"     INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "StatusPageMonitor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StatusPageMonitor_statusPageId_monitorId_key"
  ON "StatusPageMonitor"("statusPageId", "monitorId");
CREATE INDEX "StatusPageMonitor_statusPageId_idx" ON "StatusPageMonitor"("statusPageId");

ALTER TABLE "StatusPageMonitor"
  ADD CONSTRAINT "StatusPageMonitor_statusPageId_fkey"
  FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StatusPageMonitor"
  ADD CONSTRAINT "StatusPageMonitor_monitorId_fkey"
  FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every workspace that has a page today keeps one, published, with
-- exactly the monitors that were already visible. This preserves existing
-- public URLs rather than silently taking them offline on deploy — the opt-in
-- applies to monitors created from here on.
INSERT INTO "StatusPage" ("workspaceId", "slug", "title", "isPublic", "createdAt", "updatedAt")
SELECT w."id", w."slug", w."name", true, NOW(), NOW()
FROM "Workspace" w
WHERE EXISTS (SELECT 1 FROM "Monitor" m WHERE m."workspaceId" = w."id" AND m."isActive");

INSERT INTO "StatusPageMonitor" ("statusPageId", "monitorId", "position")
SELECT sp."id", m."id", ROW_NUMBER() OVER (PARTITION BY sp."id" ORDER BY m."name")
FROM "StatusPage" sp
JOIN "Monitor" m ON m."workspaceId" = sp."workspaceId" AND m."isActive";
