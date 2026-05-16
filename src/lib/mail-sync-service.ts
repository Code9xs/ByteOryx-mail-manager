import { decryptSecret, encryptSecret } from "./crypto";
import type {
  GraphMailMessage,
  refreshAccessToken as refreshTokenFn,
  syncMessageList as syncListFn,
  fetchMessageBody as fetchBodyFn
} from "./graph-client";

export type SyncAccount = {
  id: string;
  email: string;
  clientId: string;
  refreshTokenEncrypted: string;
  accessTokenEncrypted?: string | null;
  accessTokenExpiresAt?: Date | null;
};

export type MailSyncStore = {
  getAccountById(id: string): Promise<SyncAccount | null>;
  getAccountByEmail(email: string): Promise<SyncAccount | null>;
  updateTokens(
    id: string,
    data: {
      refreshTokenEncrypted: string;
      accessTokenEncrypted: string;
      accessTokenExpiresAt: Date;
    }
  ): Promise<void>;
  upsertMessages(mailboxId: string, messages: GraphMailMessage[]): Promise<void>;
  updateSyncStatus(id: string, status: string): Promise<void>;
  addSyncLog(data: {
    mailboxId: string;
    type: string;
    status: string;
    message?: string;
  }): Promise<void>;
  findMessage(
    email: string,
    graphId: string
  ): Promise<
    | {
        id: string;
        graphId: string;
        mailbox: SyncAccount;
        bodyCache?: {
          contentType: string;
          content: string;
          fetchedAt: Date;
        } | null;
      }
    | null
  >;
  cacheBody(
    messageId: string,
    data: { contentType: string; content: string }
  ): Promise<{ contentType: string; content: string; fetchedAt: Date }>;
};

export function createMailSyncService({
  secretKey,
  tenantId,
  scopes,
  store,
  refreshAccessToken,
  syncMessageList,
  fetchMessageBody
}: {
  secretKey: string;
  tenantId: string;
  scopes?: string;
  store: MailSyncStore;
  refreshAccessToken: typeof refreshTokenFn;
  syncMessageList: typeof syncListFn;
  fetchMessageBody: typeof fetchBodyFn;
}) {
  async function ensureAccessToken(account: SyncAccount): Promise<string> {
    if (
      account.accessTokenEncrypted &&
      account.accessTokenExpiresAt &&
      account.accessTokenExpiresAt.getTime() > Date.now() + 5 * 60 * 1000
    ) {
      return decryptSecret(account.accessTokenEncrypted, secretKey);
    }

    const refreshed = await refreshAccessToken({
      clientId: account.clientId,
      refreshToken: decryptSecret(account.refreshTokenEncrypted, secretKey),
      tenantId,
      scopes
    });

    await store.updateTokens(account.id, {
      accessTokenEncrypted: encryptSecret(refreshed.accessToken, secretKey),
      refreshTokenEncrypted: encryptSecret(refreshed.refreshToken, secretKey),
      accessTokenExpiresAt: refreshed.expiresAt
    });

    await store.addSyncLog({
      mailboxId: account.id,
      type: "token_refresh",
      status: "ok"
    });

    return refreshed.accessToken;
  }

  return {
    async syncMailboxByEmail(email: string) {
      const account = await store.getAccountByEmail(email);
      if (!account) throw new Error("Mailbox account not found");
      await this.syncMailbox(account.id);
    },

    async refreshMailboxToken(accountId: string) {
      const account = await store.getAccountById(accountId);
      if (!account) throw new Error("Mailbox account not found");
      const accessToken = await ensureAccessToken({
        ...account,
        accessTokenExpiresAt: null,
        accessTokenEncrypted: null
      });
      const updated = await store.getAccountById(accountId);
      return {
        accessToken,
        expiresAt: updated?.accessTokenExpiresAt ?? new Date()
      };
    },

    async syncMailbox(accountId: string) {
      const account = await store.getAccountById(accountId);
      if (!account) throw new Error("Mailbox account not found");

      await store.updateSyncStatus(account.id, "syncing");
      try {
        const accessToken = await ensureAccessToken(account);
        const messages = await syncMessageList(accessToken);
        await store.upsertMessages(account.id, messages);
        await store.updateSyncStatus(account.id, "ok");
        await store.addSyncLog({
          mailboxId: account.id,
          type: "mail_sync",
          status: "ok",
          message: `${messages.length} messages synced`
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await store.updateSyncStatus(account.id, "error");
        await store.addSyncLog({
          mailboxId: account.id,
          type: "mail_sync",
          status: "error",
          message
        });
        throw error;
      }
    },

    async getMessageDetail(email: string, graphId: string) {
      const message = await store.findMessage(email, graphId);
      if (!message) throw new Error("Mail message not found");

      if (message.bodyCache) {
        return { message, body: message.bodyCache };
      }

      const accessToken = await ensureAccessToken(message.mailbox);
      const body = await fetchMessageBody(accessToken, graphId);
      const cachedBody = await store.cacheBody(message.id, body);
      return { message, body: cachedBody };
    }
  };
}
