import { describe, expect, it } from "vitest";

import { PasswordHasher } from "./password-hasher.js";

describe("PasswordHasher", () => {
  it("encodes the selected Render Starter Argon2id parameters", async () => {
    const hasher = new PasswordHasher();

    const encoded = await hasher.hash("a-long-test-password");

    expect(encoded).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    await expect(hasher.verify(encoded, "a-long-test-password")).resolves.toBe(true);
    await expect(hasher.verify(encoded, "a-different-password")).resolves.toBe(false);
  });

  it("performs a real dummy verification for unknown accounts", async () => {
    const hasher = new PasswordHasher();

    await expect(hasher.verifyDummy("unknown-password")).resolves.toBe(false);
  });
});
