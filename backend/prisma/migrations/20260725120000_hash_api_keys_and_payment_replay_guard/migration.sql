-- API keys: stop storing the raw token.
--
-- Existing keys are migrated in place: sha256 the plaintext we already have and
-- derive the display prefix from it, so keys already handed out to users keep
-- working. The raw column is dropped at the end of this migration — after this
-- runs, the plaintext is unrecoverable by design.

ALTER TABLE "ApiKey" ADD COLUMN "keyHash" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN "keyPrefix" TEXT;

-- pgcrypto gives us sha256() in SQL so the backfill needs no application pass.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "ApiKey"
SET
  "keyHash" = encode(digest("key", 'sha256'), 'hex'),
  "keyPrefix" = substring("key" from 1 for 11)
WHERE "keyHash" IS NULL;

ALTER TABLE "ApiKey" ALTER COLUMN "keyHash" SET NOT NULL;
ALTER TABLE "ApiKey" ALTER COLUMN "keyPrefix" SET NOT NULL;

DROP INDEX IF EXISTS "ApiKey_key_key";
ALTER TABLE "ApiKey" DROP COLUMN "key";

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- Replay guard for Razorpay: a payment/event reference can only be applied once.
CREATE TABLE "ProcessedPayment" (
  "id"          SERIAL       NOT NULL,
  "workspaceId" INTEGER      NOT NULL,
  "reference"   TEXT         NOT NULL,
  "kind"        TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProcessedPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcessedPayment_reference_key" ON "ProcessedPayment"("reference");
CREATE INDEX "ProcessedPayment_workspaceId_idx" ON "ProcessedPayment"("workspaceId");

ALTER TABLE "ProcessedPayment"
  ADD CONSTRAINT "ProcessedPayment_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
