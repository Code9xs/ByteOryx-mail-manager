import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/server/admin-auth";
import { getMailSyncService } from "@/server/services";
import {
  handleSyncBackgroundRequest,
  handleSyncRequest
} from "@/server/sync-api";

export async function POST(request: Request) {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const input = (await request.json()) as {
    accountId?: string;
    accountEmail?: string;
    accountEmails?: string[];
  };
  const syncService = getMailSyncService();
  const result = Array.isArray(input.accountEmails)
    ? handleSyncBackgroundRequest(input, syncService)
    : await handleSyncRequest(input, syncService);
  return NextResponse.json(result.body, { status: result.status });
}
