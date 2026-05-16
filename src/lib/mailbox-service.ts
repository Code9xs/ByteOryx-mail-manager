import type { MailboxImportRecord } from "./import-parser";
import { decryptSecret, encryptSecret } from "./crypto";

export type TagShape = {
  id: string;
  name: string;
};

export type AccountShape = {
  id: string;
  email: string;
  passwordEncrypted: string;
  clientId: string;
  refreshTokenEncrypted: string;
  accessTokenEncrypted?: string | null;
  accessTokenExpiresAt?: Date | null;
  syncStatus?: string | null;
  tags: TagShape[];
  group: { id: string; name: string };
};

export type MailboxStore = {
  upsertAccount(data: {
    email: string;
    passwordEncrypted: string;
    clientId: string;
    refreshTokenEncrypted: string;
    groupId: string;
  }): Promise<{ created: boolean }>;
  listAccounts(filters: {
    search?: string;
    tag?: string;
    group?: string;
  }): Promise<AccountShape[]>;
  listGroups(): Promise<{ id: string; name: string }[]>;
  findOneAccount(filters: {
    group?: string;
    tag?: string;
    excludeTag?: string;
  }): Promise<AccountShape | null>;
  getOrCreateGroup(name: string): Promise<{ id: string; name: string }>;
  getOrCreateTag(name: string): Promise<TagShape>;
  addTag(email: string, tag: TagShape): Promise<void>;
  removeTag(email: string, tagName: string): Promise<void>;
  getAccountsForExport(emails: string[]): Promise<AccountShape[]>;
  deleteAccounts(emails: string[]): Promise<void>;
};

export function createMailboxService({
  secretKey,
  store
}: {
  secretKey: string;
  store: MailboxStore;
}) {
  return {
    async importAccounts(records: MailboxImportRecord[], groupName = "default") {
      let created = 0;
      let updated = 0;
      const group = await store.getOrCreateGroup(groupName.trim() || "default");

      for (const record of records) {
        const result = await store.upsertAccount({
          email: record.email,
          passwordEncrypted: encryptSecret(record.password, secretKey),
          clientId: record.clientId,
          refreshTokenEncrypted: encryptSecret(record.refreshToken, secretKey),
          groupId: group.id
        });

        if (result.created) created += 1;
        else updated += 1;
      }

      return { created, updated };
    },

    listAccounts(filters: { search?: string; tag?: string; group?: string }) {
      return store.listAccounts(filters);
    },

    listGroups() {
      return store.listGroups();
    },

    findOneAccount(filters: {
      group?: string;
      tag?: string;
      excludeTag?: string;
    }) {
      return store.findOneAccount(filters);
    },

    async applyTags(
      emails: string[],
      tagNames: string[],
      action: "add" | "remove"
    ) {
      const cleanEmails = emails.map((email) => email.trim()).filter(Boolean);
      const cleanTags = tagNames.map((tag) => tag.trim()).filter(Boolean);

      for (const email of cleanEmails) {
        for (const tagName of cleanTags) {
          if (action === "add") {
            const tag = await store.getOrCreateTag(tagName);
            await store.addTag(email, tag);
          } else {
            await store.removeTag(email, tagName);
          }
        }
      }
    },

    async exportAccounts(emails: string[], delimiter = "----") {
      const accounts = await store.getAccountsForExport(emails);
      return accounts
        .map((account) =>
          [
            account.email,
            decryptSecret(account.passwordEncrypted, secretKey),
            account.clientId,
            decryptSecret(account.refreshTokenEncrypted, secretKey)
          ].join(delimiter)
        )
        .join("\n");
    },

    async deleteAccounts(emails: string[]) {
      await store.deleteAccounts(emails.map((email) => email.trim()).filter(Boolean));
    }
  };
}
