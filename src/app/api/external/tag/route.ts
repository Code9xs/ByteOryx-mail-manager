import { NextResponse } from "next/server";
import { handleExternalAddTagRequest } from "@/server/external-api";
import { getMailboxService, getSettingsService } from "@/server/services";

export async function POST(request: Request) {
  const result = await handleExternalAddTagRequest(await request.json(), {
    settingsService: getSettingsService(),
    mailboxService: getMailboxService()
  });
  return NextResponse.json(result.body, { status: result.status });
}
