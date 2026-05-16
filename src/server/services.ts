import {
  fetchMessageBody,
  refreshAccessToken,
  syncMessageList
} from "@/lib/graph-client";
import { createMailQueryService } from "@/lib/mail-query-service";
import { createMailSyncService } from "@/lib/mail-sync-service";
import { createMailboxService } from "@/lib/mailbox-service";
import { createPrismaMailSyncStore } from "@/lib/prisma-mail-store";
import { createPrismaSettingsStore } from "@/lib/prisma-settings-store";
import { prisma } from "@/lib/prisma";
import { createPrismaMailboxStore } from "@/lib/prisma-store";
import { getAppSecretKey, getGraphScopes, getGraphTenantId } from "@/lib/env";
import { createSettingsService } from "@/lib/settings-service";

export function getMailboxService() {
  return createMailboxService({
    secretKey: getAppSecretKey(),
    store: createPrismaMailboxStore(prisma)
  });
}

export function getMailQueryService() {
  return createMailQueryService(prisma);
}

export function getMailSyncService() {
  return createMailSyncService({
    secretKey: getAppSecretKey(),
    tenantId: getGraphTenantId(),
    scopes: getGraphScopes(),
    store: createPrismaMailSyncStore(prisma),
    refreshAccessToken,
    syncMessageList,
    fetchMessageBody
  });
}

export function getSettingsService() {
  return createSettingsService(createPrismaSettingsStore(prisma));
}
