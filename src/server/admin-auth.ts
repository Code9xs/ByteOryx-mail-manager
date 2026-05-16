import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, createAccessSessionValue } from "@/lib/access-session";
import { getSettingsService } from "@/server/services";

export async function requireAdminAccess() {
  const settings = await getSettingsService().getSettings();
  if (!settings.accessKey) return null;

  const cookieStore = await cookies();
  const session = cookieStore.get(ACCESS_COOKIE)?.value;
  if (session === createAccessSessionValue(settings.accessKey)) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

