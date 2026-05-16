import type { PrismaClient } from "@prisma/client";
import type { MailboxStore, TagShape } from "./mailbox-service";

export function createPrismaMailboxStore(prisma: PrismaClient): MailboxStore {
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
        where: {
          email: filters.search
            ? { contains: filters.search }
            : undefined,
          tags: filters.tag
            ? { some: { tag: { name: filters.tag } } }
            : undefined,
          group: filters.group ? { name: filters.group } : undefined
        },
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
