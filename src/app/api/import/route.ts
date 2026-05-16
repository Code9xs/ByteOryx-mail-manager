import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/server/admin-auth";
import { handleImportBackgroundRequest } from "@/server/mail-api";
import { getMailboxService } from "@/server/services";

export async function POST(request: Request) {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const input = await request.json();
  const result = handleImportBackgroundRequest(input, getMailboxService());
  return NextResponse.json(result.body, { status: result.status });
}
