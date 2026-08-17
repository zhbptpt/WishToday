import { describe, expect, it } from "vitest";

import type { ServerEnv } from "../config/env.js";
import { DATABASE_HEALTH } from "./database.constants.js";
import { DatabaseService } from "./database.service.js";
import { DatabaseModule, createDatabasePool } from "./database.module.js";
import { ScopedDatabaseService } from "./scoped-database.service.js";

const env = {
  databaseUrl: "postgresql://user:password@db.example.com:5432/wishtoday",
  databaseCaCert: "test-ca-certificate",
} as ServerEnv;

describe("createDatabasePool", () => {
  it("enforces certificate verification and bounded waits", async () => {
    const pool = createDatabasePool(env);

    expect(pool.options.ssl).toEqual({
      ca: "test-ca-certificate",
      rejectUnauthorized: true,
    });
    expect(pool.options.connectionTimeoutMillis).toBe(5_000);
    expect(pool.options.query_timeout).toBe(750);
    expect(pool.listenerCount("error")).toBeGreaterThan(0);

    await pool.end();
  });

  it("exports only scoped repository access and the health probe", () => {
    const module = DatabaseModule.register(env);

    expect(module.exports).toContain(ScopedDatabaseService);
    expect(module.exports).toContain(DATABASE_HEALTH);
    expect(module.exports).not.toContain(DatabaseService);
  });
});
