import { describe, expect, it, vi } from "vitest";
import { handleSyncBackgroundRequest, handleSyncRequest } from "./sync-api";

describe("sync api handler", () => {
  it("returns a readable message for missing account target", async () => {
    const result = await handleSyncRequest({}, {} as any);

    expect(result).toEqual({
      status: 400,
      body: { error: "accountId or accountEmail is required" }
    });
  });

  it("syncs a mailbox by account email", async () => {
    const service = { syncMailboxByEmail: vi.fn(async () => undefined) };

    const result = await handleSyncRequest(
      { accountEmail: "ops@example.com" },
      service as any
    );

    expect(result.status).toBe(200);
    expect(service.syncMailboxByEmail).toHaveBeenCalledWith("ops@example.com");
  });

  it("queues selected mailbox emails for background sync", async () => {
    const service = { syncMailboxByEmail: vi.fn(async () => undefined) };

    const result = handleSyncBackgroundRequest(
      { accountEmails: ["ops@example.com", "ops@example.com", "team@example.com"] },
      service
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result).toEqual({
      status: 202,
      body: { queued: true, accepted: 2 }
    });
    expect(service.syncMailboxByEmail).toHaveBeenCalledWith("ops@example.com");
    expect(service.syncMailboxByEmail).toHaveBeenCalledWith("team@example.com");
  });

  it("rejects empty background sync requests", () => {
    const result = handleSyncBackgroundRequest(
      { accountEmails: [" "] },
      { syncMailboxByEmail: vi.fn() as any }
    );

    expect(result).toEqual({
      status: 400,
      body: { error: "accountEmails are required" }
    });
  });

  it("maps AADSTS90023 token errors to an actionable Chinese message", async () => {
    const result = await handleSyncRequest(
      { accountId: "account-1" },
      {
        syncMailbox: vi.fn(async () => {
          throw new Error(
            'Graph token refresh failed: {"error":"invalid_request","error_description":"AADSTS90023: No applicable permissions were found for this user."}'
          );
        })
      }
    );

    expect(result.status).toBe(502);
    expect(result.body.error).toContain("Microsoft Graph 权限不足");
    expect(result.body.error).toContain("Mail.Read");
  });
});
