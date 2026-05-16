import type { PrismaClient } from "@prisma/client";

export function createMailQueryService(prisma: PrismaClient) {
  return {
    async listMessages(filters: { account?: string; tag?: string }) {
      return prisma.mailMessage.findMany({
        where: {
          mailbox: {
            email: filters.account,
            tags: filters.tag
              ? { some: { tag: { name: filters.tag } } }
              : undefined
          }
        },
        select: {
          graphId: true,
          subject: true,
          fromAddress: true,
          receivedAt: true,
          hasAttachments: true,
          isRead: true,
          mailbox: { select: { email: true } }
        },
        orderBy: { receivedAt: "desc" },
        take: 100
      });
    },

    async getLatestMessage(account: string) {
      return prisma.mailMessage.findFirst({
        where: { mailbox: { email: account } },
        select: {
          graphId: true,
          subject: true,
          fromAddress: true,
          receivedAt: true,
          hasAttachments: true,
          isRead: true,
          mailbox: { select: { email: true } }
        },
        orderBy: { receivedAt: "desc" }
      });
    }
  };
}
