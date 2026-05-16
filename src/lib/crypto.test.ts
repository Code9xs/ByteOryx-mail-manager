import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("secret encryption", () => {
  it("encrypts a secret without storing plaintext and decrypts it with the same key", () => {
    const key = "0123456789abcdef0123456789abcdef";
    const encrypted = encryptSecret("refresh-token-value", key);

    expect(encrypted).not.toContain("refresh-token-value");
    expect(decryptSecret(encrypted, key)).toBe("refresh-token-value");
  });

  it("rejects a different key", () => {
    const encrypted = encryptSecret(
      "mailbox-password",
      "0123456789abcdef0123456789abcdef"
    );

    expect(() =>
      decryptSecret(encrypted, "abcdef0123456789abcdef0123456789")
    ).toThrow("Unable to decrypt secret");
  });
});
