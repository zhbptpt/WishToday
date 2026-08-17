import type { PoolClient, QueryResult } from "pg";
import { describe, expect, it, vi } from "vitest";

import type { ScopedDatabaseService } from "../database/scoped-database.service.js";
import {
  RateLimitExceededError,
  RateLimitService,
} from "./rate-limit.service.js";

describe("RateLimitService", () => {
  it("atomically increments a peppered subject without sending the raw key", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ request_count: 1 }] });
    const database = {
      authTransaction: async (work: (client: PoolClient) => Promise<unknown>) =>
        work({ query } as unknown as PoolClient),
    } as ScopedDatabaseService;
    const service = new RateLimitService(database, {
      tokenPepper: "test-only-pepper-that-is-at-least-32-bytes",
    });

    await service.consume("email:private@example.com", "1h", 3);

    const [sql, parameters] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/on conflict[\s\S]+request_count =/i);
    expect(JSON.stringify(parameters)).not.toContain("private@example.com");
    expect(parameters[0]).toBeInstanceOf(Buffer);
  });

  it("returns a bounded retry delay after committing an over-limit count", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ request_count: 4 }],
    } as QueryResult);
    const database = {
      authTransaction: async (work: (client: PoolClient) => Promise<unknown>) =>
        work({ query } as unknown as PoolClient),
    } as ScopedDatabaseService;
    const service = new RateLimitService(database, {
      tokenPepper: "test-only-pepper-that-is-at-least-32-bytes",
    });

    const error = await service
      .consume("email:private@example.com", "1h", 3)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RateLimitExceededError);
    expect((error as RateLimitExceededError).retryAfter).toBeGreaterThan(0);
    expect((error as RateLimitExceededError).retryAfter).toBeLessThanOrEqual(3600);
  });

  it("removes only a bounded batch of expired counters on a new window", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ request_count: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    const database = {
      authTransaction: async (work: (client: PoolClient) => Promise<unknown>) =>
        work({ query } as unknown as PoolClient),
    } as ScopedDatabaseService;
    const service = new RateLimitService(database, {
      tokenPepper: "test-only-pepper-that-is-at-least-32-bytes",
    });

    await service.consume("email:private@example.com", "1h", 3);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toMatch(/expires_at <= now\(\)[\s\S]+limit 100/i);
    expect(query.mock.calls[1][0]).toMatch(/limit 100[\s\S]+for update skip locked/i);
  });
});
