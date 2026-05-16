import { describe, expect, it } from "vitest";
import { createSettingsService } from "./settings-service";

describe("settings service", () => {
  it("returns empty keys and disabled refresh by default", async () => {
    const service = createSettingsService(createMemorySettingsStore());

    await expect(service.getSettings()).resolves.toEqual({
      accessKey: "",
      apiKey: "",
      refreshEnabled: false
    });
  });

  it("updates accessKey, apiKey, and refresh toggle", async () => {
    const service = createSettingsService(createMemorySettingsStore());

    await service.updateSettings({
      accessKey: "login-key",
      apiKey: "api-key",
      refreshEnabled: true
    });

    await expect(service.getSettings()).resolves.toEqual({
      accessKey: "login-key",
      apiKey: "api-key",
      refreshEnabled: true
    });
    await expect(service.verifyAccessKey("login-key")).resolves.toBe(true);
    await expect(service.verifyAccessKey("wrong")).resolves.toBe(false);
    await expect(service.verifyApiKey("api-key")).resolves.toBe(true);
    await expect(service.verifyApiKey("wrong")).resolves.toBe(false);
  });

  it("does not require access key verification when accessKey is empty", async () => {
    const service = createSettingsService(createMemorySettingsStore());

    await expect(service.verifyAccessKey("anything")).resolves.toBe(true);
    await expect(service.verifyAccessKey(null)).resolves.toBe(true);
  });
});

function createMemorySettingsStore() {
  const values = new Map<string, string>();

  return {
    async get(key: string) {
      return values.get(key) ?? null;
    },
    async set(key: string, value: string) {
      values.set(key, value);
    }
  };
}
