import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { AccountRecoveryController } from "../src/account-recovery/account-recovery.controller.js";
import { AccountRecoveryService } from "../src/account-recovery/account-recovery.service.js";
import { AuthError } from "../src/auth/auth.error.js";

describe("password recovery transaction", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("returns the same generic recovery response for existing and unknown emails", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountRecoveryController],
      providers: [
        { provide: AccountRecoveryService, useValue: { requestRecovery: async () => undefined } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    const existing = await request(app.getHttpServer())
      .post("/api/v1/auth/password-recovery")
      .send({ email: "person@example.com" });
    const unknown = await request(app.getHttpServer())
      .post("/api/v1/auth/password-recovery")
      .send({ email: "unknown@example.com" });

    expect(existing.status).toBe(202);
    expect(unknown.body).toEqual(existing.body);
    expect(JSON.stringify(existing.body)).not.toMatch(/email|exists|token/i);
  });

  it("keeps reset retries stable and requires the same token for status queries", async () => {
    const operationId = "5a7dfce8-61f2-4df7-bec2-88a704545d27";
    const token = "r".repeat(43);
    let resetCalls = 0;
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountRecoveryController],
      providers: [
        {
          provide: AccountRecoveryService,
          useValue: {
            resetPassword: async () => {
              resetCalls += 1;
            },
            getStatus: async (input: {
              operationId: string;
              token: string;
            }) => {
              if (input.operationId !== operationId || input.token !== token) {
                throw new AuthError("NOT_FOUND", 404);
              }
              return "completed" as const;
            },
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    const resetBody = {
      operationId,
      token,
      newPassword: "new-valid-password-123",
    };
    const first = await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset")
      .send(resetBody);
    const retry = await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset")
      .send(resetBody);
    const status = await request(app.getHttpServer())
      .post(`/api/v1/auth/password-reset-operations/${operationId}/status`)
      .send({ token });
    const wrongToken = await request(app.getHttpServer())
      .post(`/api/v1/auth/password-reset-operations/${operationId}/status`)
      .send({ token: "w".repeat(43) });

    expect(first.status).toBe(200);
    expect(retry.body).toEqual(first.body);
    expect(resetCalls).toBe(2);
    expect(status.status).toBe(200);
    expect(status.body.data).toEqual({ status: "completed" });
    expect(wrongToken.status).toBe(404);
    expect(JSON.stringify([first.body, status.body, wrongToken.body])).not.toMatch(
      /new-valid-password|r{20}|w{20}/,
    );
  });
});
