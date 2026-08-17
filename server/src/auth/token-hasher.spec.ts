import { describe, expect, it } from "vitest";

import { TokenHasher } from "./token-hasher.js";

describe("TokenHasher", () => {
  const hasher = new TokenHasher({
    tokenPepper: "test-only-pepper-that-is-at-least-32-bytes",
  });

  it("issues 32 random bytes and stores only a peppered SHA-256 digest", () => {
    const first = hasher.issue();
    const second = hasher.issue();

    expect(Buffer.from(first.rawToken, "base64url")).toHaveLength(32);
    expect(first.tokenHash).toHaveLength(32);
    expect(first.tokenHash.equals(Buffer.from(first.rawToken))).toBe(false);
    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenHash.equals(hasher.hash(first.rawToken))).toBe(true);
  });

  it("compares token hashes without accepting different lengths", () => {
    const digest = hasher.hash("token-value");

    expect(hasher.equals(digest, Buffer.from(digest))).toBe(true);
    expect(hasher.equals(digest, Buffer.alloc(31))).toBe(false);
    expect(hasher.equals(digest, hasher.hash("other-token"))).toBe(false);
  });
});
