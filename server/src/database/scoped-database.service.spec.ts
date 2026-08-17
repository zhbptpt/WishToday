import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import type { DatabaseService } from "./database.service.js";
import { ScopedDatabaseService } from "./scoped-database.service.js";

describe("ScopedDatabaseService", () => {
  it("sets the fixed authentication role before running repository work", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const database = {
      transaction: async (work: (client: PoolClient) => Promise<unknown>) =>
        work({ query } as unknown as PoolClient),
    } as DatabaseService;
    const scoped = new ScopedDatabaseService(database);

    await scoped.authTransaction(async (client) => {
      await client.query("select 1");
    });

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "SET LOCAL ROLE wishtoday_auth_repository",
      "select 1",
    ]);
  });
});
