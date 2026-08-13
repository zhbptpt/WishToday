import { performance } from "node:perf_hooks";

const SAMPLE_COUNT = 20;
const baseUrl = process.env.STAGING_BASE_URL?.trim().replace(/\/$/, "");

if (!baseUrl) {
  throw new Error("STAGING_BASE_URL is required");
}

function percentile(values: number[], percentileValue: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

const durations: number[] = [];
for (let index = 0; index < SAMPLE_COUNT; index += 1) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/healthz`, {
    signal: AbortSignal.timeout(5_000),
  });
  durations.push(performance.now() - startedAt);

  const body = await response.text();
  if (!response.ok || body !== '{"status":"ok"}') {
    throw new Error("Staging health check did not return the public ok contract");
  }
}

const p95Ms = percentile(durations, 95);
if (p95Ms > 1_000) {
  throw new Error(`Health P95 exceeded 1 second: ${p95Ms.toFixed(1)} ms`);
}

process.stdout.write(
  `${JSON.stringify(
    {
      status: "ok",
      region: process.env.RENDER_REGION ?? "unknown",
      samples: SAMPLE_COUNT,
      healthP95Ms: Number(p95Ms.toFixed(1)),
    },
    null,
    2,
  )}\n`,
);
