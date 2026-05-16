import { describe, expect, it, vi } from "vitest";
import { encryptSecret } from "./crypto";
import { createMailSyncService } from "./mail-sync-service";

describe("mail sync service", () => {
  it("refreshes tokens, stores rotated refresh token, and caches messages", async () => {
    const store = createMemoryMailStore();
    const service = createMailSyncService({
      secretKey: "0123456789abcdef0123456789abcdef",
      tenantId: "common",
      store,
      refreshAccessToken: vi.fn(async () => ({
        accessToken: "access-new",
        refreshToken: "refresh-new",
        expiresAt: new Date("2026-05-16T11:00:00Z")
      })),
      syncMessageList: vi.fn(async () => [
        {
          graphId: "mail-1",
          subject: "Hi",
          fromAddress: "sender@example.com",
          receivedAt: new Date("2026-05-16T10:00:00Z"),
          hasAttachments: false,
          isRead: true
        }
      ]),
      fetchMessageBody: vi.fn()
    });

    await service.syncMailbox("account-1");

    expect(store.account.refreshTokenEncrypted).not.toContain("refresh-new");
    expect(store.messages).toHaveLength(1);
    expect(store.logs.at(-1)).toMatchObject({ type: "mail_sync", status: "ok" });
  });

  it("returns cached body before calling Graph", async () => {
    const store = createMemoryMailStore();
    store.body = {
      contentType: "html",
      content: "<p>Cached</p>",
      fetchedAt: new Date()
    };
    const fetchMessageBody = vi.fn();
    const service = createMailSyncService({
      secretKey: "0123456789abcdef0123456789abcdef",
      tenantId: "common",
      store,
      refreshAccessToken: vi.fn(),
      syncMessageList: vi.fn(),
      fetchMessageBody
    });

    const detail = await service.getMessageDetail("ops@example.com", "mail-1");

    expect(detail.body.content).toBe("<p>Cached</p>");
    expect(fetchMessageBody).not.toHaveBeenCalled();
  });
});

function createMemoryMailStore() {
  const account = {
    id: "account-1",
    email: "ops@example.com",
    clientId: "client-id",
    refreshTokenEncrypted: encryptSecret(
      "refresh-old",
      "0123456789abcdef0123456789abcdef"
    ),
    accessTokenEncrypted: null,
    accessTokenExpiresAt: null
  };
  const messages: any[] = [];
  const logs: any[] = [];
  let body: any = null;

  return {
    account,
    messages,
    logs,
    get body() {
      return body;
    },
    set body(value: any) {
      body = value;
    },
    async getAccountById() {
      return account;
    },
    async getAccountByEmail() {
      return account;
    },
    async updateTokens(_id: string, data: any) {
      Object.assign(account, data);
    },
    async upsertMessages(_mailboxId: string, items: any[]) {
      messages.push(...items);
    },
    async updateSyncStatus(_id: string, status: string) {
      (account as any).syncStatus = status;
    },
    async addSyncLog(data: any) {
      logs.push(data);
    },
    async findMessage(_email: string, graphId: string) {
      return {
        id: "message-1",
        graphId,
        mailbox: account,
        bodyCache: body
      };
    },
    async cacheBody(_messageId: string, data: any) {
      body = { ...data, fetchedAt: new Date() };
      return body;
    }
  };
}
