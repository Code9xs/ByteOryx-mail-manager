export type AppSettings = {
  accessKey: string;
  apiKey: string;
  refreshEnabled: boolean;
};

export type SettingsStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
};

const DEFAULT_SETTINGS: AppSettings = {
  accessKey: "",
  apiKey: "",
  refreshEnabled: false
};

export function createSettingsService(store: SettingsStore) {
  return {
    async getSettings(): Promise<AppSettings> {
      return {
        accessKey: (await store.get("accessKey")) ?? DEFAULT_SETTINGS.accessKey,
        apiKey: (await store.get("apiKey")) ?? DEFAULT_SETTINGS.apiKey,
        refreshEnabled:
          ((await store.get("refreshEnabled")) ?? "false") === "true"
      };
    },

    async updateSettings(settings: Partial<AppSettings>) {
      if (settings.accessKey !== undefined) {
        await store.set("accessKey", settings.accessKey);
      }
      if (settings.apiKey !== undefined) {
        await store.set("apiKey", settings.apiKey);
      }
      if (settings.refreshEnabled !== undefined) {
        await store.set("refreshEnabled", String(settings.refreshEnabled));
      }
    },

    async verifyApiKey(apiKey: string | null | undefined) {
      const configured = (await store.get("apiKey")) ?? "";
      return Boolean(configured) && apiKey === configured;
    },

    async verifyAccessKey(accessKey: string | null | undefined) {
      const configured = (await store.get("accessKey")) ?? "";
      return !configured || accessKey === configured;
    }
  };
}
