import { generateKeyPairSync } from "node:crypto";
import { rootCertificates } from "node:tls";

import { describe, expect, it } from "vitest";

import { getServerEnv } from "./env.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

function encodePem(pem: string | Buffer): string {
  return Buffer.from(pem).toString("base64");
}

const validSecrets = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:password@db.example.com:5432/wishtoday",
  DATABASE_SSL_MODE: "require",
  DATABASE_CA_CERT_BASE64: encodePem(rootCertificates[0]!),
  JWT_PRIVATE_KEY_BASE64: Buffer.from(
    privateKey.export({ format: "pem", type: "pkcs8" }),
  ).toString("base64"),
  JWT_PUBLIC_KEY_BASE64: Buffer.from(
    publicKey.export({ format: "pem", type: "spki" }),
  ).toString("base64"),
  JWT_KEY_ID: "staging-2026-08",
  TOKEN_PEPPER: "a-test-only-pepper-with-sufficient-length",
  ALLOWED_ORIGINS: "https://staging.wishtoday.example",
  PORT: "3000",
};

describe("getServerEnv", () => {
  for (const name of [
    "DATABASE_URL",
    "DATABASE_CA_CERT_BASE64",
    "JWT_PRIVATE_KEY_BASE64",
    "JWT_PUBLIC_KEY_BASE64",
    "JWT_KEY_ID",
    "TOKEN_PEPPER",
    "ALLOWED_ORIGINS",
  ] as const) {
    it(`rejects a missing ${name}`, () => {
      const source = { ...validSecrets };
      delete source[name];

      expect(() => getServerEnv(source)).toThrow(name);
    });
  }

  it("rejects wildcard origins", () => {
    expect(() =>
      getServerEnv({ ...validSecrets, ALLOWED_ORIGINS: "*" }),
    ).toThrow("ALLOWED_ORIGINS");
  });

  it("rejects non-HTTPS origins in production", () => {
    expect(() =>
      getServerEnv({
        ...validSecrets,
        NODE_ENV: "production",
        ALLOWED_ORIGINS: "http://wishtoday.example",
      }),
    ).toThrow("HTTPS");
  });

  it("rejects invalid Base64 PEM values", () => {
    expect(() =>
      getServerEnv({
        ...validSecrets,
        JWT_PRIVATE_KEY_BASE64: "not-base64!",
      }),
    ).toThrow("JWT_PRIVATE_KEY_BASE64");
  });

  it("rejects DATABASE_URL parameters that can override required TLS", () => {
    expect(() =>
      getServerEnv({
        ...validSecrets,
        DATABASE_URL:
          "postgresql://user:password@db.example.com:5432/wishtoday?sslmode=disable",
      }),
    ).toThrow("DATABASE_URL");

    expect(() =>
      getServerEnv({
        ...validSecrets,
        DATABASE_URL:
          "postgresql://user:password@db.example.com:5432/wishtoday?ssl=true",
      }),
    ).toThrow("DATABASE_URL");

    expect(() =>
      getServerEnv({
        ...validSecrets,
        DATABASE_URL:
          "postgresql://user:password@db.example.com:5432/wishtoday?channel_binding=disable",
      }),
    ).toThrow("DATABASE_URL");
  });

  it("rejects invalid Base64 database CA certificates", () => {
    expect(() =>
      getServerEnv({
        ...validSecrets,
        DATABASE_CA_CERT_BASE64: encodePem("not a certificate"),
      }),
    ).toThrow("DATABASE_CA_CERT_BASE64");
  });

  it("rejects RSA keys that do not form a pair", () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });

    expect(() =>
      getServerEnv({
        ...validSecrets,
        JWT_PUBLIC_KEY_BASE64: encodePem(
          other.publicKey.export({ format: "pem", type: "spki" }),
        ),
      }),
    ).toThrow("matching RSA key pair");
  });

  it("rejects RSA keys weaker than 2048 bits", () => {
    const weak = generateKeyPairSync("rsa", { modulusLength: 1024 });

    expect(() =>
      getServerEnv({
        ...validSecrets,
        JWT_PRIVATE_KEY_BASE64: encodePem(
          weak.privateKey.export({ format: "pem", type: "pkcs8" }),
        ),
        JWT_PUBLIC_KEY_BASE64: encodePem(
          weak.publicKey.export({ format: "pem", type: "spki" }),
        ),
      }),
    ).toThrow("2048 bits");
  });

  it("rejects token peppers shorter than 32 UTF-8 bytes", () => {
    expect(() =>
      getServerEnv({ ...validSecrets, TOKEN_PEPPER: "too-short" }),
    ).toThrow("TOKEN_PEPPER");
  });

  it("parses a complete environment without requiring Resend", () => {
    const env = getServerEnv(validSecrets);

    expect(env.allowedOrigins).toEqual(["https://staging.wishtoday.example"]);
    expect(env.databaseSslMode).toBe("require");
    expect(env.databaseCaCert).toContain("BEGIN CERTIFICATE");
    expect(env.port).toBe(3000);
    expect(env.resendApiKey).toBeUndefined();
  });
});
