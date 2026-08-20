import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CAPABILITY_NAMES,
  acquireProbeLock,
  abortApiRequestBeforeHeaders,
  assertDeviceSessionRevoked,
  assertProbeDatabaseTls,
  cleanupProbeArtifacts,
  buildProbeHeaders,
  buildProbeReport,
  classifyRateLimitResponses,
  databaseIdentityFingerprint,
  evaluateGate,
  executeChecks,
  extractSessionCookies,
  holdPoolConnectionsExceptOne,
  isInjectedFailureResponse,
  installCommitNotifier,
  installFaultTrigger,
  observeFaultTriggerEntry,
  validateReplayRaceResponses,
  validateLoggedOutDeviceResponses,
  resolveStagingConfig,
  rlsTransaction,
} from "./capability-gate.mjs";

const passingEvidence = () =>
  Object.fromEntries(CAPABILITY_NAMES.map((name) => [name, "pass"]));

test("returns GO only when all seven capabilities pass", () => {
  assert.equal(CAPABILITY_NAMES.length, 7);
  assert.equal(evaluateGate(passingEvidence()), "GO");
});

for (const status of [undefined, "skip", "unknown", "fail"]) {
  test(`returns NO-GO when one capability is ${String(status)}`, () => {
    const evidence = passingEvidence();

    if (status === undefined) {
      delete evidence[CAPABILITY_NAMES[0]];
    } else {
      evidence[CAPABILITY_NAMES[0]] = status;
    }

    assert.equal(evaluateGate(evidence), "NO-GO");
  });
}

test("ignores unrelated evidence but never substitutes it for a required capability", () => {
  const evidence = passingEvidence();
  delete evidence[CAPABILITY_NAMES.at(-1)];
  evidence.unplannedCapability = "pass";

  assert.equal(evaluateGate(evidence), "NO-GO");
});

test("converts thrown and malformed checks to fail without exposing errors", async () => {
  const checks = Object.fromEntries(
    CAPABILITY_NAMES.map((name) => [name, async () => ({ status: "pass" })]),
  );
  checks.atomicPasswordReset = async () => {
    throw new Error("DATABASE_URL=postgres://private");
  };
  checks.rlsContextIsolation = async () => ({ status: "unexpected" });

  const evidence = await executeChecks(checks);

  assert.deepEqual(evidence.atomicPasswordReset, {
    status: "fail",
    code: "CHECK_FAILED",
  });
  assert.deepEqual(evidence.rlsContextIsolation, {
    status: "fail",
    code: "INVALID_CHECK_RESULT",
  });
  assert.equal(JSON.stringify(evidence).includes("postgres://private"), false);
});

test("builds a report with fixed capability names and safe metadata", () => {
  const evidence = Object.fromEntries(
    CAPABILITY_NAMES.map((name) => [name, { status: "pass" }]),
  );
  const report = buildProbeReport(evidence, {
    commit: "abcdef1234567890abcdef1234567890abcdef12",
    node: "v22.23.2",
    nest: "11.1.29",
    postgres: "17.6",
    service: "wishtoday-api-staging",
    region: "singapore",
    plan: "starter",
    runId: "safe-run-id",
    branch: "codex/task-22-auth-capability-gate",
    serviceId: "srv-d1234567890abcdefgh",
    databaseUrl: "postgresql://private-user:private-password@private-host/db",
    executedAt: "2026-08-20T12:00:00.000Z",
  });

  assert.equal(report.decision, "GO");
  assert.deepEqual(
    report.capabilities.map(({ name, status }) => ({ name, status })),
    CAPABILITY_NAMES.map((name) => ({ name, status: "pass" })),
  );
  assert.equal(report.environment.commit, "abcdef123456");
  assert.equal(Object.hasOwn(report.environment, "serviceId"), false);
  assert.equal(Object.hasOwn(report.environment, "databaseUrl"), false);
  assert.equal(JSON.stringify(report).includes("private-password"), false);
});

test("CLI fails closed outside attested staging and never echoes secrets", () => {
  const probePath = fileURLToPath(
    new URL("./capability-gate.mjs", import.meta.url),
  );
  const secrets = {
    DATABASE_URL: "postgres://private-user:private-password@private-host/db",
    DATABASE_CA_CERT_BASE64: "private-ca",
    TOKEN_PEPPER: "private-pepper-value-that-is-long-enough",
    AUTH_GATEWAY_TEST_PASSWORD: "private-test-password",
  };
  const result = spawnSync(process.execPath, [probePath], {
    encoding: "utf8",
    env: { ...process.env, ...secrets, RENDER: "false" },
  });

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.decision, "NO-GO");
  assert.equal(report.errorCode, "ENVIRONMENT_ATTESTATION_FAILED");
  for (const secret of Object.values(secrets)) {
    assert.equal(result.stdout.includes(secret), false);
    assert.equal(result.stderr.includes(secret), false);
  }
});

test("resolves only an attested Render staging configuration", () => {
  const databaseUrl = "postgresql://private@db.example.test:5432/postgres";
  const config = resolveStagingConfig({
    RENDER: "true",
    RENDER_SERVICE_NAME: "wishtoday-api-staging",
    RENDER_EXTERNAL_HOSTNAME: "wishtoday-api-staging.onrender.com",
    RENDER_SERVICE_ID: "srv-d1234567890abcdefgh",
    RENDER_GIT_BRANCH: "codex/task-22-auth-capability-gate",
    RENDER_GIT_COMMIT: "abcdef1234567890abcdef1234567890abcdef12",
    AUTH_GATEWAY_EXPECTED_GIT_COMMIT:
      "abcdef1234567890abcdef1234567890abcdef12",
    WISHTODAY_DEPLOYMENT_ENV: "staging",
    WISHTODAY_DEPLOYMENT_REGION: "singapore",
    WISHTODAY_DEPLOYMENT_PLAN: "starter",
    DATABASE_URL: databaseUrl,
    AUTH_GATEWAY_EXPECTED_SERVICE_ID: "srv-d1234567890abcdefgh",
    AUTH_GATEWAY_DATABASE_IDENTITY_SHA256:
      databaseIdentityFingerprint(databaseUrl),
    DATABASE_CA_CERT_BASE64: "private-ca",
    TOKEN_PEPPER: "private-pepper-value-that-is-long-enough",
    ALLOWED_ORIGINS: "https://zhbptpt.github.io",
  });

  assert.equal(config.baseUrl, "https://wishtoday-api-staging.onrender.com");
  assert.equal(config.origin, "https://zhbptpt.github.io");
  assert.equal(config.service, "wishtoday-api-staging");
  assert.equal(config.commit, "abcdef1234567890abcdef1234567890abcdef12");
});

test("rejects non-staging, wildcard origin, and incomplete probe configuration", () => {
  const base = {
    RENDER: "true",
    RENDER_SERVICE_NAME: "wishtoday-api-staging",
    RENDER_EXTERNAL_HOSTNAME: "wishtoday-api-staging.onrender.com",
    RENDER_SERVICE_ID: "srv-d1234567890abcdefgh",
    RENDER_GIT_BRANCH: "codex/task-22-auth-capability-gate",
    RENDER_GIT_COMMIT: "abcdef1234567890abcdef1234567890abcdef12",
    AUTH_GATEWAY_EXPECTED_GIT_COMMIT:
      "abcdef1234567890abcdef1234567890abcdef12",
    WISHTODAY_DEPLOYMENT_ENV: "staging",
    WISHTODAY_DEPLOYMENT_REGION: "singapore",
    WISHTODAY_DEPLOYMENT_PLAN: "starter",
    DATABASE_URL: "postgresql://private@db.example.test:5432/postgres",
    AUTH_GATEWAY_EXPECTED_SERVICE_ID: "srv-d1234567890abcdefgh",
    AUTH_GATEWAY_DATABASE_IDENTITY_SHA256: databaseIdentityFingerprint(
      "postgresql://private@db.example.test:5432/postgres",
    ),
    DATABASE_CA_CERT_BASE64: "private-ca",
    TOKEN_PEPPER: "private-pepper-value-that-is-long-enough",
    ALLOWED_ORIGINS: "https://zhbptpt.github.io",
  };

  assert.throws(() => resolveStagingConfig({ ...base, RENDER: "false" }));
  assert.throws(() => resolveStagingConfig({ ...base, ALLOWED_ORIGINS: "*" }));
  assert.throws(() =>
    resolveStagingConfig({
      ...base,
      ALLOWED_ORIGINS: "https://zhbptpt.github.io,*",
    }),
  );
  assert.throws(() => resolveStagingConfig({ ...base, DATABASE_URL: "" }));
  assert.throws(() =>
    resolveStagingConfig({ ...base, RENDER_EXTERNAL_HOSTNAME: "evil.onrender.com" }),
  );
  assert.throws(() =>
    resolveStagingConfig({ ...base, RENDER_SERVICE_ID: "srv-wrong000000000000" }),
  );
  assert.throws(() =>
    resolveStagingConfig({ ...base, RENDER_GIT_COMMIT: "unknown" }),
  );
  assert.throws(() =>
    resolveStagingConfig({
      ...base,
      AUTH_GATEWAY_EXPECTED_GIT_COMMIT:
        "0000000000000000000000000000000000000000",
    }),
  );
  assert.throws(() =>
    resolveStagingConfig({
      ...base,
      DATABASE_URL: `${base.DATABASE_URL}?sslmode=disable`,
    }),
  );
  assert.throws(() =>
    resolveStagingConfig({
      ...base,
      DATABASE_URL: `${base.DATABASE_URL}?sslrootcert=attacker`,
    }),
  );
  assert.throws(() =>
    resolveStagingConfig({
      ...base,
      AUTH_GATEWAY_DATABASE_IDENTITY_SHA256: "0".repeat(64),
    }),
  );
});

test("database identity fingerprint excludes credentials but binds host and database", () => {
  const first = databaseIdentityFingerprint(
    "postgresql://probe:secret-one@db.example.test:5432/postgres",
  );
  const sameIdentity = databaseIdentityFingerprint(
    "postgresql://probe:secret-two@db.example.test:5432/postgres",
  );
  const otherDatabase = databaseIdentityFingerprint(
    "postgresql://probe:secret-one@db.example.test:5432/production",
  );

  assert.equal(first, sameIdentity);
  assert.notEqual(first, otherDatabase);
  assert.match(first, /^[a-f0-9]{64}$/u);
  assert.equal(first.includes("secret"), false);
});

test("accepts only an encrypted and authorized PostgreSQL stream", () => {
  assert.doesNotThrow(() =>
    assertProbeDatabaseTls({ connection: { stream: { encrypted: true, authorized: true } } }),
  );
  assert.throws(() =>
    assertProbeDatabaseTls({ connection: { stream: { encrypted: true, authorized: false } } }),
  );
  assert.throws(() => assertProbeDatabaseTls({ connection: { stream: {} } }));
});

test("extracts only the refresh and CSRF cookie values", () => {
  const cookies = extractSessionCookies([
    "__Host-wishtoday_refresh=refresh-value; Path=/; HttpOnly; Secure; SameSite=Lax",
    "__Host-wishtoday_csrf=csrf-value; Path=/; Secure; SameSite=Lax",
    "unrelated=ignore-me; Path=/",
  ]);

  assert.deepEqual(cookies, {
    refresh: "refresh-value",
    csrf: "csrf-value",
  });
});

test("builds probe headers with the requested device identity", () => {
  assert.deepEqual(
    buildProbeHeaders(
      { origin: "https://example.test" },
      { body: {}, userAgent: "WishToday capability gate device-a" },
    ),
    {
      accept: "application/json",
      origin: "https://example.test",
      "content-type": "application/json",
      "user-agent": "WishToday capability gate device-a",
    },
  );
});

test("passes a controlled forwarded IP through the real HTTP request", () => {
  const headers = buildProbeHeaders(
    { origin: "https://example.test" },
    { body: {}, forwardedFor: "198.18.10.20" },
  );
  assert.equal(headers["x-forwarded-for"], "198.18.10.20");
});

test("accepts only exact HTTP rate-limit threshold results", () => {
  const requestId = "auth-gate-rate-00000001";
  const successes = Array.from({ length: 3 }, () => ({
    status: 202,
    payload: { ok: true },
    requestId,
  }));
  const limited = {
    status: 429,
    payload: { ok: false, code: "RATE_LIMITED" },
    requestId,
  };
  assert.doesNotThrow(() =>
    classifyRateLimitResponses([...successes, limited], 3),
  );
  assert.throws(() =>
    classifyRateLimitResponses([...successes, { ...limited, status: 502 }], 3),
  );
  assert.throws(() =>
    classifyRateLimitResponses([...successes, { ...limited, payload: null }], 3),
  );
});

test("accepts both serialized outcomes of the refresh replay race", () => {
  const revoked = {
    status: 401,
    payload: { code: "SESSION_REVOKED" },
  };
  const rotated = {
    status: 200,
    payload: { data: { accessToken: "new-access" } },
    cookies: { refresh: "new-refresh", csrf: "new-csrf" },
  };
  assert.doesNotThrow(() => validateReplayRaceResponses(revoked, revoked));
  assert.doesNotThrow(() => validateReplayRaceResponses(revoked, rotated));
  assert.throws(() =>
    validateReplayRaceResponses({ status: 502, payload: null }, revoked),
  );
  assert.throws(() =>
    validateReplayRaceResponses(revoked, { status: 200, payload: null, cookies: {} }),
  );
});

test("logout evidence requires both the old access and refresh tokens to be revoked", () => {
  const revoked = {
    status: 401,
    payload: { code: "SESSION_REVOKED" },
  };
  assert.doesNotThrow(() => validateLoggedOutDeviceResponses(revoked, revoked));
  assert.throws(() =>
    validateLoggedOutDeviceResponses(revoked, {
      status: 401,
      payload: { code: "INVALID_REFRESH_TOKEN" },
    }),
  );
  assert.throws(() =>
    validateLoggedOutDeviceResponses(revoked, {
      status: 200,
      payload: { ok: true },
    }),
  );
});

test("device revocation check calls both the access and refresh endpoints", async () => {
  const calls = [];
  const revoked = {
    status: 401,
    payload: { code: "SESSION_REVOKED" },
  };
  await assertDeviceSessionRevoked(
    { baseUrl: "https://example.test", origin: "https://app.example.test" },
    {
      accessToken: "private-access",
      cookies: { refresh: "private-refresh", csrf: "private-csrf" },
    },
    async (_config, path, options) => {
      calls.push([path, options]);
      return revoked;
    },
  );

  assert.deepEqual(
    calls.map(([path]) => path),
    ["/api/v1/auth/me", "/api/v1/auth/refresh"],
  );
  assert.deepEqual(calls[0][1], { accessToken: "private-access" });
  assert.deepEqual(calls[1][1], {
    body: {},
    cookies: { refresh: "private-refresh", csrf: "private-csrf" },
  });
});

test("RLS transactions use the production transaction boundary and app.user_id", async () => {
  const statements = [];
  const database = {
    async transaction(work) {
      return work({
        async query(statement, parameters) {
          statements.push([statement, parameters]);
          if (/pg_backend_pid/u.test(statement)) {
            return { rows: [{ backendPid: 4242 }] };
          }
          return { rows: [{ ownerId: "00000000-0000-4000-8000-000000000001" }] };
        },
      });
    },
  };

  const evidence = await rlsTransaction(
    database,
    "auth_gate_rls_abcdef0123456789",
    "00000000-0000-4000-8000-000000000001",
  );

  assert.equal(statements[0][0], "SET LOCAL ROLE wishtoday_auth_repository");
  assert.match(statements[1][0], /set_config\('app\.user_id'/u);
  assert.match(statements[2][0], /pg_backend_pid/u);
  assert.match(statements[3][0], /select owner_id/u);
  assert.deepEqual(evidence, {
    backendPid: 4242,
    ownerIds: ["00000000-0000-4000-8000-000000000001"],
  });
});

test("holds every pool connection except one reusable application slot", async () => {
  const clients = Array.from({ length: 2 }, () => ({
    released: false,
    release() {
      this.released = true;
    },
  }));
  let connected = 0;
  const release = await holdPoolConnectionsExceptOne(
    {
      options: { max: 4 },
      async connect() {
        const client = clients[connected];
        connected += 1;
        return client;
      },
    },
    1,
  );

  assert.equal(connected, 2);
  assert.equal(clients.some((client) => client.released), false);
  await release();
  assert.equal(clients.every((client) => client.released), true);
});

test("simulates response loss only after the target operation commits", async () => {
  let started = false;
  let aborted = false;
  let proveCommit;
  const committed = new Promise((resolve) => {
    proveCommit = resolve;
  });
  const fetchImpl = async (_url, options) => {
    started = true;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        aborted = true;
        reject(options.signal.reason);
      });
    });
  };

  const lostResponse = abortApiRequestBeforeHeaders(
    { baseUrl: "https://example.test", origin: "https://app.example.test" },
    "/api/v1/auth/password-reset",
    { body: { operationId: "safe-operation-id" } },
    committed,
    fetchImpl,
  );

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(started, true);
  assert.equal(aborted, false);
  proveCommit();
  await lostResponse;
  assert.equal(aborted, true);
});

test("rejects a response-loss check if headers arrive before the abort", async () => {
  await assert.rejects(
    () =>
      abortApiRequestBeforeHeaders(
        { baseUrl: "https://example.test", origin: "https://app.example.test" },
        "/api/v1/auth/password-reset",
        { body: { operationId: "safe-operation-id" } },
        new Promise(() => undefined),
        async () => ({ body: { cancel: async () => undefined } }),
      ),
    /headers arrived/u,
  );
});

test("does not mistake a slow body cancel for loss after headers arrived", async () => {
  await assert.rejects(
    () =>
      abortApiRequestBeforeHeaders(
        { baseUrl: "https://example.test", origin: "https://app.example.test" },
        "/api/v1/auth/password-reset",
        { body: { operationId: "safe-operation-id" } },
        new Promise(() => undefined),
        async () => ({
          body: {
            cancel: async () =>
              new Promise((resolve) => setTimeout(resolve, 10)),
          },
        }),
      ),
    /headers arrived/u,
  );
});

test("commit notifier resolves only for the target operation after PostgreSQL notifies", async () => {
  const statements = [];
  const listener = new EventEmitter();
  let released = false;
  listener.query = async (statement) => {
    statements.push(statement);
  };
  listener.release = () => {
    released = true;
  };
  const pool = {
    connect: async () => listener,
    query: async (statement) => {
      statements.push(statement);
    },
  };
  const operationId = "00000000-0000-4000-8000-000000000002";
  const notifier = await installCommitNotifier(pool, operationId);
  let committed = false;
  notifier.committed.then(() => {
    committed = true;
  });

  listener.emit("notification", {
    channel: "unrelated_channel",
    payload: operationId,
  });
  await Promise.resolve();
  assert.equal(committed, false);

  const listenStatement = statements.find((statement) => /^LISTEN /u.test(statement));
  const channel = listenStatement.slice("LISTEN ".length);
  listener.emit("notification", { channel, payload: operationId });
  await notifier.committed;
  assert.equal(committed, true);

  await notifier.remove();
  assert.equal(released, true);
  assert.match(statements.join("\n"), /after update of status/u);
  assert.match(statements.join("\n"), /pg_notify/u);
  assert.match(statements.join("\n"), /UNLISTEN/u);
});

test("removes a fault function when trigger creation fails", async () => {
  const statements = [];
  const pool = {
    async query(statement) {
      statements.push(statement);
      if (statements.length === 2) throw new Error("trigger creation failed");
    },
  };

  await assert.rejects(() =>
    installFaultTrigger(
      pool,
      "password_credentials",
      { userId: "00000000-0000-4000-8000-000000000001" },
      "00000000-0000-4000-8000-000000000002",
    ),
  );

  assert.equal(statements.length, 3);
  assert.match(statements[2], /^drop function if exists public\.auth_gate_fail_/u);
});

test("fault teardown attempts function cleanup when trigger removal fails", async () => {
  const statements = [];
  const pool = {
    async query(statement) {
      statements.push(statement);
      if (statements.length === 3) throw new Error("trigger removal failed");
    },
  };
  const removeFault = await installFaultTrigger(
    pool,
    "account_security",
    { userId: "00000000-0000-4000-8000-000000000001" },
    "00000000-0000-4000-8000-000000000002",
  );

  await assert.rejects(removeFault);

  assert.equal(statements.length, 4);
  assert.match(statements[3], /^drop function if exists public\.auth_gate_fail_/u);
});

test("fault trigger uses a dedicated SQLSTATE", async () => {
  const statements = [];
  const pool = {
    async query(statement) {
      statements.push(statement);
    },
  };
  const removeFault = await installFaultTrigger(
    pool,
    "password_reset_operations",
    { userId: "00000000-0000-4000-8000-000000000001" },
    "00000000-0000-4000-8000-000000000002",
  );
  await removeFault();

  assert.match(statements[0], /using errcode = 'WTG01'/u);
  assert.match(statements[0], /pg_advisory_xact_lock/u);
  assert.match(statements[0], /pg_sleep/u);
  assert.match(removeFault.lockKey, /^\d+$/u);
  await assert.rejects(() =>
    installFaultTrigger(
      pool,
      "users; drop table public.users",
      { userId: "00000000-0000-4000-8000-000000000001" },
      "00000000-0000-4000-8000-000000000002",
    ),
  );
});

test("fault observation requires seeing the transaction advisory lock", async () => {
  const statements = [];
  let attempts = 0;
  let released = false;
  const client = {
    async query(statement, parameters) {
      statements.push([statement, parameters]);
      if (/pg_try_advisory_lock/u.test(statement)) {
        attempts += 1;
        return { rows: [{ acquired: attempts === 1 }] };
      }
      return { rows: [{ released: true }] };
    },
    release() {
      released = true;
    },
  };

  await observeFaultTriggerEntry(
    { connect: async () => client },
    "123456789",
    new Promise(() => undefined),
  );

  assert.equal(attempts, 2);
  assert.match(statements[1][0], /pg_advisory_unlock/u);
  assert.equal(released, true);
});

test("accepts only an application 500 with a valid request id after fault control", () => {
  assert.equal(
    isInjectedFailureResponse({
      status: 500,
      requestId: "00000000-0000-4000-8000-000000000001",
    }, "00000000-0000-4000-8000-000000000001"),
    true,
  );
  assert.equal(
    isInjectedFailureResponse({
      status: 502,
      requestId: "00000000-0000-4000-8000-000000000001",
    }, "00000000-0000-4000-8000-000000000001"),
    false,
  );
  assert.equal(
    isInjectedFailureResponse(
      { status: 500, requestId: undefined },
      "00000000-0000-4000-8000-000000000001",
    ),
    false,
  );
});

test("startup cleanup is restricted to fixed probe prefixes and table allowlist", async () => {
  const statements = [];
  const pool = {
    async query(statement) {
      statements.push(statement);
      if (/from information_schema\.triggers/u.test(statement)) {
        return {
          rows: [
            {
              triggerName: "auth_gate_trigger_deadbeef",
              tableName: "password_credentials",
            },
            {
              triggerName: "auth_gate_commit_trigger_cafebabe",
              tableName: "password_reset_operations",
            },
            {
              triggerName: "authXgateXtriggerXbad",
              tableName: "password_credentials",
            },
            {
              triggerName: "auth_gate_trigger_abcdef",
              tableName: "unrelated_table",
            },
          ],
        };
      }
      if (/from pg_proc/u.test(statement)) {
        return {
          rows: [
            { functionName: "auth_gate_fail_deadbeef" },
            { functionName: "auth_gate_commit_notify_cafebabe" },
            { functionName: "authXgateXfailXbad" },
          ],
        };
      }
      if (/from pg_tables/u.test(statement)) {
        return {
          rows: [
            { tableName: "auth_gate_rls_deadbeef" },
            { tableName: "authXgateXrlsXbad" },
          ],
        };
      }
      return { rows: [] };
    },
  };

  await cleanupProbeArtifacts(pool);

  const cleanupSql = statements.join("\n");
  assert.match(cleanupSql, /drop trigger if exists auth_gate_trigger_deadbeef/u);
  assert.match(cleanupSql, /drop trigger if exists auth_gate_commit_trigger_cafebabe/u);
  assert.match(cleanupSql, /drop function if exists public\.auth_gate_fail_deadbeef/u);
  assert.match(cleanupSql, /drop function if exists public\.auth_gate_commit_notify_cafebabe/u);
  assert.match(cleanupSql, /drop table if exists public\.auth_gate_rls_deadbeef/u);
  assert.doesNotMatch(cleanupSql, /authXgate/u);
  assert.doesNotMatch(cleanupSql, /unrelated_table/u);
  assert.doesNotMatch(cleanupSql, /drop[^;]+cascade/iu);
  assert.match(cleanupSql, /auth-gate-/u);
});

test("holds a PostgreSQL advisory lock for the whole probe and always releases it", async () => {
  const statements = [];
  let released = false;
  const client = {
    async query(statement) {
      statements.push(statement);
      if (statements.length === 1) return { rows: [{ acquired: true }] };
      return { rows: [{ released: true }] };
    },
    release() {
      released = true;
    },
  };
  const releaseLock = await acquireProbeLock({ connect: async () => client });
  assert.equal(released, false);
  await releaseLock();
  assert.equal(released, true);
  assert.match(statements[0], /pg_try_advisory_lock/u);
  assert.match(statements[1], /pg_advisory_unlock/u);
});

test("wires the staging probe and Node tests into root scripts exactly once", () => {
  const root = new URL("../../", import.meta.url);
  const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  const viteConfig = readFileSync(new URL("vite.config.ts", root), "utf8");
  const renderConfig = readFileSync(new URL("render.yaml", root), "utf8");

  assert.equal(
    packageJson.scripts["probe:auth-gateway"],
    "node scripts/auth-gateway/capability-gate.mjs",
  );
  assert.match(packageJson.scripts.test, /scripts\/auth-gateway\/capability-gate\.test\.mjs/);
  assert.match(viteConfig, /scripts\/auth-gateway\/\*\*/);
  assert.match(renderConfig, /AUTH_GATEWAY_EXPECTED_SERVICE_ID/u);
  assert.match(renderConfig, /AUTH_GATEWAY_EXPECTED_GIT_COMMIT/u);
  assert.match(renderConfig, /AUTH_GATEWAY_DATABASE_IDENTITY_SHA256/u);
});
