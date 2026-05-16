import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function deriveKey(secretKey: string): Buffer {
  if (!secretKey || secretKey.length < 16) {
    throw new Error("APP_SECRET_KEY must be at least 16 characters");
  }

  return createHash("sha256").update(secretKey).digest();
}

export function encryptSecret(plaintext: string, secretKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secretKey), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(":");
}

export function decryptSecret(encrypted: string, secretKey: string): string {
  try {
    const [version, iv, authTag, ciphertext] = encrypted.split(":");
    if (version !== VERSION || !iv || !authTag || !ciphertext) {
      throw new Error("Unsupported encrypted secret format");
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      deriveKey(secretKey),
      Buffer.from(iv, "base64url")
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    throw new Error("Unable to decrypt secret");
  }
}
