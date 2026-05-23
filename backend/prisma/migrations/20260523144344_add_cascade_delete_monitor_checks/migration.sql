-- DropForeignKey
ALTER TABLE "MonitorCheck" DROP CONSTRAINT "MonitorCheck_monitorId_fkey";

-- AddForeignKey
ALTER TABLE "MonitorCheck" ADD CONSTRAINT "MonitorCheck_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
