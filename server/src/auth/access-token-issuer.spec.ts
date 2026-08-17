import { generateKeyPairSync } from "node:crypto";

import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";

import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
  AccessTokenIssuer,
} from "./access-token-issuer.js";

describe("AccessTokenIssuer", () => {
  it("signs short-lived RS256 tokens with fixed identity and session claims", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const issuer = new AccessTokenIssuer({
      jwtPrivateKey: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
      jwtKeyId: "test-key-1",
    });

    const issued = await issuer.issue({
      userId: "1a24ad91-2364-429b-a7cb-65ba0041c589",
      sessionId: "39343a87-2f6a-4aea-8c1f-281cffac54ee",
      sessionVersion: 2,
    });
    const verified = await jwtVerify(issued.accessToken, publicKey, {
      algorithms: ["RS256"],
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    });

    expect(verified.protectedHeader).toMatchObject({
      alg: "RS256",
      kid: "test-key-1",
    });
    expect(verified.payload).toMatchObject({
      sub: "1a24ad91-2364-429b-a7cb-65ba0041c589",
      session_id: "39343a87-2f6a-4aea-8c1f-281cffac54ee",
      session_version: 2,
      iss: ACCESS_TOKEN_ISSUER,
      aud: ACCESS_TOKEN_AUDIENCE,
    });
    expect(issued.expiresIn).toBe(600);
  });
});
