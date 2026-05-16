import { describe, expect, it, vi } from "vitest";
import { handleSyncRequest } from "./sync-api";

describe("sync api handler", () => {
  it("returns a readable message for missing account id", async () => {
    const result = await handleSyncRequest({}, {} as any);

    expect(result).toEqual({
      status: 400,
      body: { error: "accountId is required" }
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
