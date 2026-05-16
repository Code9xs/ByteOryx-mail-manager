import { describe, expect, it } from "vitest";
import { parseMailboxImport } from "./import-parser";

describe("parseMailboxImport", () => {
  it("parses one mailbox per line with the default delimiter", () => {
    const result = parseMailboxImport(
      "user@example.com----example-password----client-id----example-refresh-token"
    );

    expect(result.records).toEqual([
      {
        email: "user@example.com",
        password: "example-password",
        clientId: "client-id",
        refreshToken: "example-refresh-token"
      }
    ]);
    expect(result.errors).toEqual([]);
  });

  it("supports a custom delimiter", () => {
    const result = parseMailboxImport(
      "ops@example.com|pw|client-123|refresh-token",
      "|"
    );

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.clientId).toBe("client-123");
  });

  it("returns line-level errors for missing fields and invalid email", () => {
    const result = parseMailboxImport(
      [
        "valid@example.com----pw----client----refresh",
        "bad-email----pw----client----refresh",
        "missing@example.com----pw----client"
      ].join("\n")
    );

    expect(result.records).toHaveLength(1);
    expect(result.errors).toEqual([
      { line: 2, message: "Invalid email address" },
      { line: 3, message: "Expected 4 fields but found 3" }
    ]);
  });
});
