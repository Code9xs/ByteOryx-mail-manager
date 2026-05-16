import { NextResponse } from "next/server";
import { startScheduler } from "@/lib/scheduler";
import { requireAdminAccess } from "@/server/admin-auth";

export async function POST() {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  startScheduler();
  return NextResponse.json({ ok: true });
}
