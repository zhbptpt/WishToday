import type { Pool, PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { DatabaseService } from "./database.service.js";

function createHarness() {
  const query = vi.fn().mockResolvedValue(undefined);
  const release = vi.fn();
  const client = { query, release } as unknown as PoolClient;
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
    end: vi.fn(),
  } as unknown as Pool;

  return { service: new DatabaseService(pool), pool, client, query, release };
}

describe("DatabaseService", () => {
  it("commits successful work on one client and releases it", async () => {
    const { service, client, query, release } = createHarness();
    await expect(service.transaction(async (tx) => {
      expect(tx).toBe(client);
      return "saved";
    })).resolves.toBe("saved");

    expect(query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "COMMIT"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back business errors and preserves the original error", async () => {
    const { service, query, release } = createHarness();
    const businessError = new Error("business failure");
    await expect(
      service.transaction(async () => {
        throw businessError;
      }),
    ).rejects.toBe(businessError);

    expect(query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "ROLLBACK"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back after commit failure and releases the client", async () => {
    const { service, query, release } = createHarness();
    const commitError = new Error("commit failure");
    query
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(commitError)
      .mockResolvedValueOnce(undefined);

    await expect(service.transaction(async () => "value")).rejects.toBe(commitError);

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN",
      "COMMIT",
      "ROLLBACK",
    ]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("does not let a rollback failure replace the original error", async () => {
    const { service, query, release } = createHarness();
    const businessError = new Error("business failure");
    query
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("rollback failure"));

    await expect(
      service.transaction(async () => {
        throw businessError;
      }),
    ).rejects.toBe(businessError);

    expect(release).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledWith(true);
  });

  it("pings PostgreSQL without exposing query results", async () => {
    const { service, pool } = createHarness();
    vi.mocked(pool.query).mockResolvedValue(undefined);

    await expect(service.ping()).resolves.toBeUndefined();
    expect(pool.query).toHaveBeenCalledWith("SELECT 1");
  });
});
