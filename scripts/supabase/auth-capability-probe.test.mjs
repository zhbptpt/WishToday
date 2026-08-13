import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CAPABILITY_NAMES,
  CURRENT_EVIDENCE,
  buildProbeReport,
  evaluateCapabilityGate,
} from "./auth-capability-probe.mjs";

const allContractualAndObserved = () =>
  Object.fromEntries(
    CAPABILITY_NAMES.map((name) => [name, "contractual-and-observed"]),
  );

test("returns GO only when every required capability is contractual and observed", () => {
  assert.deepEqual(evaluateCapabilityGate(allContractualAndObserved()), {
    decision: "GO",
    blockingCapabilities: [],
  });
});

for (const status of ["observed-only", "unsupported", "unknown"]) {
  test(`returns NO-GO when a required capability is ${status}`, () => {
    const evidence = allContractualAndObserved();
    evidence.passwordUpdateTerminalState = status;

    assert.deepEqual(evaluateCapabilityGate(evidence), {
      decision: "NO-GO",
      blockingCapabilities: ["passwordUpdateTerminalState"],
    });
  });
}

test("treats missing and unrecognized evidence as unknown blockers", () => {
  const evidence = allContractualAndObserved();
  delete evidence.recoveryContinuation;
  evidence.globalRefreshTokenRevocation = "assumed";

  assert.deepEqual(evaluateCapabilityGate(evidence), {
    decision: "NO-GO",
    blockingCapabilities: [
      "recoveryContinuation",
      "globalRefreshTokenRevocation",
    ],
  });
});

test("records the unobserved staging capabilities as blockers", () => {
  assert.deepEqual(CURRENT_EVIDENCE, {
    recoveryContinuation: "unknown",
    customAccessTokenClaims: "unknown",
    immediateRlsAccessTokenRejection: "unknown",
    globalRefreshTokenRevocation: "unknown",
    passwordUpdateTerminalState: "unsupported",
  });

  assert.equal(buildProbeReport(CURRENT_EVIDENCE).decision, "NO-GO");
});

test("emits only capability statuses and a nonzero exit code for NO-GO", () => {
  const probePath = fileURLToPath(
    new URL("./auth-capability-probe.mjs", import.meta.url),
  );
  const secrets = {
    SUPABASE_URL: "https://secret-project.supabase.co",
    SUPABASE_ANON_KEY: "secret-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "secret-service-role-key",
    SUPABASE_TEST_EMAIL: "private@example.com",
    SUPABASE_TEST_PASSWORD: "secret-password",
  };
  const result = spawnSync(process.execPath, [probePath], {
    encoding: "utf8",
    env: { ...process.env, ...secrets },
  });

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.decision, "NO-GO");
  assert.deepEqual(
    report.capabilities.map(({ name, status }) => ({ name, status })),
    CAPABILITY_NAMES.map((name) => ({
      name,
      status: CURRENT_EVIDENCE[name],
    })),
  );

  for (const secret of Object.values(secrets)) {
    assert.equal(result.stdout.includes(secret), false);
    assert.equal(result.stderr.includes(secret), false);
  }
});

test("keeps the Node probe tests out of Vitest discovery", () => {
  const viteConfigPath = fileURLToPath(
    new URL("../../vite.config.ts", import.meta.url),
  );
  const viteConfig = readFileSync(viteConfigPath, "utf8");

  assert.match(viteConfig, /scripts\/supabase\/\*\*/);
});
