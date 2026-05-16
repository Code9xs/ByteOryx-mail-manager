type SyncApiResult = {
  status: number;
  body: { ok?: boolean; queued?: boolean; accepted?: number; error?: string };
};

export async function handleSyncRequest(
  input: { accountId?: string; accountEmail?: string; accountEmails?: string[] },
  syncService: {
    syncMailbox(accountId: string): Promise<void>;
    syncMailboxByEmail?(accountEmail: string): Promise<void>;
  }
): Promise<SyncApiResult> {
  if (!input.accountId && !input.accountEmail) {
    return {
      status: 400,
      body: { error: "accountId or accountEmail is required" }
    };
  }

  try {
    if (input.accountEmail) {
      if (!syncService.syncMailboxByEmail) {
        throw new Error("syncMailboxByEmail is not available");
      }
      await syncService.syncMailboxByEmail(input.accountEmail);
    } else {
      await syncService.syncMailbox(input.accountId!);
    }
    return { status: 200, body: { ok: true } };
  } catch (error) {
    return {
      status: 502,
      body: { error: formatSyncError(error) }
    };
  }
}

export function handleSyncBackgroundRequest(
  input: { accountEmails?: string[] },
  syncService: {
    syncMailboxByEmail(accountEmail: string): Promise<void>;
  }
): SyncApiResult {
  const accountEmails = Array.from(
    new Set((input.accountEmails ?? []).map((email) => email.trim()).filter(Boolean))
  );

  if (!accountEmails.length) {
    return {
      status: 400,
      body: { error: "accountEmails are required" }
    };
  }

  void (async () => {
    for (const accountEmail of accountEmails) {
      try {
        await syncService.syncMailboxByEmail(accountEmail);
      } catch (error) {
        console.error(`Background mailbox sync failed for ${accountEmail}`, error);
      }
    }
  })();

  return {
    status: 202,
    body: { queued: true, accepted: accountEmails.length }
  };
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
