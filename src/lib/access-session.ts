import { createHash } from "crypto";

export const ACCESS_COOKIE = "byteoryx_access_granted";

export function createAccessSessionValue(accessKey: string) {
  return createHash("sha256").update(accessKey).digest("hex");
}

