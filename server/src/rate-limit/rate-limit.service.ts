import { createHmac } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { ScopedDatabaseService } from "../database/scoped-database.service.js";

export const RATE_LIMIT_CONFIG = Symbol("RATE_LIMIT_CONFIG");

type RateLimitWindow = "5m" | "1h";
type RateLimitConfig = { tokenPepper: string };

const WINDOW_MILLISECONDS: Record<RateLimitWindow, number> = {
  "5m": 5 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

export class RateLimitExceededError extends Error {
  constructor(readonly retryAfter: number) {
    super("Rate limit exceeded");
  }
}

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(ScopedDatabaseService)
    private readonly database: ScopedDatabaseService,
    @Inject(RATE_LIMIT_CONFIG) private readonly config: RateLimitConfig,
  ) {}

  async consume(key: string, window: RateLimitWindow, limit: number): Promise<void> {
    const now = Date.now();
    const duration = WINDOW_MILLISECONDS[window];
    const windowStartMs = Math.floor(now / duration) * duration;
    const windowStart = new Date(windowStartMs);
    const expiresAt = new Date(windowStartMs + duration);
    const subjectHash = createHmac("sha256", this.config.tokenPepper)
      .update(key, "utf8")
      .digest();

    const count = await this.database.authTransaction(async (client) => {
      const result = await client.query<{ request_count: number }>(
        `insert into public.rate_limit_counters (
           subject_hash, window_kind, window_start, request_count, expires_at
         ) values ($1, $2, $3, 1, $4)
         on conflict (subject_hash, window_kind, window_start)
         do update set
           request_count = public.rate_limit_counters.request_count + 1,
           expires_at = excluded.expires_at,
           updated_at = now()
         returning request_count`,
        [subjectHash, window, windowStart, expiresAt],
      );
      const requestCount = result.rows[0].request_count;
      if (requestCount === 1) {
        await client.query(
          `with expired as (
             select ctid
             from public.rate_limit_counters
             where expires_at <= now()
             order by expires_at
             limit 100
             for update skip locked
           )
           delete from public.rate_limit_counters counters
           using expired
           where counters.ctid = expired.ctid`,
        );
      }
      return requestCount;
    });

    if (count > limit) {
      const retryAfter = Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000));
      throw new RateLimitExceededError(retryAfter);
    }
  }
}
