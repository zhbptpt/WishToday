import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import { Pool, type PoolClient } from "pg";

import { getServerEnv } from "../src/config/env.js";
import { assertStrictTlsStream } from "../src/database/strict-tls.js";

const SAMPLE_COUNT = 20;

type PoolClientWithConnection = PoolClient & {
  connection?: {
    stream?: unknown;
  };
};

function percentile(values: number[], percentileValue: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

async function measureDatabase(pool: Pool): Promise<number[]> {
  const durations: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startedAt = performance.now();
    await pool.query("SELECT 1");
    durations.push(performance.now() - startedAt);
  }
  return durations;
}

async function measureHealthcheck(url: string): Promise<number[]> {
  const durations: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    durations.push(performance.now() - startedAt);
    if (!response.ok || (await response.text()) !== '{"status":"ok"}') {
      throw new Error("Health check did not return the public ok contract");
    }
  }
  return durations;
}

async function run(): Promise<void> {
  const env = getServerEnv();
  if (
    process.env.RENDER !== "true" ||
    process.env.RENDER_SERVICE_NAME !== "wishtoday-api-staging" ||
    process.env.WISHTODAY_DEPLOYMENT_ENV !== "staging" ||
    process.env.WISHTODAY_DEPLOYMENT_REGION !== "singapore" ||
    process.env.WISHTODAY_DEPLOYMENT_PLAN !== "starter"
  ) {
    throw new Error(
      "Database probe must run on the Render staging service with singapore/starter attestation",
    );
  }
  const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: { ca: env.databaseCaCert, rejectUnauthorized: true },
    max: 2,
    connectionTimeoutMillis: 5_000,
    query_timeout: 750,
  });

  try {
    const contextKey = "wishtoday.probe_user_id";
    const contextValue = randomUUID();
    const client = (await pool.connect()) as PoolClientWithConnection;
    try {
      assertStrictTlsStream(client.connection?.stream);
      await client.query("BEGIN");
      const inside = await client.query<{ value: string }>(
        "SELECT set_config($1, $2, true) AS value",
        [contextKey, contextValue],
      );
      if (inside.rows[0]?.value !== contextValue) {
        throw new Error("Transaction-local context was not set");
      }
      await client.query("ROLLBACK");

      const after = await client.query<{ value: string }>(
        "SELECT current_setting($1, true) AS value",
        [contextKey],
      );
      if (after.rows[0]?.value) {
        throw new Error("Transaction-local context remained after rollback");
      }
    } finally {
      client.release();
    }

    await pool.query("SELECT 1");
    const databaseDurations = await measureDatabase(pool);
    const databaseP95Ms = percentile(databaseDurations, 95);
    if (databaseP95Ms > 500) {
      throw new Error(`Database P95 exceeded 500 ms: ${databaseP95Ms.toFixed(1)} ms`);
    }

    const result: Record<string, unknown> = {
      status: "ok",
      region: process.env.WISHTODAY_DEPLOYMENT_REGION,
      plan: process.env.WISHTODAY_DEPLOYMENT_PLAN,
      ssl: true,
      transactionContextCleared: true,
      poolRecovered: true,
      databaseSamples: SAMPLE_COUNT,
      databaseP95Ms: Number(databaseP95Ms.toFixed(1)),
    };

    const healthcheckUrl = process.env.HEALTHCHECK_URL?.trim();
    if (healthcheckUrl) {
      const healthDurations = await measureHealthcheck(healthcheckUrl);
      const healthP95Ms = percentile(healthDurations, 95);
      if (healthP95Ms > 1_000) {
        throw new Error(`Health P95 exceeded 1 second: ${healthP95Ms.toFixed(1)} ms`);
      }
      result.healthSamples = SAMPLE_COUNT;
      result.healthP95Ms = Number(healthP95Ms.toFixed(1));
    }

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

await run();
