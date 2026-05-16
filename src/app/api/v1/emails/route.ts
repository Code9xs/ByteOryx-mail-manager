import { NextResponse } from "next/server";
import { handleEmailListRequest } from "@/server/mail-api";
import { requireAdminAccess } from "@/server/admin-auth";
import { getMailQueryService } from "@/server/services";

export async function GET(request: Request) {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const result = await handleEmailListRequest(
    new URL(request.url),
    getMailQueryService()
  );
  return NextResponse.json(result.body, { status: result.status });
}
