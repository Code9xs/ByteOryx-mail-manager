import { NextResponse } from "next/server";
import { handleExternalPickMailboxRequest } from "@/server/external-api";
import {
  getMailQueryService,
  getMailboxService,
  getSettingsService
} from "@/server/services";

export async function GET(request: Request) {
  const result = await handleExternalPickMailboxRequest(new URL(request.url), {
    settingsService: getSettingsService(),
    mailboxService: getMailboxService(),
    mailQueryService: getMailQueryService()
  });
  return NextResponse.json(result.body, { status: result.status });
}
