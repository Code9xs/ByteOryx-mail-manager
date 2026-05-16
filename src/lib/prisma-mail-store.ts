import type { PrismaClient } from "@prisma/client";
import type { GraphMailMessage } from "./graph-client";
import type { MailSyncStore } from "./mail-sync-service";

export function createPrismaMailSyncStore(prisma: PrismaClient): MailSyncStore {
  return {
    async getAccountById(id) {
      return prisma.mailboxAccount.findUnique({ where: { id } });
    },

    async getAccountByEmail(email) {
      return prisma.mailboxAccount.findUnique({ where: { email } });
    },

    async updateTokens(id, data) {
      await prisma.mailboxAccount.update({
        where: { id },
        data
      });
    },

    async upsertMessages(mailboxId: string, messages: GraphMailMessage[]) {
      for (const message of messages) {
        await prisma.mailMessage.upsert({
          where: {
            mailboxId_graphId: { mailboxId, graphId: message.graphId }
          },
          create: {
            mailboxId,
            ...message
          },
          update: {
            subject: message.subject,
            fromAddress: message.fromAddress,
            receivedAt: message.receivedAt,
            hasAttachments: message.hasAttachments,
            isRead: message.isRead
          }
        });
      }

      await prisma.mailboxAccount.update({
        where: { id: mailboxId },
        data: { lastSyncedAt: new Date() }
      });
    },

    async updateSyncStatus(id, status) {
      await prisma.mailboxAccount.update({
        where: { id },
        data: { syncStatus: status }
      });
    },

    async addSyncLog(data) {
      await prisma.syncLog.create({ data });
    },

    async findMessage(email, graphId) {
      return prisma.mailMessage.findFirst({
        where: { graphId, mailbox: { email } },
        include: { mailbox: true, bodyCache: true }
      });
    },

    async cacheBody(messageId, data) {
      return prisma.mailBodyCache.upsert({
        where: { messageId },
        create: { messageId, ...data },
        update: { ...data, fetchedAt: new Date() }
      });
    }
  };
}

export async function listMailboxIds(prisma: PrismaClient) {
  return prisma.mailboxAccount.findMany({ select: { id: true, email: true } });
}
