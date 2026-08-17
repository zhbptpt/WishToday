import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DATABASE_HEALTH } from "../src/database/database.constants.js";
import { HealthController } from "../src/health/health.controller.js";

describe("GET /healthz", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function createApp(ping: () => Promise<void>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DATABASE_HEALTH, useValue: { ping } }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    return app;
  }

  it("returns ok only after a successful database ping", async () => {
    const ping = vi.fn().mockResolvedValue(undefined);
    const testApp = await createApp(ping);

    await request(testApp.getHttpServer())
      .get("/healthz")
      .expect(200, { status: "ok" });
    expect(ping).toHaveBeenCalledOnce();
  });

  it("returns a non-2xx response without secrets when the database fails", async () => {
    const secret = "postgresql://user:password@private-host/database";
    const testApp = await createApp(() => Promise.reject(new Error(secret)));

    const response = await request(testApp.getHttpServer()).get("/healthz");

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.text).not.toContain(secret);
    expect(response.text).not.toContain("private-host");
  });
});
