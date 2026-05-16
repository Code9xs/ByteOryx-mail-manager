import { NextResponse } from "next/server";
import { createAccessSessionValue, ACCESS_COOKIE } from "@/lib/access-session";
import { getSettingsService } from "@/server/services";

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as {
    accessKey?: string;
  };

  const settingsService = getSettingsService();
  const allowed = await settingsService.verifyAccessKey(input.accessKey);
  if (!allowed) {
    return NextResponse.json({ error: "Invalid accessKey" }, { status: 401 });
  }

  const settings = await settingsService.getSettings();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, createAccessSessionValue(settings.accessKey), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}
