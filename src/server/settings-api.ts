import type { AppSettings } from "@/lib/settings-service";
import { configureTokenRefresh } from "@/lib/token-refresh-runtime";

type ApiResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function handleGetSettingsRequest(settingsService: {
  getSettings(): Promise<AppSettings>;
}): Promise<ApiResult> {
  return { status: 200, body: { settings: await settingsService.getSettings() } };
}

export async function handleUpdateSettingsRequest(
  input: Partial<AppSettings>,
  settingsService: {
    updateSettings(settings: Partial<AppSettings>): Promise<void>;
    getSettings(): Promise<AppSettings>;
  }
): Promise<ApiResult> {
  await settingsService.updateSettings({
    accessKey: input.accessKey ?? "",
    apiKey: input.apiKey ?? "",
    refreshEnabled: Boolean(input.refreshEnabled)
  });
  await configureTokenRefresh(Boolean(input.refreshEnabled));
  return { status: 200, body: { settings: await settingsService.getSettings() } };
}
