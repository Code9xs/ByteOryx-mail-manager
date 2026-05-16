import type { PrismaClient } from "@prisma/client";
import type { MailboxStore, TagShape } from "./mailbox-service";

export function createPrismaMailboxStore(prisma: PrismaClient): MailboxStore {
  function buildAccountWhere(filters: {
    search?: string;
    tag?: string;
    group?: string;
  }) {
    return {
      email: filters.search ? { contains: filters.search } : undefined,
      tags: filters.tag ? { some: { tag: { name: filters.tag } } } : undefined,
      group: filters.group ? { name: filters.group } : undefined
    };
  }

  return {
    async upsertAccount(data) {
      const existing = await prisma.mailboxAccount.findUnique({
        where: { email: data.email },
        select: { id: true }
      });

      await prisma.mailboxAccount.upsert({
        where: { email: data.email },
        create: data,
        update: {
          passwordEncrypted: data.passwordEncrypted,
          clientId: data.clientId,
          refreshTokenEncrypted: data.refreshTokenEncrypted,
          groupId: data.groupId
        }
      });

      return { created: !existing };
    },

    async listAccounts(filters) {
      const accounts = await prisma.mailboxAccount.findMany({
        where: buildAccountWhere(filters),
        include: {
          tags: { include: { tag: true } },
          group: true
        },
        orderBy: { email: "asc" }
      });

      return accounts.map((account) => ({
        ...account,
        tags: account.tags.map((item) => item.tag)
      }));
    },

    async listAccountsPage(filters) {
      const page = Math.max(1, filters.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));
      const where = buildAccountWhere(filters);

      const [accounts, total] = await prisma.$transaction([
        prisma.mailboxAccount.findMany({
          where,
          include: {
            tags: { include: { tag: true } },
            group: true
          },
          orderBy: { email: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.mailboxAccount.count({ where })
      ]);

      return {
        total,
        accounts: accounts.map((account) => ({
          ...account,
          tags: account.tags.map((item) => item.tag)
        }))
      };
    },

    async listAccountEmails(filters) {
      const accounts = await prisma.mailboxAccount.findMany({
        where: buildAccountWhere(filters),
        select: { email: true },
        orderBy: { email: "asc" }
      });
      return accounts.map((account) => account.email);
    },

    async listGroups() {
      return prisma.group.findMany({ orderBy: { name: "asc" } });
    },

    async findOneAccount(filters) {
      const account = await prisma.mailboxAccount.findFirst({
        where: {
          group: filters.group ? { name: filters.group } : undefined,
          tags: filters.tag
            ? { some: { tag: { name: filters.tag } } }
            : undefined,
          NOT: filters.excludeTag
            ? { tags: { some: { tag: { name: filters.excludeTag } } } }
            : undefined
        },
        include: {
          tags: { include: { tag: true } },
          group: true
        },
        orderBy: { updatedAt: "asc" }
      });

      if (!account) return null;
      return {
        ...account,
        tags: account.tags.map((item) => item.tag)
      };
    },

    async getOrCreateGroup(name: string) {
      if (name === "default") {
        return prisma.group.upsert({
          where: { id: "default" },
          create: { id: "default", name: "default" },
          update: { name: "default" }
        });
      }

      return prisma.group.upsert({
        where: { name },
        create: { name },
        update: {}
      });
    },

    async getOrCreateTag(name: string): Promise<TagShape> {
      return prisma.tag.upsert({
        where: { name },
        create: { name },
        update: {}
      });
    },

    async addTag(email, tag) {
      const account = await prisma.mailboxAccount.findUnique({
        where: { email },
        select: { id: true }
      });
      if (!account) return;

      await prisma.mailboxTag.upsert({
        where: { mailboxId_tagId: { mailboxId: account.id, tagId: tag.id } },
        create: { mailboxId: account.id, tagId: tag.id },
        update: {}
      });
    },

    async removeTag(email, tagName) {
      const account = await prisma.mailboxAccount.findUnique({
        where: { email },
        select: {
          id: true,
          tags: {
            where: { tag: { name: tagName } },
            select: { tagId: true }
          }
        }
      });
      const tagId = account?.tags[0]?.tagId;
      if (!account || !tagId) return;

      await prisma.mailboxTag.delete({
        where: { mailboxId_tagId: { mailboxId: account.id, tagId } }
      });
    },

    async getAccountsForExport(emails) {
      const accounts = await prisma.mailboxAccount.findMany({
        where: { email: { in: emails } },
        include: { tags: { include: { tag: true } }, group: true },
        orderBy: { email: "asc" }
      });

      return accounts.map((account) => ({
        ...account,
        tags: account.tags.map((item) => item.tag)
      }));
    },

    async deleteAccounts(emails) {
      await prisma.mailboxAccount.deleteMany({
        where: { email: { in: emails } }
      });
    }
  };
}
