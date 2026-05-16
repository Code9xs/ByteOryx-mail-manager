import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/server/admin-auth";
import { handleGroupsRequest } from "@/server/mail-api";
import { getMailboxService } from "@/server/services";

export async function GET() {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const result = await handleGroupsRequest(getMailboxService());
  return NextResponse.json(result.body, { status: result.status });
}
