import { prisma } from "./prisma";
import { getMailSyncService } from "@/server/services";

const globalScheduler = globalThis as unknown as {
  byteoryxSchedulerStarted?: boolean;
};

export function startScheduler() {
  if (globalScheduler.byteoryxSchedulerStarted) return;
  globalScheduler.byteoryxSchedulerStarted = true;

  setInterval(
    async () => {
      const accounts = await prisma.mailboxAccount.findMany({
        select: { id: true }
      });
      const syncService = getMailSyncService();
      for (const account of accounts) {
        try {
          await syncService.syncMailbox(account.id);
        } catch {
          // Per-account errors are recorded by the sync service.
        }
      }
    },
    50 * 60 * 1000
  );
}
