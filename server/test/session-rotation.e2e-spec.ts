import { generateKeyPairSync } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import { SignJWT } from "jose";
import request from "supertest";
import cookieParser from "cookie-parser";
import { afterEach, describe, expect, it } from "vitest";

import { AuthController } from "../src/auth/auth.controller.js";
import { AUTH_CONFIG } from "../src/auth/auth.constants.js";
import { AuthRepository } from "../src/auth/auth.repository.js";
import { AuthService } from "../src/auth/auth.service.js";
import { AuthGuard } from "../src/common/auth.guard.js";
import { CsrfGuard } from "../src/common/csrf.guard.js";
import { AccessTokenVerifier } from "../src/sessions/access-token-verifier.js";
import { SessionController } from "../src/sessions/session.controller.js";

const REQUEST_ID = "session-test-request-0001";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

async function accessToken(overrides: {
  issuer?: string;
  audience?: string;
  expiresIn?: string;
  sessionVersion?: number;
  keyId?: string;
  omitIssuedAt?: boolean;
  omitExpiresAt?: boolean;
} = {}): Promise<string> {
  let token = new SignJWT({
    session_id: "39343a87-2f6a-4aea-8c1f-281cffac54ee",
    session_version: overrides.sessionVersion ?? 1,
  })
    .setProtectedHeader({ alg: "RS256", kid: overrides.keyId ?? "test-key" })
    .setSubject("1a24ad91-2364-429b-a7cb-65ba0041c589")
    .setIssuer(overrides.issuer ?? "wishtoday-api")
    .setAudience(overrides.audience ?? "wishtoday-web");
  if (!overrides.omitIssuedAt) token = token.setIssuedAt();
  if (!overrides.omitExpiresAt) {
    token = token.setExpirationTime(overrides.expiresIn ?? "10m");
  }
  return token.sign(privateKey);
}

describe("rotating browser sessions", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("sets host-only secure refresh and CSRF cookies without returning the refresh token", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        CsrfGuard,
        AccessTokenVerifier,
        {
          provide: AuthRepository,
          useValue: { validateSession: async () => ({ status: "missing" }) },
        },
        { provide: AuthGuard, useValue: { canActivate: () => true } },
        {
          provide: AuthService,
          useValue: {
            login: async () => ({
              accessToken: "signed-access-token",
              expiresIn: 600,
              refreshToken: "raw-refresh-token",
              csrfToken: "raw-csrf-token",
            }),
          },
        },
        {
          provide: AUTH_CONFIG,
          useValue: { allowedOrigins: ["https://app.example.com"] },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((_request: Request, response: Response, next: NextFunction) => {
      response.setHeader("x-request-id", REQUEST_ID);
      next();
    });
    app.setGlobalPrefix("api/v1");
    await app.init();

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "person@example.com", password: "valid-password-123" });

    expect(response.status).toBe(200);
    const cookies = response.headers["set-cookie"] as unknown as string[];
    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith("__Host-wishtoday_refresh=raw-refresh-token;"),
    );
    const csrfCookie = cookies.find((cookie) =>
      cookie.startsWith("__Host-wishtoday_csrf=raw-csrf-token;"),
    );
    expect(refreshCookie).toMatch(/Max-Age=2592000/);
    expect(refreshCookie).toMatch(/Path=\//);
    expect(refreshCookie).toMatch(/HttpOnly/);
    expect(refreshCookie).toMatch(/Secure/);
    expect(refreshCookie).toMatch(/SameSite=Lax/);
    expect(csrfCookie).toMatch(/Max-Age=2592000/);
    expect(csrfCookie).toMatch(/Path=\//);
    expect(csrfCookie).not.toMatch(/HttpOnly/);
    expect(csrfCookie).toMatch(/Secure/);
    expect(csrfCookie).toMatch(/SameSite=Lax/);
    expect(cookies.join(";")).not.toContain("Domain=");
    expect(response.body.data).toEqual({
      accessToken: "signed-access-token",
      expiresIn: 600,
      tokenType: "Bearer",
      csrfToken: "raw-csrf-token",
    });
    expect(JSON.stringify(response.body)).not.toContain("raw-refresh-token");
  });

  it("rotates a refresh cookie and returns only a new access token and CSRF token", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        CsrfGuard,
        AccessTokenVerifier,
        {
          provide: AuthRepository,
          useValue: { validateSession: async () => ({ status: "missing" }) },
        },
        { provide: AuthGuard, useValue: { canActivate: () => true } },
        {
          provide: AuthService,
          useValue: {
            refresh: async () => ({
              accessToken: "rotated-access-token",
              expiresIn: 600,
              refreshToken: "rotated-refresh-token",
              csrfToken: "rotated-csrf-token",
            }),
          },
        },
        {
          provide: AUTH_CONFIG,
          useValue: { allowedOrigins: ["https://app.example.com"] },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    await app.init();

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("origin", "https://app.example.com")
      .set("x-csrf-token", "current-csrf-token")
      .set(
        "cookie",
        "__Host-wishtoday_refresh=current-refresh-token; __Host-wishtoday_csrf=current-csrf-token",
      );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      accessToken: "rotated-access-token",
      expiresIn: 600,
      tokenType: "Bearer",
      csrfToken: "rotated-csrf-token",
    });
    expect(JSON.stringify(response.body)).not.toContain("rotated-refresh-token");
  });

  it("rejects refresh requests with an untrusted origin or mismatched CSRF token", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        CsrfGuard,
        AccessTokenVerifier,
        {
          provide: AuthRepository,
          useValue: { validateSession: async () => ({ status: "missing" }) },
        },
        { provide: AuthGuard, useValue: { canActivate: () => true } },
        {
          provide: AuthService,
          useValue: {
            refresh: async () => ({
              accessToken: "must-not-be-issued",
              expiresIn: 600,
              refreshToken: "must-not-be-rotated",
              csrfToken: "must-not-be-returned",
            }),
          },
        },
        {
          provide: AUTH_CONFIG,
          useValue: { allowedOrigins: ["https://app.example.com"] },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    await app.init();

    const cookie =
      "__Host-wishtoday_refresh=current-refresh-token; __Host-wishtoday_csrf=current-csrf-token";
    const untrusted = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("origin", "https://attacker.example")
      .set("x-csrf-token", "current-csrf-token")
      .set("cookie", cookie);
    const mismatch = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("origin", "https://app.example.com")
      .set("x-csrf-token", "different-csrf-token")
      .set("cookie", cookie);

    expect(untrusted.status).toBe(403);
    expect(mismatch.status).toBe(403);
    expect(JSON.stringify([untrusted.body, mismatch.body])).not.toMatch(
      /current-refresh-token|current-csrf-token/,
    );
  });

  it("logs out only the session identified by the current refresh cookie", async () => {
    const loggedOutTokens: string[] = [];
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        CsrfGuard,
        AccessTokenVerifier,
        {
          provide: AuthRepository,
          useValue: { validateSession: async () => ({ status: "missing" }) },
        },
        { provide: AuthGuard, useValue: { canActivate: () => true } },
        {
          provide: AuthService,
          useValue: {
            logout: async ({ refreshToken }: { refreshToken?: string }) => {
              if (refreshToken) loggedOutTokens.push(refreshToken);
            },
          },
        },
        {
          provide: AUTH_CONFIG,
          useValue: { allowedOrigins: ["https://app.example.com"] },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    await app.init();

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("origin", "https://app.example.com")
      .set("x-csrf-token", "device-a-csrf-token")
      .set(
        "cookie",
        "__Host-wishtoday_refresh=device-a-refresh-token; __Host-wishtoday_csrf=device-a-csrf-token",
      );

    expect(response.status).toBe(200);
    expect(loggedOutTokens).toEqual(["device-a-refresh-token"]);
    const clearedCookies = response.headers["set-cookie"] as unknown as string[];
    expect(clearedCookies.join(";")).toMatch(
      /__Host-wishtoday_refresh=;.*Max-Age=0/,
    );
    expect(clearedCookies.join(";")).toMatch(
      /__Host-wishtoday_csrf=;.*Max-Age=0/,
    );
  });

  it("returns the current account only for a valid session-backed access token", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        AuthGuard,
        AccessTokenVerifier,
        {
          provide: AuthService,
          useValue: {},
        },
        {
          provide: AuthRepository,
          useValue: {
            validateSession: async (claims: { sessionVersion: number }) =>
              claims.sessionVersion === 1
                ? { status: "valid", email: "person@example.com" }
                : { status: "revoked" },
          },
        },
        {
          provide: AUTH_CONFIG,
          useValue: {
            jwtPublicKey: publicKey
              .export({ format: "pem", type: "spki" })
              .toString(),
            jwtKeyId: "test-key",
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("authorization", `Bearer ${await accessToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      id: "1a24ad91-2364-429b-a7cb-65ba0041c589",
      email: "person@example.com",
    });

    const rejectedTokens = [
      await accessToken({ issuer: "other-issuer" }),
      await accessToken({ audience: "other-audience" }),
      await accessToken({ expiresIn: "-1s" }),
      await accessToken({ keyId: "retired-key" }),
      await accessToken({ omitExpiresAt: true }),
      await accessToken({ omitIssuedAt: true }),
      await new SignJWT({
        session_id: "39343a87-2f6a-4aea-8c1f-281cffac54ee",
        session_version: 1,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("1a24ad91-2364-429b-a7cb-65ba0041c589")
        .setIssuer("wishtoday-api")
        .setAudience("wishtoday-web")
        .setExpirationTime("10m")
        .sign(new TextEncoder().encode("test-only-symmetric-key-32-bytes")),
    ];
    for (const token of rejectedTokens) {
      const rejected = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("authorization", `Bearer ${token}`);
      expect(rejected.status).toBe(401);
      expect(rejected.body.code).toBe("AUTH_REQUIRED");
    }

    const stale = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set(
        "authorization",
        `Bearer ${await accessToken({ sessionVersion: 2 })}`,
      );
    expect(stale.status).toBe(401);
    expect(stale.body.code).toBe("SESSION_REVOKED");
  });
});
