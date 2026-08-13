import { describe, expect, it } from "vitest";

import type { ServerEnv } from "../config/env.js";
import { createDatabasePool } from "./database.module.js";

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
});
