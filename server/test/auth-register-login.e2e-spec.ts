import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthController } from "../src/auth/auth.controller.js";
import { AUTH_CONFIG } from "../src/auth/auth.constants.js";
import { AuthRepository } from "../src/auth/auth.repository.js";
import { AuthService } from "../src/auth/auth.service.js";
import { AccessTokenIssuer } from "../src/auth/access-token-issuer.js";
import { PasswordHasher } from "../src/auth/password-hasher.js";
import { TokenHasher } from "../src/auth/token-hasher.js";
import { MAIL_PORT, type MailPort } from "../src/mail/mail.port.js";
import { RateLimitService } from "../src/rate-limit/rate-limit.service.js";
import { RequestIdMiddleware } from "../src/common/request-id.middleware.js";
import { configureTrustedProxy } from "../src/main.js";

const REQUEST_ID = "auth-test-request-0001";
const GENERIC_ACCEPTED = {
  ok: true,
  data: { status: "ACCEPTED" },
  requestId: REQUEST_ID,
};

interface AccountRecord {
  userId: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  status: "active" | "disabled";
  sessionVersion: number;
}

class InMemoryAuthRepository implements Partial<AuthRepository> {
  readonly accounts = new Map<string, AccountRecord>();
  readonly verificationTokens = new Map<string, string>();
  readonly sessions: Array<{ id: string; userId: string }> = [];

  async createRegistration(input: {
    email: string;
    passwordHash: string;
    verificationTokenHash: Buffer;
    verificationExpiresAt: Date;
  }): Promise<"created" | "exists"> {
    if (this.accounts.has(input.email)) return "exists";
    const userId = `user-${this.accounts.size + 1}`;
    this.accounts.set(input.email, {
      userId,
      email: input.email,
      passwordHash: input.passwordHash,
      emailVerifiedAt: null,
      status: "active",
      sessionVersion: 1,
    });
    this.verificationTokens.set(
      input.verificationTokenHash.toString("hex"),
      userId,
    );
    return "created";
  }

  async replaceVerificationToken(input: {
    email: string;
    tokenHash: Buffer;
    expiresAt: Date;
  }): Promise<string | null> {
    const account = this.accounts.get(input.email);
    if (!account || account.emailVerifiedAt || account.status !== "active") {
      return null;
    }
    this.verificationTokens.set(input.tokenHash.toString("hex"), account.userId);
    return account.email;
  }

  async consumeVerificationToken(tokenHash: Buffer): Promise<void> {
    const userId = this.verificationTokens.get(tokenHash.toString("hex"));
    if (!userId) return;
    const account = [...this.accounts.values()].find(
      (candidate) => candidate.userId === userId,
    );
    if (account) account.emailVerifiedAt ??= new Date();
  }

  async findLoginAccount(email: string): Promise<AccountRecord | null> {
    return this.accounts.get(email) ?? null;
  }

  async createSession(input: { userId: string }): Promise<{ id: string }> {
    const session = { id: `session-${this.sessions.length + 1}`, ...input };
    this.sessions.push(session);
    return { id: session.id };
  }
}

describe("registration, email verification, and login", () => {
  let app: INestApplication;
  let repository: InMemoryAuthRepository;
  let sentVerification: Array<{ to: string; link: string }>;
  let order: string[];
  let rateLimitKeys: string[];
  let mailGate: Promise<void> | undefined;

  beforeEach(async () => {
    repository = new InMemoryAuthRepository();
    sentVerification = [];
    order = [];
    rateLimitKeys = [];
    mailGate = undefined;

    const passwordHasher = {
      hash: vi.fn(async (password: string) => {
        order.push("password-hash");
        return `encoded:${password}`;
      }),
      verify: vi.fn(async (encoded: string, password: string) => {
        order.push("password-verify");
        return encoded === `encoded:${password}`;
      }),
      verifyDummy: vi.fn(async () => {
        order.push("password-verify");
        return false;
      }),
    };
    const tokenHasher = {
      issue: vi.fn(() => {
        const rawToken = `token-${sentVerification.length + 1}`.padEnd(43, "x");
        return {
          rawToken,
          tokenHash: Buffer.from(rawToken.padEnd(64, "0").slice(0, 64)),
        };
      }),
      hash: vi.fn((token: string) =>
        Buffer.from(token.padEnd(64, "0").slice(0, 64)),
      ),
    };
    const mailPort: MailPort = {
      sendVerification: vi.fn(async (input) => {
        order.push("mail");
        sentVerification.push(input);
        await mailGate;
      }),
      sendPasswordRecovery: vi.fn(async () => undefined),
    };
    const rateLimit = {
      consume: vi.fn(async (key: string) => {
        order.push("rate-limit");
        rateLimitKeys.push(key);
      }),
    };
    const accessTokenIssuer = {
      issue: vi.fn(async () => ({
        accessToken: "signed-access-token",
        expiresIn: 600,
      })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: repository },
        { provide: PasswordHasher, useValue: passwordHasher },
        { provide: TokenHasher, useValue: tokenHasher },
        { provide: MAIL_PORT, useValue: mailPort },
        { provide: RateLimitService, useValue: rateLimit },
        { provide: AccessTokenIssuer, useValue: accessTokenIssuer },
        {
          provide: AUTH_CONFIG,
          useValue: {
            tokenPepper: "test-only-pepper-that-is-at-least-32-bytes",
            jwtPrivateKey: "unused-in-this-test",
            jwtKeyId: "test-key",
            frontendBaseUrl: "https://app.example.com",
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureTrustedProxy(app);
    app.use((req: Request, res: Response, next: NextFunction) =>
      new RequestIdMiddleware().use(req, res, next),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function post(path: string, body: object) {
    return request(app.getHttpServer())
      .post(`/api/v1/auth/${path}`)
      .set("x-request-id", REQUEST_ID)
      .send(body);
  }

  it("returns the same generic registration response for new and existing emails", async () => {
    const input = { email: " Person@Example.com ", password: "valid-password-123" };

    const first = await post("register", input);
    const second = await post("register", input);

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(first.body).toEqual(GENERIC_ACCEPTED);
    expect(second.body).toEqual(GENERIC_ACCEPTED);
    expect(sentVerification).toHaveLength(1);
    expect(JSON.stringify([first.body, second.body])).not.toMatch(
      /passwordHash|tokenHash|exists|already/i,
    );
  });

  it("rate limits before hashing passwords or sending verification mail", async () => {
    await post("register", {
      email: "person@example.com",
      password: "valid-password-123",
    });

    expect(order.slice(0, 2)).toEqual(["rate-limit", "rate-limit"]);
    expect(order.indexOf("password-hash")).toBeGreaterThan(1);
    expect(order.indexOf("mail")).toBeGreaterThan(order.indexOf("password-hash"));
  });

  it("uses the client address from the single trusted Render proxy hop", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .set("x-request-id", REQUEST_ID)
      .set("x-forwarded-for", "203.0.113.42")
      .send({
        email: "person@example.com",
        password: "valid-password-123",
      });

    expect(rateLimitKeys[0]).toBe("ip:203.0.113.42");
  });

  it("does not keep registration or resend responses waiting on mail delivery", async () => {
    async function completeBeforeMail(work: () => Promise<unknown>) {
      let releaseMail!: () => void;
      mailGate = new Promise<void>((resolve) => {
        releaseMail = resolve;
      });
      const response = work();
      const outcome = await Promise.race([
        response.then(() => "responded" as const),
        new Promise<"blocked">((resolve) =>
          setTimeout(() => resolve("blocked"), 250),
        ),
      ]);
      releaseMail();
      await response;
      mailGate = undefined;
      expect(outcome).toBe("responded");
    }

    await completeBeforeMail(() =>
      post("register", {
        email: "person@example.com",
        password: "valid-password-123",
      }),
    );
    await completeBeforeMail(() =>
      post("resend-verification", { email: "person@example.com" }),
    );
  });

  it("rejects unverified accounts and maps unknown and wrong passwords identically", async () => {
    await post("register", {
      email: "person@example.com",
      password: "valid-password-123",
    });

    const unverified = await post("login", {
      email: "person@example.com",
      password: "valid-password-123",
    });
    const wrong = await post("login", {
      email: "person@example.com",
      password: "wrong-password-123",
    });
    const unknown = await post("login", {
      email: "unknown@example.com",
      password: "wrong-password-123",
    });

    expect(unverified.status).toBe(403);
    expect(unverified.body.code).toBe("EMAIL_UNVERIFIED");
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(JSON.stringify([unverified.body, wrong.body, unknown.body])).not.toMatch(
      /passwordHash|tokenHash|exists/i,
    );
  });

  it("atomically verifies a token and logs in with a session-backed access token", async () => {
    await post("register", {
      email: "person@example.com",
      password: "valid-password-123",
    });
    const verificationToken = new URL(sentVerification[0].link).hash.match(
      /token=([^&]+)/,
    )?.[1];

    const verified = await post("verify-email", { token: verificationToken });
    const replayed = await post("verify-email", { token: verificationToken });
    const login = await post("login", {
      email: "person@example.com",
      password: "valid-password-123",
    });

    expect(verified.status).toBe(200);
    expect(replayed.body).toEqual(verified.body);
    expect(login.status).toBe(200);
    expect(login.body).toEqual({
      ok: true,
      data: {
        accessToken: "signed-access-token",
        expiresIn: 600,
        tokenType: "Bearer",
        csrfToken: expect.any(String),
      },
      requestId: REQUEST_ID,
    });
    expect(repository.sessions).toHaveLength(1);
    expect(JSON.stringify(login.body)).not.toMatch(/email|passwordHash|tokenHash/i);
  });

  it("returns the same resend response without disclosing whether the email exists", async () => {
    await post("register", {
      email: "person@example.com",
      password: "valid-password-123",
    });
    sentVerification.length = 0;

    const existing = await post("resend-verification", {
      email: "person@example.com",
    });
    const unknown = await post("resend-verification", {
      email: "unknown@example.com",
    });

    expect(existing.status).toBe(202);
    expect(existing.body).toEqual(GENERIC_ACCEPTED);
    expect(unknown.body).toEqual(existing.body);
    expect(sentVerification).toHaveLength(1);
  });

  it("rejects oversized and unexpected DTO fields", async () => {
    const response = await post("register", {
      email: `${"a".repeat(310)}@example.com`,
      password: "valid-password-123",
      role: "admin",
    });

    expect(response.status).toBe(400);
    expect(repository.accounts.size).toBe(0);
  });
});
