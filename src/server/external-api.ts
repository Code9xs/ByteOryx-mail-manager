type ApiResult = {
  status: number;
  body: Record<string, unknown>;
};

type SettingsVerifier = {
  verifyApiKey(apiKey: string | null | undefined): Promise<boolean>;
};

async function requireApiKey(
  apiKey: string | null | undefined,
  settingsService: SettingsVerifier
): Promise<ApiResult | null> {
  if (!(await settingsService.verifyApiKey(apiKey))) {
    return { status: 401, body: { error: "Invalid apiKey" } };
  }
  return null;
}

export async function handleExternalPickMailboxRequest(
  url: URL,
  services: {
    settingsService: SettingsVerifier;
    mailboxService: {
      findOneAccount(filters: {
        group?: string;
        tag?: string;
        excludeTag?: string;
      }): Promise<any | null>;
    };
    mailQueryService: unknown;
  }
): Promise<ApiResult> {
  const auth = await requireApiKey(
    url.searchParams.get("apiKey"),
    services.settingsService
  );
  if (auth) return auth;

  const mailbox = await services.mailboxService.findOneAccount({
    group: url.searchParams.get("group") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    excludeTag: url.searchParams.get("excludeTag") ?? undefined
  });

  if (!mailbox) return { status: 404, body: { error: "Mailbox not found" } };

  return {
    status: 200,
    body: {
      mailbox: {
        email: mailbox.email,
        group: mailbox.group?.name ?? "default",
        tags: mailbox.tags?.map((tag: { name: string }) => tag.name) ?? []
      }
    }
  };
}

export async function handleExternalLatestMailRequest(
  url: URL,
  services: {
    settingsService: SettingsVerifier;
    mailQueryService: {
      getLatestMessage(account: string): Promise<{ graphId: string } | null>;
    };
    mailSyncService: {
      syncMailboxByEmail(account: string): Promise<void>;
      getMessageDetail(account: string, mailId: string): Promise<unknown>;
    };
  }
): Promise<ApiResult> {
  const auth = await requireApiKey(
    url.searchParams.get("apiKey"),
    services.settingsService
  );
  if (auth) return auth;

  const account = url.searchParams.get("account");
  if (!account) return { status: 400, body: { error: "account is required" } };

  await services.mailSyncService.syncMailboxByEmail(account);

  const email = await services.mailQueryService.getLatestMessage(account);
  if (!email) return { status: 404, body: { error: "Email not found" } };

  const detail = await services.mailSyncService.getMessageDetail(
    account,
    email.graphId
  );
  return { status: 200, body: { email: detail } };
}

export async function handleExternalAddTagRequest(
  input: { apiKey?: string; account?: string; tag?: string },
  services: {
    settingsService: SettingsVerifier;
    mailboxService: {
      applyTags(
        emails: string[],
        tags: string[],
        action: "add" | "remove"
      ): Promise<void>;
    };
  }
): Promise<ApiResult> {
  const auth = await requireApiKey(input.apiKey, services.settingsService);
  if (auth) return auth;

  if (!input.account || !input.tag) {
    return { status: 400, body: { error: "account and tag are required" } };
  }

  await services.mailboxService.applyTags([input.account], [input.tag], "add");
  return { status: 200, body: { ok: true } };
}
