import { describe, expect, it, vi } from "vitest";
import {
  handleExternalAddTagRequest,
  handleExternalLatestMailRequest,
  handleExternalPickMailboxRequest
} from "./external-api";

describe("external mailbox api", () => {
  it("rejects requests with an invalid apiKey", async () => {
    const result = await handleExternalPickMailboxRequest(
      new URL("http://local/api/external/mailbox?apiKey=bad"),
      {
        settingsService: { verifyApiKey: vi.fn(async () => false) },
        mailboxService: {} as any,
        mailQueryService: {} as any
      }
    );

    expect(result.status).toBe(401);
  });

  it("picks one mailbox by group and tag while excluding a tag", async () => {
    const result = await handleExternalPickMailboxRequest(
      new URL(
        "http://local/api/external/mailbox?apiKey=ok&group=sales&tag=ready&excludeTag=used"
      ),
      {
        settingsService: { verifyApiKey: vi.fn(async () => true) },
        mailboxService: {
          findOneAccount: vi.fn(async () => ({
            email: "ops@example.com",
            group: { name: "sales" },
            tags: [{ name: "ready" }]
          }))
        } as any,
        mailQueryService: {} as any
      }
    );

    expect(result.status).toBe(200);
    expect(result.body.mailbox).toEqual({
      email: "ops@example.com",
      group: "sales",
      tags: ["ready"]
    });
  });

  it("returns the latest mail for a mailbox", async () => {
    const result = await handleExternalLatestMailRequest(
      new URL("http://local/api/external/latest-mail?apiKey=ok&account=ops@example.com"),
      {
        settingsService: { verifyApiKey: vi.fn(async () => true) },
        mailQueryService: {
          getLatestMessage: vi.fn(async () => ({
            graphId: "mail-1",
            subject: "Newest"
          }))
        } as any,
        mailSyncService: {
          getMessageDetail: vi.fn(async () => ({
            message: {
              graphId: "mail-1",
              subject: "Newest"
            },
            body: {
              contentType: "html",
              content: "<p>Hello</p>"
            }
          }))
        } as any
      }
    );

    expect(result.status).toBe(200);
    expect(result.body.email).toEqual({
      message: { graphId: "mail-1", subject: "Newest" },
      body: { contentType: "html", content: "<p>Hello</p>" }
    });
  });

  it("adds a tag to a mailbox through apiKey", async () => {
    const mailboxService = { applyTags: vi.fn(async () => undefined) };

    const result = await handleExternalAddTagRequest(
      { apiKey: "ok", account: "ops@example.com", tag: "used" },
      {
        settingsService: { verifyApiKey: vi.fn(async () => true) },
        mailboxService: mailboxService as any
      }
    );

    expect(result.status).toBe(200);
    expect(mailboxService.applyTags).toHaveBeenCalledWith(
      ["ops@example.com"],
      ["used"],
      "add"
    );
  });
});
