import type { PrismaClient } from "@prisma/client";
import type { SettingsStore } from "./settings-service";

export function createPrismaSettingsStore(prisma: PrismaClient): SettingsStore {
  return {
    async get(key) {
      const setting = await prisma.appSetting.findUnique({ where: { key } });
      return setting?.value ?? null;
    },

    async set(key, value) {
      await prisma.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value }
      });
    }
  };
}
