-- CreateTable
CREATE TABLE "WebhookDeliveryLog" (
    "id" SERIAL NOT NULL,
    "webhookId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "isSuccess" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WebhookDeliveryLog" ADD CONSTRAINT "WebhookDeliveryLog_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
