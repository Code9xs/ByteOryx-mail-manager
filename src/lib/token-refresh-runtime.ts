import { getMailSyncService } from "@/server/services";
import { prisma } from "./prisma";
import { listMailboxIds } from "./prisma-mail-store";
import { createTokenRefreshScheduler } from "./token-refresh-scheduler";

let timer: NodeJS.Timeout | null = null;

const scheduler = createTokenRefreshScheduler({
  async refreshAllTokens() {
    const syncService = getMailSyncService();
    const accounts = await listMailboxIds(prisma);
    const results = [];

    for (const account of accounts) {
      try {
        const refreshed = await syncService.refreshMailboxToken(account.id);
        results.push({ email: account.email, expiresAt: refreshed.expiresAt });
      } catch {
        // Individual failures are handled by manual sync/logging paths.
      }
    }

    return results;
  },
  setTimer(callback, ms) {
    timer = setTimeout(callback, ms);
    return timer;
  },
  clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  },
  now: () => new Date()
});

export async function configureTokenRefresh(enabled: boolean) {
  await scheduler.configure(enabled);
}
