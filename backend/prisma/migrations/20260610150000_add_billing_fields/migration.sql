-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "planTier" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "Workspace" ADD COLUMN "razorpayCustomerId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "razorpaySubId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "subscriptionStatus" TEXT;
