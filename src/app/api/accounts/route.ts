import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/server/admin-auth";
import { getMailboxService } from "@/server/services";

export async function GET(request: Request) {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const accounts = await getMailboxService().listAccounts({
    search: url.searchParams.get("search") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    group: url.searchParams.get("group") ?? undefined
  });

  return NextResponse.json({ accounts });
}
