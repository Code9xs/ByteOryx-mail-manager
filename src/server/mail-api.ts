import { parseMailboxImport } from "@/lib/import-parser";

type ApiResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function handleImportRequest(
  input: { text?: string; delimiter?: string; group?: string },
  mailboxService: {
    importAccounts(records: any[], group?: string): Promise<{ created: number; updated: number }>;
  }
): Promise<ApiResult> {
  const parsed = parseMailboxImport(input.text ?? "", input.delimiter || "----");
  const imported =
    parsed.records.length > 0
      ? await mailboxService.importAccounts(parsed.records, input.group || "default")
      : { created: 0, updated: 0 };

  return {
    status: parsed.errors.length > 0 ? 207 : 200,
    body: { imported, errors: parsed.errors }
  };
}

export function handleImportBackgroundRequest(
  input: { text?: string; delimiter?: string; group?: string },
  mailboxService: {
    importAccounts(records: any[], group?: string): Promise<{ created: number; updated: number }>;
  }
): ApiResult {
  const parsed = parseMailboxImport(input.text ?? "", input.delimiter || "----");
  if (parsed.records.length > 0) {
    void mailboxService
      .importAccounts(parsed.records, input.group || "default")
      .catch((error) => {
        console.error("Background mailbox import failed", error);
      });
  }

  return {
    status: parsed.errors.length > 0 ? 207 : 202,
    body: {
      queued: parsed.records.length > 0,
      accepted: parsed.records.length,
      errors: parsed.errors
    }
  };
}

export async function handleExportRequest(
  input: { emails?: string[]; delimiter?: string },
  mailboxService: {
    exportAccounts(emails: string[], delimiter?: string): Promise<string>;
  }
): Promise<ApiResult> {
  if (!input.emails?.length) {
    return { status: 400, body: { error: "emails are required" } };
  }

  const text = await mailboxService.exportAccounts(
    input.emails,
    input.delimiter || "----"
  );
  return { status: 200, body: { text } };
}

export async function handleAccountDeleteRequest(
  input: { emails?: string[] },
  mailboxService: { deleteAccounts(emails: string[]): Promise<void> }
): Promise<ApiResult> {
  if (!input.emails?.length) {
    return { status: 400, body: { error: "emails are required" } };
  }

  await mailboxService.deleteAccounts(input.emails);
  return { status: 200, body: { ok: true } };
}

export async function handleGroupsRequest(mailboxService: {
  listGroups(): Promise<{ id: string; name: string }[]>;
}): Promise<ApiResult> {
  const groups = await mailboxService.listGroups();
  return { status: 200, body: { groups } };
}

export async function handleTagRequest(
  input: { emails?: string[]; tags?: string[]; action?: "add" | "remove" },
  mailboxService: {
    applyTags(
      emails: string[],
      tags: string[],
      action: "add" | "remove"
    ): Promise<void>;
  }
): Promise<ApiResult> {
  if (!input.emails?.length || !input.tags?.length || !input.action) {
    return {
      status: 400,
      body: { error: "emails, tags, and action are required" }
    };
  }

  await mailboxService.applyTags(input.emails, input.tags, input.action);
  return { status: 200, body: { ok: true } };
}

export async function handleEmailListRequest(
  url: URL,
  mailQueryService: {
    listMessages(filters: {
      account?: string;
      tag?: string;
    }): Promise<unknown[]>;
  },
  mailSyncService?: {
    syncMailboxByEmail(account: string): Promise<void>;
  }
): Promise<ApiResult> {
  const account = url.searchParams.get("account") ?? undefined;
  const tag = url.searchParams.get("tag") ?? undefined;
  if (account && mailSyncService) {
    await mailSyncService.syncMailboxByEmail(account);
  }
  const emails = await mailQueryService.listMessages({ account, tag });
  return { status: 200, body: { emails } };
}

export async function handleEmailDetailRequest(
  url: URL,
  mailSyncService: {
    getMessageDetail(account: string, mailId: string): Promise<unknown>;
  }
): Promise<ApiResult> {
  const account = url.searchParams.get("account");
  const mailId = url.searchParams.get("mail_id");

  if (!account || !mailId) {
    return {
      status: 400,
      body: { error: "account and mail_id are required" }
    };
  }

  try {
    const detail = await mailSyncService.getMessageDetail(account, mailId);
    return { status: 200, body: { email: detail } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    if (message.includes("Unable to decrypt secret")) {
      return {
        status: 409,
        body: {
          error:
            "无法解密该邮箱凭据：当前 APP_SECRET_KEY 与导入账号时使用的密钥不一致，或数据库中保存的是旧密钥加密的数据。请恢复原 APP_SECRET_KEY 后重启服务，或删除该账号后使用当前密钥重新导入。"
        }
      };
    }

    return {
      status: 404,
      body: { error: message }
    };
  }
}
