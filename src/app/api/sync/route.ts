import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/server/admin-auth";
import { getMailSyncService } from "@/server/services";
import { handleSyncRequest } from "@/server/sync-api";

export async function POST(request: Request) {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const input = (await request.json()) as { accountId?: string };
  const result = await handleSyncRequest(input, getMailSyncService());
  return NextResponse.json(result.body, { status: result.status });
}
