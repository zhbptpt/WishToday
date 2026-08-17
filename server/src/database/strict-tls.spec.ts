import { describe, expect, it } from "vitest";

import { assertStrictTlsStream } from "./strict-tls.js";

describe("assertStrictTlsStream", () => {
  it("accepts an encrypted TLS stream with an authorized peer certificate", () => {
    expect(() =>
      assertStrictTlsStream({ encrypted: true, authorized: true }),
    ).not.toThrow();
  });

  it.each([
    ["a plaintext stream", { encrypted: false, authorized: false }],
    ["an unauthorized TLS peer", { encrypted: true, authorized: false }],
    ["a missing stream", undefined],
  ])("rejects %s", (_label, stream) => {
    expect(() => assertStrictTlsStream(stream)).toThrow(
      "PostgreSQL client connection is not using authorized TLS",
    );
  });
});
