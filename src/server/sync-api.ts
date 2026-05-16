type SyncApiResult = {
  status: number;
  body: { ok?: boolean; error?: string };
};

export async function handleSyncRequest(
  input: { accountId?: string },
  syncService: { syncMailbox(accountId: string): Promise<void> }
): Promise<SyncApiResult> {
  if (!input.accountId) {
    return {
      status: 400,
      body: { error: "accountId is required" }
    };
  }

  try {
    await syncService.syncMailbox(input.accountId);
    return { status: 200, body: { ok: true } };
  } catch (error) {
    return {
      status: 502,
      body: { error: formatSyncError(error) }
    };
  }
}

function formatSyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("AADSTS90023")) {
    return "Microsoft Graph 权限不足：当前 Refresh Token 对应的应用未获得可用邮件读取权限。请确认令牌授权时包含 https://graph.microsoft.com/Mail.Read offline_access，或在 .env 中设置 GRAPH_SCOPES 为令牌实际授权的委托权限。";
  }

  if (message.includes("invalid_grant")) {
    return "Refresh Token 已失效或被撤销，请重新获取并导入新的 Refresh Token。";
  }

  return message;
}
