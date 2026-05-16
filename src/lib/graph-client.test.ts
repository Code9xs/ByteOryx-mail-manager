import { describe, expect, it, vi } from "vitest";
import {
  fetchMessageBody,
  refreshAccessToken,
  syncMessageList
} from "./graph-client";

describe("graph client", () => {
  it("refreshes an access token and keeps a rotated refresh token", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          access_token: "access-1",
          refresh_token: "refresh-2",
          expires_in: 3600
        }),
        { status: 200 }
      )
    );

    const result = await refreshAccessToken(
      {
        clientId: "client-id",
        refreshToken: "refresh-1",
        tenantId: "common"
      },
      fetcher
    );

    expect(fetcher).toHaveBeenCalledOnce();
    const requestBody = fetcher.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(requestBody.get("scope")).toBe(
      "https://graph.microsoft.com/Mail.Read offline_access"
    );
    expect(result.accessToken).toBe("access-1");
    expect(result.refreshToken).toBe("refresh-2");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("allows configured Graph scopes when a token was issued for a different delegated permission set", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          access_token: "access-1",
          expires_in: 3600
        }),
        { status: 200 }
      )
    );

    await refreshAccessToken(
      {
        clientId: "client-id",
        refreshToken: "refresh-1",
        tenantId: "common",
        scopes: "https://graph.microsoft.com/Mail.ReadBasic offline_access"
      },
      fetcher
    );

    const requestBody = fetcher.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(requestBody.get("scope")).toBe(
      "https://graph.microsoft.com/Mail.ReadBasic offline_access"
    );
  });

  it("throws a useful error when token refresh fails", async () => {
    await expect(
      refreshAccessToken(
        {
          clientId: "client-id",
          refreshToken: "bad-refresh",
          tenantId: "common"
        },
        async () => new Response("invalid_grant", { status: 400 })
      )
    ).rejects.toThrow("Graph token refresh failed: invalid_grant");
  });

  it("maps message list and message body responses", async () => {
    const listFetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          value: [
            {
              id: "mail-1",
              subject: "Hello",
              from: { emailAddress: { address: "sender@example.com" } },
              receivedDateTime: "2026-05-16T10:00:00Z",
              hasAttachments: true,
              isRead: false
            }
          ]
        }),
        { status: 200 }
      )
    );

    const messages = await syncMessageList("access-token", listFetcher);

    const requestUrl = new URL(listFetcher.mock.calls[0]?.[0]?.toString() ?? "");
    expect(requestUrl.searchParams.get("$top")).toBe("50");
    expect(requestUrl.searchParams.get("$orderby")).toBe("receivedDateTime desc");
    expect(requestUrl.searchParams.get("$select")).toBe(
      "id,subject,from,receivedDateTime,hasAttachments,isRead"
    );
    expect(messages).toEqual([
      {
        graphId: "mail-1",
        subject: "Hello",
        fromAddress: "sender@example.com",
        receivedAt: new Date("2026-05-16T10:00:00Z"),
        hasAttachments: true,
        isRead: false
      }
    ]);

    const body = await fetchMessageBody("access-token", "mail-1", async () =>
      new Response(
        JSON.stringify({
          body: { contentType: "html", content: "<p>Hello</p>" }
        }),
        { status: 200 }
      )
    );

    expect(body).toEqual({
      contentType: "html",
      content: "<p>Hello</p>"
    });
  });
});
