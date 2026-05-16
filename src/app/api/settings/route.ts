import { NextResponse } from "next/server";
import {
  handleGetSettingsRequest,
  handleUpdateSettingsRequest
} from "@/server/settings-api";
import { requireAdminAccess } from "@/server/admin-auth";
import { getSettingsService } from "@/server/services";

export async function GET() {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const result = await handleGetSettingsRequest(getSettingsService());
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminAccess();
  if (unauthorized) return unauthorized;

  const result = await handleUpdateSettingsRequest(
    await request.json(),
    getSettingsService()
  );
  return NextResponse.json(result.body, { status: result.status });
}
