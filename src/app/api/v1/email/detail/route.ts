import { NextResponse } from "next/server";
import { handleEmailDetailRequest } from "@/server/mail-api";
import { requireAdminAccess } from "@/server/admin-auth";
import { getMailSyncService } from "@/server/services";

export async function GET(request: Request) {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const result = await handleEmailDetailRequest(
    new URL(request.url),
    getMailSyncService()
  );
  return NextResponse.json(result.body, { status: result.status });
}
