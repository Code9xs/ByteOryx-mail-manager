export type Fetcher = typeof fetch;

export type TokenRefreshInput = {
  clientId: string;
  refreshToken: string;
  tenantId: string;
  scopes?: string;
};

export type TokenRefreshResult = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type GraphMailMessage = {
  graphId: string;
  subject: string;
  fromAddress: string;
  receivedAt: Date;
  hasAttachments: boolean;
  isRead: boolean;
};

export async function refreshAccessToken(
  input: TokenRefreshInput,
  fetcher: Fetcher = fetch
): Promise<TokenRefreshResult> {
  const params = new URLSearchParams({
    client_id: input.clientId,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    scope: input.scopes ?? "https://graph.microsoft.com/Mail.Read offline_access"
  });

  const response = await fetcher(
    `https://login.microsoftonline.com/${input.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params
    }
  );

  if (!response.ok) {
    throw new Error(`Graph token refresh failed: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? input.refreshToken,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000)
  };
}

export async function syncMessageList(
  accessToken: string,
  fetcher: Fetcher = fetch
): Promise<GraphMailMessage[]> {
  const query = new URLSearchParams({
    $top: "50",
    $orderby: "receivedDateTime desc",
    $select: "id,subject,from,receivedDateTime,hasAttachments,isRead"
  });

  const response = await fetcher(
    `https://graph.microsoft.com/v1.0/me/messages?${query.toString()}`,
    {
      headers: { authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    throw new Error(`Graph message sync failed: ${await response.text()}`);
  }

  const payload = (await response.json()) as { value?: any[] };
  return (payload.value ?? []).map((message) => ({
    graphId: message.id,
    subject: message.subject ?? "",
    fromAddress: message.from?.emailAddress?.address ?? "",
    receivedAt: new Date(message.receivedDateTime),
    hasAttachments: Boolean(message.hasAttachments),
    isRead: Boolean(message.isRead)
  }));
}

export async function fetchMessageBody(
  accessToken: string,
  messageId: string,
  fetcher: Fetcher = fetch
): Promise<{ contentType: string; content: string }> {
  const response = await fetcher(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(
      messageId
    )}?$select=body`,
    {
      headers: { authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    throw new Error(`Graph message detail failed: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    body?: { contentType?: string; content?: string };
  };

  return {
    contentType: payload.body?.contentType ?? "text",
    content: payload.body?.content ?? ""
  };
}
