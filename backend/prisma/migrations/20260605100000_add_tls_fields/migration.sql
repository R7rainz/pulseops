ALTER TABLE "Monitor" ADD COLUMN "tlsIssuer" TEXT;
ALTER TABLE "Monitor" ADD COLUMN "tlsValidTo" TIMESTAMP(3);
ALTER TABLE "Monitor" ADD COLUMN "tlsDaysRemaining" INTEGER;
