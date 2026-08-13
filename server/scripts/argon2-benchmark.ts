import { cpus, freemem, platform, release } from "node:os";
import { performance } from "node:perf_hooks";

import { hash, argon2id } from "argon2";

const SAMPLE_COUNT = 20;
const localMode = process.env.ARGON2_BENCHMARK_MODE === "local";
const stagingAttested =
  process.env.RENDER === "true" &&
  process.env.RENDER_SERVICE_NAME === "wishtoday-api-staging" &&
  process.env.WISHTODAY_DEPLOYMENT_ENV === "staging" &&
  process.env.WISHTODAY_DEPLOYMENT_REGION === "singapore" &&
  process.env.WISHTODAY_DEPLOYMENT_PLAN === "starter";

if (!localMode && !stagingAttested) {
  throw new Error(
    "Argon2 selection must run on the Render staging service with singapore/starter attestation; use ARGON2_BENCHMARK_MODE=local only for a non-authoritative local check",
  );
}
const candidates = [
  { name: "19MiB-2", memoryCost: 19 * 1024, timeCost: 2 },
  { name: "32MiB-3", memoryCost: 32 * 1024, timeCost: 3 },
  { name: "64MiB-3", memoryCost: 64 * 1024, timeCost: 3 },
] as const;

function percentile(values: number[], percentileValue: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

const results = [];
for (const candidate of candidates) {
  const durations: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startedAt = performance.now();
    await hash("WishToday benchmark input; never a real credential", {
      type: argon2id,
      memoryCost: candidate.memoryCost,
      timeCost: candidate.timeCost,
      parallelism: 1,
      hashLength: 32,
    });
    durations.push(performance.now() - startedAt);
  }

  results.push({
    ...candidate,
    parallelism: 1,
    samples: SAMPLE_COUNT,
    p95Ms: Number(percentile(durations, 95).toFixed(1)),
  });
}

const selected = [...results]
  .reverse()
  .find((candidate) => candidate.p95Ms <= 500);

if (!selected) {
  throw new Error("No Argon2id candidate met the 500 ms P95 requirement");
}

process.stdout.write(
  `${JSON.stringify(
    {
      environment: {
        node: process.version,
        platform: platform(),
        release: release(),
        architecture: process.arch,
        cpu: cpus()[0]?.model ?? "unknown",
        cpuCount: cpus().length,
        freeMemoryBytes: freemem(),
        deploymentEnvironment:
          process.env.WISHTODAY_DEPLOYMENT_ENV ?? "local",
        deploymentRegion:
          process.env.WISHTODAY_DEPLOYMENT_REGION ?? "local",
        deploymentPlan: process.env.WISHTODAY_DEPLOYMENT_PLAN ?? "local",
      },
      candidates: results,
      stagingAttested,
      ...(stagingAttested ? { selected } : { localCandidate: selected }),
    },
    null,
    2,
  )}\n`,
);
