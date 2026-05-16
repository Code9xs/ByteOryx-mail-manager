import { describe, expect, it } from "vitest";
import { createMailboxService } from "./mailbox-service";

describe("mailbox service", () => {
  it("creates accounts with encrypted secrets and applies bulk tag changes", async () => {
    const service = createMailboxService({
      secretKey: "0123456789abcdef0123456789abcdef",
      store: createMemoryStore()
    });

    const imported = await service.importAccounts([
      {
        email: "ops@example.com",
        password: "plain-password",
        clientId: "client-id",
        refreshToken: "refresh-token"
      }
    ]);

    expect(imported.created).toBe(1);
    const stored = await service.listAccounts({});
    expect(stored[0]?.passwordEncrypted).not.toContain("plain-password");
    expect(stored[0]?.refreshTokenEncrypted).not.toContain("refresh-token");

    await service.applyTags(["ops@example.com"], ["业务A", "待处理"], "add");
    await service.applyTags(["ops@example.com"], ["待处理"], "remove");

    const filtered = await service.listAccounts({ tag: "业务A" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.tags.map((tag) => tag.name)).toEqual(["业务A"]);
  });

  it("imports accounts into default or selected groups and filters by group", async () => {
    const store = createMemoryStore();
    const service = createMailboxService({
      secretKey: "0123456789abcdef0123456789abcdef",
      store
    });

    await service.importAccounts([
      {
        email: "default@example.com",
        password: "pw",
        clientId: "client-default",
        refreshToken: "refresh-default"
      }
    ]);
    await service.importAccounts(
      [
        {
          email: "sales@example.com",
          password: "pw",
          clientId: "client-sales",
          refreshToken: "refresh-sales"
        }
      ],
      "sales"
    );

    expect((await service.listGroups()).map((group) => group.name)).toEqual([
      "default",
      "sales"
    ]);
    expect(await service.listAccounts({ group: "sales" })).toHaveLength(1);
    expect((await service.listAccounts({ group: "default" }))[0]?.email).toBe(
      "default@example.com"
    );
  });

  it("exports selected accounts with decrypted secrets and custom delimiter", async () => {
    const service = createMailboxService({
      secretKey: "0123456789abcdef0123456789abcdef",
      store: createMemoryStore()
    });

    await service.importAccounts([
      {
        email: "ops@example.com",
        password: "plain-password",
        clientId: "client-id",
        refreshToken: "refresh-token"
      }
    ]);

    const exported = await service.exportAccounts(["ops@example.com"], "|");

    expect(exported).toBe("ops@example.com|plain-password|client-id|refresh-token");
  });

  it("deletes selected accounts", async () => {
    const service = createMailboxService({
      secretKey: "0123456789abcdef0123456789abcdef",
      store: createMemoryStore()
    });

    await service.importAccounts([
      {
        email: "delete@example.com",
        password: "pw",
        clientId: "client",
        refreshToken: "refresh"
      }
    ]);

    await service.deleteAccounts(["delete@example.com"]);

    expect(await service.listAccounts({})).toEqual([]);
  });

  it("returns paginated accounts with total count", async () => {
    const service = createMailboxService({
      secretKey: "0123456789abcdef0123456789abcdef",
      store: createMemoryStore()
    });

    await service.importAccounts(
      Array.from({ length: 12 }, (_, index) => ({
        email: `user-${String(index + 1).padStart(2, "0")}@example.com`,
        password: "pw",
        clientId: "client",
        refreshToken: "refresh"
      }))
    );

    const page = await service.listAccountsPage({
      group: "default",
      page: 2,
      pageSize: 5
    });

    expect(page.total).toBe(12);
    expect(page.accounts).toHaveLength(5);
    expect(page.accounts[0]?.email).toBe("user-06@example.com");
  });
});

function createMemoryStore() {
  const accounts: any[] = [];
  const tags = new Map<string, { id: string; name: string }>();
  const groups = new Map<string, { id: string; name: string }>();

  return {
    async upsertAccount(data: any) {
      const existing = accounts.find((account) => account.email === data.email);
      if (existing) {
        Object.assign(existing, data);
        return { created: false };
      }

      accounts.push({
        ...data,
        id: `account-${accounts.length + 1}`,
        group: Array.from(groups.values()).find((group) => group.id === data.groupId),
        tags: []
      });
      return { created: true };
    },
    async listAccounts(filters: any) {
      return filterAccounts(filters);
    },
    async listAccountsPage(filters: any) {
      const filtered = filterAccounts(filters);
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 10;
      return {
        accounts: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length
      };
    },
    async listAccountEmails(filters: any) {
      return filterAccounts(filters).map((account) => account.email);
    },
    async listGroups() {
      return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    async getOrCreateGroup(name: string) {
      const existing = groups.get(name);
      if (existing) return existing;
      const group = { id: `group-${groups.size + 1}`, name };
      groups.set(name, group);
      return group;
    },
    async getOrCreateTag(name: string) {
      const existing = tags.get(name);
      if (existing) return existing;
      const tag = { id: `tag-${tags.size + 1}`, name };
      tags.set(name, tag);
      return tag;
    },
    async addTag(email: string, tag: any) {
      const account = accounts.find((item) => item.email === email);
      if (account && !account.tags.some((item: any) => item.name === tag.name)) {
        account.tags.push(tag);
      }
    },
    async removeTag(email: string, tagName: string) {
      const account = accounts.find((item) => item.email === email);
      if (account) {
        account.tags = account.tags.filter((tag: any) => tag.name !== tagName);
      }
    },
    async getAccountsForExport(emails: string[]) {
      return accounts.filter((account) => emails.includes(account.email));
    },
    async deleteAccounts(emails: string[]) {
      for (const email of emails) {
        const index = accounts.findIndex((account) => account.email === email);
        if (index >= 0) accounts.splice(index, 1);
      }
    }
  };

  function filterAccounts(filters: any) {
    return accounts
      .filter((account) => {
        const matchesSearch =
          !filters.search || account.email.includes(filters.search);
        const matchesTag =
          !filters.tag || account.tags.some((tag: any) => tag.name === filters.tag);
        const matchesGroup = !filters.group || account.group.name === filters.group;
        return matchesSearch && matchesTag && matchesGroup;
      })
      .sort((a, b) => a.email.localeCompare(b.email));
  }
}
