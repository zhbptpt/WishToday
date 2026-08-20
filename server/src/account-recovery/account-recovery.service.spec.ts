import { describe, expect, it } from "vitest";

import { PasswordHasher } from "../auth/password-hasher.js";
import { TokenHasher } from "../auth/token-hasher.js";
import type { MailPort } from "../mail/mail.port.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { AccountRecoveryRepository } from "./account-recovery.repository.js";
import { AccountRecoveryService } from "./account-recovery.service.js";

describe("AccountRecoveryService", () => {
  it("normalizes the recovery email before rate limiting and lookup", async () => {
    const consumedKeys: string[] = [];
    let repositoryEmail = "";
    const service = new AccountRecoveryService(
      {
        createRecovery: async (input: { email: string }) => {
          repositoryEmail = input.email;
          return null;
        },
      } as unknown as AccountRecoveryRepository,
      {} as PasswordHasher,
      {
        issue: () => ({ rawToken: "raw-token", tokenHash: Buffer.alloc(32) }),
      } as unknown as TokenHasher,
      {} as MailPort,
      {
        consume: async (key: string) => {
          consumedKeys.push(key);
        },
      } as unknown as RateLimitService,
      { frontendBaseUrl: "https://app.example.com" },
    );

    await service.requestRecovery({
      email: "  Person@Example.COM  ",
      ip: "203.0.113.7",
    });

    expect(consumedKeys).toEqual([
      "ip:203.0.113.7",
      "email:person@example.com",
    ]);
    expect(repositoryEmail).toBe("person@example.com");
  });

  it("rejects an invalid reset token before running Argon2", async () => {
    let hashCalls = 0;
    let resetCalls = 0;
    const service = new AccountRecoveryService(
      {
        inspectPasswordReset: async () => "invalid",
        resetPassword: async () => {
          resetCalls += 1;
          return "invalid";
        },
      } as unknown as AccountRecoveryRepository,
      {
        hash: async () => {
          hashCalls += 1;
          return "must-not-be-computed";
        },
      } as unknown as PasswordHasher,
      {
        hash: () => Buffer.alloc(32),
      } as unknown as TokenHasher,
      {} as MailPort,
      {
        consume: async () => undefined,
      } as unknown as RateLimitService,
      { frontendBaseUrl: "https://app.example.com" },
    );

    await expect(
      service.resetPassword({
        operationId: "1a24ad91-2364-429b-a7cb-65ba0041c589",
        token: "invalid-recovery-token",
        newPassword: "replacement-password-123",
        ip: "203.0.113.8",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(hashCalls).toBe(0);
    expect(resetCalls).toBe(0);
  });
});
