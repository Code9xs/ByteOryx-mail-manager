import { NextResponse } from "next/server";
import { handleExternalLatestMailRequest } from "@/server/external-api";
import {
  getMailQueryService,
  getMailSyncService,
  getSettingsService
} from "@/server/services";

export async function GET(request: Request) {
  const result = await handleExternalLatestMailRequest(new URL(request.url), {
    settingsService: getSettingsService(),
    mailQueryService: getMailQueryService(),
    mailSyncService: getMailSyncService()
  });
  return NextResponse.json(result.body, { status: result.status });
}
