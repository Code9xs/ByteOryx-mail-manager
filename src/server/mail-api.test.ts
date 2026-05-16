import { describe, expect, it, vi } from "vitest";
import {
  handleAccountDeleteRequest,
  handleExportRequest,
  handleEmailDetailRequest,
  handleEmailListRequest,
  handleGroupsRequest,
  handleImportBackgroundRequest,
  handleImportRequest,
  handleTagRequest
} from "./mail-api";

describe("mail api handlers", () => {
  it("imports valid lines and reports parser errors", async () => {
    const service = { importAccounts: vi.fn(async () => ({ created: 1, updated: 0 })) };

    const result = await handleImportRequest(
      {
        text: [
          "ops@example.com----pw----client----refresh",
          "bad----pw----client----refresh"
        ].join("\n")
      },
      service as any
    );

    expect(result.status).toBe(207);
    expect(service.importAccounts).toHaveBeenCalledWith(
      [
        {
          email: "ops@example.com",
          password: "pw",
          clientId: "client",
          refreshToken: "refresh"
        }
      ],
      "default"
    );
    expect(result.body.imported).toEqual({ created: 1, updated: 0 });
    expect(result.body.errors).toEqual([
      { line: 2, message: "Invalid email address" }
    ]);
  });

  it("filters email list by account and tag", async () => {
    const result = await handleEmailListRequest(
      new URL("http://local/api/v1/emails?account=ops@example.com&tag=业务A"),
      {
        listMessages: vi.fn(async () => [{ graphId: "mail-1", subject: "Hi" }])
      } as any
    );

    expect(result.status).toBe(200);
    expect(result.body.emails).toEqual([{ graphId: "mail-1", subject: "Hi" }]);
  });

  it("syncs the mailbox before listing messages for the UI", async () => {
    const mailQueryService = {
      listMessages: vi.fn(async () => [{ graphId: "mail-2", subject: "Fresh" }])
    };
    const mailSyncService = {
      syncMailboxByEmail: vi.fn(async () => undefined)
    };

    const result = await handleEmailListRequest(
      new URL("http://local/api/v1/emails?account=ops@example.com"),
      mailQueryService as any,
      mailSyncService as any
    );

    expect(result.status).toBe(200);
    expect(mailSyncService.syncMailboxByEmail).toHaveBeenCalledWith(
      "ops@example.com"
    );
    expect(mailQueryService.listMessages).toHaveBeenCalledWith({
      account: "ops@example.com",
      tag: undefined
    });
  });

  it("requires account and mail_id for detail requests", async () => {
    const result = await handleEmailDetailRequest(
      new URL("http://local/api/v1/email/detail?account=ops@example.com"),
      {} as any
    );

    expect(result.status).toBe(400);
    expect(result.body.error).toBe("account and mail_id are required");
  });

  it("returns an actionable message when encrypted tokens cannot be decrypted", async () => {
    const result = await handleEmailDetailRequest(
      new URL("http://local/api/v1/email/detail?account=ops@example.com&mail_id=mail-1"),
      {
        getMessageDetail: vi.fn(async () => {
          throw new Error("Unable to decrypt secret");
        })
      } as any
    );

    expect(result.status).toBe(409);
    expect(result.body.error).toContain("APP_SECRET_KEY");
    expect(result.body.error).toContain("重新导入");
  });

  it("applies bulk tags", async () => {
    const service = { applyTags: vi.fn(async () => undefined) };

    const result = await handleTagRequest(
      { emails: ["ops@example.com"], tags: ["业务A"], action: "add" },
      service as any
    );

    expect(result.status).toBe(200);
    expect(service.applyTags).toHaveBeenCalledWith(
      ["ops@example.com"],
      ["业务A"],
      "add"
    );
  });

  it("imports into the requested group", async () => {
    const service = { importAccounts: vi.fn(async () => ({ created: 1, updated: 0 })) };

    await handleImportRequest(
      {
        text: "ops@example.com----pw----client----refresh",
        group: "sales"
      },
      service as any
    );

    expect(service.importAccounts).toHaveBeenCalledWith(
      expect.any(Array),
      "sales"
    );
  });

  it("queues valid imports in the background without waiting for database writes", async () => {
    let releaseImport!: () => void;
    const service = {
      importAccounts: vi.fn(
        () =>
          new Promise<{ created: number; updated: number }>((resolve) => {
            releaseImport = () => resolve({ created: 1, updated: 0 });
          })
      )
    };

    const result = handleImportBackgroundRequest(
      {
        text: "ops@example.com----pw----client----refresh",
        group: "sales"
      },
      service as any
    );

    expect(result).toEqual({
      status: 202,
      body: { queued: true, accepted: 1, errors: [] }
    });
    expect(service.importAccounts).toHaveBeenCalledWith(
      expect.any(Array),
      "sales"
    );

    releaseImport();
    await Promise.resolve();
  });

  it("exports selected accounts with a custom delimiter", async () => {
    const result = await handleExportRequest(
      { emails: ["ops@example.com"], delimiter: "|" },
      {
        exportAccounts: vi.fn(async () => "ops@example.com|pw|client|refresh")
      } as any
    );

    expect(result).toEqual({
      status: 200,
      body: { text: "ops@example.com|pw|client|refresh" }
    });
  });

  it("deletes selected accounts", async () => {
    const service = { deleteAccounts: vi.fn(async () => undefined) };

    const result = await handleAccountDeleteRequest(
      { emails: ["ops@example.com"] },
      service as any
    );

    expect(result.status).toBe(200);
    expect(service.deleteAccounts).toHaveBeenCalledWith(["ops@example.com"]);
  });

  it("lists groups", async () => {
    const result = await handleGroupsRequest({
      listGroups: vi.fn(async () => [{ id: "group-1", name: "default" }])
    } as any);

    expect(result).toEqual({
      status: 200,
      body: { groups: [{ id: "group-1", name: "default" }] }
    });
  });
});
