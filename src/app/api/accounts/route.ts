import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/server/admin-auth";
import { getMailboxService } from "@/server/services";

export async function GET(request: Request) {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const filters = {
    search: url.searchParams.get("search") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    group: url.searchParams.get("group") ?? undefined
  };
  const mailboxService = getMailboxService();

  if (url.searchParams.get("selectAll") === "true") {
    const emails = await mailboxService.listAccountEmails(filters);
    return NextResponse.json({ emails });
  }

  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
  const result = await mailboxService.listAccountsPage({
    ...filters,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 10
  });

  return NextResponse.json({
    accounts: result.accounts,
    total: result.total,
    page: Number.isFinite(page) ? Math.max(1, page) : 1,
    pageSize: Number.isFinite(pageSize) ? Math.min(100, Math.max(1, pageSize)) : 10
  });
}
