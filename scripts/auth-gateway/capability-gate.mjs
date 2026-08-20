import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { request as httpRequest } from "node:http";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export const CAPABILITY_NAMES = Object.freeze([
  "atomicPasswordReset",
  "rollbackOnInjectedFailure",
  "staleAccessRejected",
  "refreshFamilyReplayRevoked",
  "resetOperationIdempotency",
  "postgresRateLimits",
  "rlsContextIsolation",
]);

const REFRESH_COOKIE_NAME = "__Host-wishtoday_refresh";
const CSRF_COOKIE_NAME = "__Host-wishtoday_csrf";
const EXPECTED_HOSTNAME = "wishtoday-api-staging.onrender.com";
const EXPECTED_ORIGIN = "https://zhbptpt.github.io";
const EXPECTED_BRANCH = "codex/task-22-auth-capability-gate";
const FULL_GIT_SHA = /^[a-f0-9]{40}$/u;
const RENDER_SERVICE_ID = /^srv-[a-z0-9]{16,32}$/u;
const FAULT_SQLSTATE = "WTG01";
const FAULT_TABLES = Object.freeze([
  "password_credentials",
  "account_security",
  "auth_sessions",
  "password_reset_tokens",
  "password_reset_operations",
]);
const PROBE_TRIGGER_NAME = /^auth_gate_(?:trigger|commit_trigger)_[a-f0-9]+$/u;
const PROBE_FUNCTION_NAME = /^auth_gate_(?:fail|commit_notify)_[a-f0-9]+$/u;
const PROBE_RLS_TABLE_NAME = /^auth_gate_rls_[a-f0-9]+$/u;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MINIMUM_REMAINING_MS = 60 * 1000;
const RATE_LIMIT_BOUNDARY_SETTLE_MS = 1000;
const requireFromServer = createRequire(
  new URL("../../server/package.json", import.meta.url),
);

export function evaluateGate(evidence = {}) {
  return CAPABILITY_NAMES.every(
    (name) => (evidence[name]?.status ?? evidence[name]) === "pass",
  )
    ? "GO"
    : "NO-GO";
}

export async function executeChecks(checks) {
  const evidence = {};
  for (const name of CAPABILITY_NAMES) {
    try {
      const result = await checks[name]?.();
      evidence[name] =
        result?.status === "pass" || result?.status === "fail"
          ? result
          : { status: "fail", code: "INVALID_CHECK_RESULT" };
    } catch {
      evidence[name] = { status: "fail", code: "CHECK_FAILED" };
    }
  }
  return evidence;
}

export function buildProbeReport(evidence, metadata) {
  return {
    probe: "nestjs-auth-gateway-capability-gate",
    decision:
      evaluateGate(evidence) === "GO" && FULL_GIT_SHA.test(metadata.commit ?? "")
        ? "GO"
        : "NO-GO",
    environment: {
      commit: metadata.commit?.slice(0, 12) || "unknown",
      node: metadata.node,
      nest: metadata.nest,
      postgres: metadata.postgres,
      service: metadata.service,
      region: metadata.region,
      plan: metadata.plan,
      runId: metadata.runId,
      branch: metadata.branch,
      executedAt: metadata.executedAt,
    },
    capabilities: CAPABILITY_NAMES.map((name) => ({
      name,
      status: evidence[name]?.status ?? "fail",
      ...(evidence[name]?.code ? { code: evidence[name].code } : {}),
      ...(evidence[name]?.metrics ? { metrics: evidence[name].metrics } : {}),
    })),
  };
}

export function databaseIdentityFingerprint(databaseUrl) {
  const url = new URL(databaseUrl);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use PostgreSQL");
  }
  const identity = JSON.stringify({
    host: url.hostname.toLowerCase(),
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    database: decodeURIComponent(url.pathname.replace(/^\//u, "")),
  });
  return createHash("sha256").update(identity, "utf8").digest("hex");
}

function validateProbeDatabaseUrl(databaseUrl, expectedFingerprint) {
  let url;
  try {
    url = new URL(databaseUrl);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("wrong protocol");
    }
    for (const name of url.searchParams.keys()) {
      const normalized = name.toLowerCase();
      if (normalized.startsWith("ssl") || normalized === "channel_binding") {
        throw new Error("TLS override");
      }
    }
  } catch {
    throw new Error("DATABASE_URL must be PostgreSQL without TLS overrides");
  }
  if (!/^[a-f0-9]{64}$/u.test(expectedFingerprint)) {
    throw new Error("Database identity fingerprint must be SHA-256");
  }
  if (databaseIdentityFingerprint(databaseUrl) !== expectedFingerprint) {
    throw new Error("Database identity does not match staging");
  }
  return databaseUrl;
}

export function assertProbeDatabaseTls(client) {
  const stream = client?.connection?.stream;
  if (stream?.encrypted !== true || stream?.authorized !== true) {
    throw new Error("PostgreSQL connection must use authorized TLS");
  }
}

function requireValue(source, name) {
  const value = source[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function resolveStagingConfig(source = process.env) {
  if (!stagingIsAttested(source)) {
    throw new Error("Render staging attestation is required");
  }
  const hostname = requireValue(source, "RENDER_EXTERNAL_HOSTNAME");
  const serviceId = requireValue(source, "RENDER_SERVICE_ID");
  const expectedServiceId = requireValue(
    source,
    "AUTH_GATEWAY_EXPECTED_SERVICE_ID",
  );
  const branch = requireValue(source, "RENDER_GIT_BRANCH");
  const commit = requireValue(source, "RENDER_GIT_COMMIT");
  const expectedCommit = requireValue(
    source,
    "AUTH_GATEWAY_EXPECTED_GIT_COMMIT",
  );
  if (
    hostname !== EXPECTED_HOSTNAME ||
    !RENDER_SERVICE_ID.test(serviceId) ||
    serviceId !== expectedServiceId ||
    branch !== EXPECTED_BRANCH ||
    !FULL_GIT_SHA.test(commit) ||
    !FULL_GIT_SHA.test(expectedCommit) ||
    commit !== expectedCommit
  ) {
    throw new Error("Render deployment identity does not match staging");
  }
  const origins = requireValue(source, "ALLOWED_ORIGINS")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    origins.length !== 1 ||
    origins[0] !== EXPECTED_ORIGIN ||
    new URL(origins[0]).origin !== origins[0]
  ) {
    throw new Error("ALLOWED_ORIGINS must match the exact staging app origin");
  }
  const [origin] = origins;

  const databaseUrl = requireValue(source, "DATABASE_URL");
  validateProbeDatabaseUrl(
    databaseUrl,
    requireValue(source, "AUTH_GATEWAY_DATABASE_IDENTITY_SHA256"),
  );
  const port = Number(requireValue(source, "PORT"));
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be a valid TCP port");
  }

  return {
    baseUrl: `https://${hostname}`,
    origin,
    service: source.RENDER_SERVICE_NAME,
    serviceId,
    branch,
    commit,
    region: source.WISHTODAY_DEPLOYMENT_REGION,
    plan: source.WISHTODAY_DEPLOYMENT_PLAN,
    databaseUrl,
    port,
    databaseCaCert: Buffer.from(
      requireValue(source, "DATABASE_CA_CERT_BASE64"),
      "base64",
    ).toString("utf8"),
    tokenPepper: requireValue(source, "TOKEN_PEPPER"),
  };
}

export function extractSessionCookies(setCookieHeaders) {
  const values = new Map();
  for (const header of setCookieHeaders) {
    const [pair] = header.split(";", 1);
    const separator = pair.indexOf("=");
    if (separator > 0) {
      values.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }
  return {
    refresh: values.get(REFRESH_COOKIE_NAME),
    csrf: values.get(CSRF_COOKIE_NAME),
  };
}

function tokenHash(rawToken, pepper) {
  return createHmac("sha256", pepper).update(rawToken, "utf8").digest();
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const combined = headers.get("set-cookie");
  return combined ? combined.split(/,(?=\s*__Host-wishtoday_)/u) : [];
}

export function buildProbeHeaders(config, options = {}) {
  return {
    accept: "application/json",
    origin: config.origin,
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(options.accessToken
      ? { authorization: `Bearer ${options.accessToken}` }
      : {}),
    ...(options.userAgent ? { "user-agent": options.userAgent } : {}),
    ...(options.requestId ? { "x-request-id": options.requestId } : {}),
    ...(options.cookies
      ? {
          cookie: `${REFRESH_COOKIE_NAME}=${options.cookies.refresh}; ${CSRF_COOKIE_NAME}=${options.cookies.csrf}`,
          "x-csrf-token": options.cookies.csrf,
        }
      : {}),
  };
}

export function classifyRateLimitResponses(results, expectedSuccesses) {
  const successes = results.filter(
    (result) =>
      result.status === 202 &&
      result.payload?.ok === true &&
      typeof result.requestId === "string",
  );
  const limited = results.filter(
    (result) =>
      result.status === 429 &&
      result.payload?.ok === false &&
      result.payload?.code === "RATE_LIMITED" &&
      typeof result.requestId === "string",
  );
  if (successes.length !== expectedSuccesses || limited.length !== 1) {
    throw new Error("RATE_LIMIT_HTTP_CONTRACT_FAILED");
  }
  if (successes.length + limited.length !== results.length) {
    throw new Error("RATE_LIMIT_HTTP_UNEXPECTED_RESPONSE");
  }
}

export async function drainApiRequests(requests) {
  const settled = await Promise.allSettled(requests);
  const rejected = settled.find((result) => result.status === "rejected");
  if (rejected) throw new Error("RATE_LIMIT_HTTP_REQUEST_FAILED");
  return settled.map((result) => result.value);
}

export function buildLoopbackRateLimitTransport(config, runId) {
  if (!/^[a-f0-9]{8}$/u.test(runId)) {
    throw new Error("Rate-limit probe run id must be eight hexadecimal characters");
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65_535) {
    throw new Error("Rate-limit probe port is invalid");
  }
  const bytes = createHash("sha256").update(runId, "utf8").digest();
  return {
    hostname: "127.0.0.1",
    port: config.port,
    localAddress: `127.${(bytes[0] % 254) + 1}.${(bytes[1] % 254) + 1}.${(bytes[2] % 254) + 1}`,
  };
}

export function rateLimitWindowDelay(nowMs) {
  const remaining = RATE_LIMIT_WINDOW_MS - (nowMs % RATE_LIMIT_WINDOW_MS);
  return remaining <= RATE_LIMIT_MINIMUM_REMAINING_MS
    ? remaining + RATE_LIMIT_BOUNDARY_SETTLE_MS
    : 0;
}

async function waitForStableRateLimitWindow(
  now = Date.now,
  sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
) {
  const delay = rateLimitWindowDelay(now());
  if (delay > 0) await sleep(delay);
}

export async function loopbackApiRequest(config, path, options, transport) {
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const timeoutMs = options.timeoutMs ?? 15_000;
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: transport.hostname,
        port: transport.port,
        path,
        method: options.method ?? (body ? "POST" : "GET"),
        localAddress: transport.localAddress,
        headers: buildProbeHeaders(config, options),
      },
      (response) => {
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > 1024 * 1024) {
            request.destroy(new Error("Rate-limit probe response is too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          clearTimeout(deadline);
          let payload;
          try {
            payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            payload = null;
          }
          const requestId = response.headers["x-request-id"];
          resolve({
            status: response.statusCode ?? 0,
            payload,
            requestId: Array.isArray(requestId) ? requestId[0] : requestId,
            cookies: extractSessionCookies(response.headers["set-cookie"] ?? []),
          });
        });
        response.on("error", (error) => {
          clearTimeout(deadline);
          reject(error);
        });
      },
    );
    const deadline = setTimeout(() => {
      request.destroy(new Error("Rate-limit probe request timed out"));
    }, timeoutMs);
    request.on("error", (error) => {
      clearTimeout(deadline);
      reject(error);
    });
    if (body) request.write(body);
    request.end();
  });
}

function buildFetchOptions(config, options = {}) {
  return {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: buildProbeHeaders(config, options),
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: AbortSignal.timeout(15_000),
  };
}

async function apiRequest(config, path, options = {}) {
  const response = await fetch(
    `${config.baseUrl}${path}`,
    buildFetchOptions(config, options),
  );
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return {
    status: response.status,
    payload,
    requestId: response.headers.get("x-request-id") ?? undefined,
    cookies: extractSessionCookies(getSetCookieHeaders(response.headers)),
  };
}

export async function abortApiRequestBeforeHeaders(
  config,
  path,
  options = {},
  commitObserved,
  fetchImpl = fetch,
) {
  if (typeof commitObserved?.then !== "function") {
    throw new Error("Database commit evidence is required");
  }
  const controller = new AbortController();
  let headersArrived = false;
  const request = Promise.resolve()
    .then(() =>
      fetchImpl(`${config.baseUrl}${path}`, {
        ...buildFetchOptions(config, options),
        signal: controller.signal,
      }),
    )
    .then(async (response) => {
      headersArrived = true;
      await response.body?.cancel();
      throw new Error("Password reset response headers arrived before abort");
    });

  try {
    await Promise.race([
      request,
      Promise.resolve(commitObserved).then(() => {
        if (headersArrived) {
          throw new Error("Password reset response headers arrived before abort");
        }
        controller.abort(new Error("AUTH_GATE_RESPONSE_LOST"));
      }),
    ]);
    await request;
  } catch (error) {
    if (headersArrived) throw error;
    if (controller.signal.aborted) return;
    controller.abort(new Error("AUTH_GATE_RESPONSE_LOST"));
    try {
      await request;
    } catch {
      // The commit proof failed; abort only drains the in-flight request.
    }
    throw error;
  }
}

export async function installCommitNotifier(pool, operationId) {
  if (!/^[a-f0-9-]{36}$/u.test(operationId)) {
    throw new Error("Invalid reset operation id");
  }
  const suffix = randomUUID().replaceAll("-", "");
  const channel = `auth_gate_commit_${suffix}`;
  const functionName = `auth_gate_commit_notify_${suffix}`;
  const triggerName = `auth_gate_commit_trigger_${suffix}`;
  const listener = await pool.connect();
  let resolveCommit;
  const committed = new Promise((resolve) => {
    resolveCommit = resolve;
  });
  const onNotification = (message) => {
    if (message.channel === channel && message.payload === operationId) {
      resolveCommit();
    }
  };
  listener.on("notification", onNotification);
  let listening = false;
  let functionCreated = false;
  let triggerCreated = false;
  let removed = false;

  const remove = async () => {
    if (removed) return;
    removed = true;
    const errors = [];
    listener.removeListener("notification", onNotification);
    if (triggerCreated) {
      try {
        await pool.query(
          `drop trigger if exists ${triggerName} on public.password_reset_operations`,
        );
      } catch (error) {
        errors.push(error);
      }
    }
    if (functionCreated) {
      try {
        await pool.query(`drop function if exists public.${functionName}()`);
      } catch (error) {
        errors.push(error);
      }
    }
    if (listening) {
      try {
        await listener.query(`UNLISTEN ${channel}`);
      } catch (error) {
        errors.push(error);
      }
    }
    try {
      listener.release();
    } catch (error) {
      errors.push(error);
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "Commit notifier cleanup failed");
    }
  };

  try {
    await listener.query(`LISTEN ${channel}`);
    listening = true;
    await pool.query(
      `create function public.${functionName}() returns trigger
       language plpgsql as $$
       begin
         perform pg_notify('${channel}', new.id::text);
         return new;
       end
       $$`,
    );
    functionCreated = true;
    await pool.query(
      `create trigger ${triggerName}
       after update of status on public.password_reset_operations
       for each row
       when (new.id = '${operationId}'::uuid and new.status = 'completed')
       execute function public.${functionName}()`,
    );
    triggerCreated = true;
  } catch (error) {
    try {
      await remove();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Commit notifier setup and cleanup failed",
      );
    }
    throw error;
  }

  return { committed, remove };
}

function requireApiResult(result, status, code) {
  if (result.status !== status) throw new Error(code);
  return result;
}

async function login(config, account, device) {
  const result = requireApiResult(
    await apiRequest(config, "/api/v1/auth/login", {
      body: { email: account.email, password: account.password },
      userAgent: `WishToday capability gate ${device}`,
    }),
    200,
    "LOGIN_FAILED",
  );
  if (
    !result.payload?.ok ||
    !result.payload.data?.accessToken ||
    !result.cookies.refresh ||
    !result.cookies.csrf
  ) {
    throw new Error("LOGIN_CONTRACT_FAILED");
  }
  return {
    accessToken: result.payload.data.accessToken,
    cookies: result.cookies,
  };
}

async function expectAuthFailure(config, path, options, acceptedCodes) {
  const result = await apiRequest(config, path, options);
  if (
    result.status !== 401 ||
    !result.payload ||
    !acceptedCodes.includes(result.payload.code)
  ) {
    throw new Error("EXPECTED_AUTH_FAILURE_MISSING");
  }
}

export function validateReplayRaceResponses(ancestorReplay, successorRotation) {
  const isRevoked = (result) =>
    result?.status === 401 && result.payload?.code === "SESSION_REVOKED";
  const isRotated = (result) =>
    result?.status === 200 &&
    Boolean(result.payload?.data?.accessToken) &&
    Boolean(result.cookies?.refresh) &&
    Boolean(result.cookies?.csrf);
  if (!isRevoked(ancestorReplay)) {
    throw new Error("ANCESTOR_REPLAY_NOT_REJECTED");
  }
  if (!isRevoked(successorRotation) && !isRotated(successorRotation)) {
    throw new Error("SUCCESSOR_RACE_RESULT_INVALID");
  }
  return isRotated(successorRotation);
}

export function validateLoggedOutDeviceResponses(accessResult, refreshResult) {
  const isRevoked = (result) =>
    result?.status === 401 && result.payload?.code === "SESSION_REVOKED";
  if (!isRevoked(accessResult) || !isRevoked(refreshResult)) {
    throw new Error("LOGGED_OUT_DEVICE_SESSION_NOT_REVOKED");
  }
}

export async function assertDeviceSessionRevoked(
  config,
  device,
  request = apiRequest,
) {
  const [accessResult, refreshResult] = await Promise.all([
    request(config, "/api/v1/auth/me", {
      accessToken: device.accessToken,
    }),
    request(config, "/api/v1/auth/refresh", {
      body: {},
      cookies: device.cookies,
    }),
  ]);
  validateLoggedOutDeviceResponses(accessResult, refreshResult);
}

async function seedVerifiedAccount(pool, argon2, runId, label) {
  const email = `auth-gate-${runId}-${label}@example.invalid`;
  const password = `${randomBytes(18).toString("base64url")}aA1!`;
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const user = await client.query(
      `insert into public.users
         (email, email_normalized, email_verified_at)
       values ($1, $1, now())
       returning id`,
      [email],
    );
    const userId = user.rows[0].id;
    await client.query(
      `insert into public.password_credentials (user_id, password_hash)
       values ($1, $2)`,
      [userId, passwordHash],
    );
    await client.query(
      `insert into public.account_security (user_id, session_version)
       values ($1, 1)`,
      [userId],
    );
    await client.query("COMMIT");
    return { userId, email, password, passwordHash };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createResetOperation(pool, account, pepper) {
  const rawToken = randomBytes(32).toString("base64url");
  const operation = await pool.query(
    `insert into public.password_reset_operations (user_id)
     values ($1)
     returning id`,
    [account.userId],
  );
  const operationId = operation.rows[0].id;
  await pool.query(
    `insert into public.password_reset_tokens
       (operation_id, user_id, token_hash, expires_at, status_query_expires_at)
     values ($1, $2, $3, now() + interval '1 hour', now() + interval '24 hours')`,
    [operationId, account.userId, tokenHash(rawToken, pepper)],
  );
  return { operationId, token: rawToken };
}

async function readResetState(pool, account, operationId) {
  const result = await pool.query(
    `select
       p.password_hash as "passwordHash",
       s.session_version as "sessionVersion",
       count(a.id) filter (where a.revoked_at is null)::int as "activeSessions",
       t.used_at as "tokenUsedAt",
       o.status as "operationStatus",
       o.target_session_version as "targetSessionVersion"
     from public.users u
     join public.password_credentials p on p.user_id = u.id
     join public.account_security s on s.user_id = u.id
     join public.password_reset_operations o on o.user_id = u.id and o.id = $2
     join public.password_reset_tokens t on t.operation_id = o.id
     left join public.auth_sessions a on a.user_id = u.id
     where u.id = $1
     group by p.password_hash, s.session_version, t.used_at,
       o.status, o.target_session_version`,
    [account.userId, operationId],
  );
  if (!result.rows[0]) throw new Error("RESET_STATE_MISSING");
  return result.rows[0];
}

async function cleanupAccount(pool, account) {
  if (account?.userId) {
    await pool.query("delete from public.users where id = $1", [account.userId]);
  }
}

async function pollResetCompletion(config, reset) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await apiRequest(
      config,
      `/api/v1/auth/password-reset-operations/${reset.operationId}/status`,
      { body: { token: reset.token } },
    );
    if (result.status === 200 && result.payload?.data?.status === "completed") {
      return result;
    }
    if (result.status !== 200 || result.payload?.data?.status !== "pending") {
      throw new Error("RESET_STATUS_FAILED");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("RESET_STATUS_TIMEOUT");
}

async function runPasswordResetChecks(context) {
  let account;
  try {
    account = await seedVerifiedAccount(
      context.pool,
      context.argon2,
      context.runId,
      "reset",
    );
    const deviceA = await login(context.config, account, "reset-a");
    const deviceB = await login(context.config, account, "reset-b");
    const reset = await createResetOperation(
      context.pool,
      account,
      context.config.tokenPepper,
    );
    const before = await readResetState(context.pool, account, reset.operationId);
    const newPassword = `${randomBytes(18).toString("base64url")}bB2!`;

    const notifier = await installCommitNotifier(context.pool, reset.operationId);
    try {
      await abortApiRequestBeforeHeaders(
        context.config,
        "/api/v1/auth/password-reset",
        { body: { ...reset, newPassword } },
        notifier.committed,
      );
    } finally {
      await notifier.remove();
    }
    await pollResetCompletion(context.config, reset);
    const concurrentRetries = await Promise.all([
      apiRequest(context.config, "/api/v1/auth/password-reset", {
        body: { ...reset, newPassword },
      }),
      apiRequest(context.config, "/api/v1/auth/password-reset", {
        body: { ...reset, newPassword },
      }),
    ]);
    for (const retry of concurrentRetries) {
      requireApiResult(retry, 200, "CONCURRENT_RESET_RETRY_FAILED");
    }
    const after = await readResetState(context.pool, account, reset.operationId);
    if (
      after.passwordHash === before.passwordHash ||
      !(await context.argon2.verify(after.passwordHash, newPassword)) ||
      after.sessionVersion !== before.sessionVersion + 1 ||
      after.activeSessions !== 0 ||
      !after.tokenUsedAt ||
      after.operationStatus !== "completed" ||
      after.targetSessionVersion !== after.sessionVersion
    ) {
      throw new Error("ATOMIC_RESET_STATE_FAILED");
    }

    await Promise.all([
      assertDeviceSessionRevoked(context.config, deviceA),
      assertDeviceSessionRevoked(context.config, deviceB),
    ]);
    await login(
      context.config,
      { ...account, password: newPassword },
      "reset-new-password",
    );

    const retried = await readResetState(context.pool, account, reset.operationId);
    if (
      retried.sessionVersion !== after.sessionVersion ||
      retried.passwordHash !== after.passwordHash ||
      retried.operationStatus !== "completed"
    ) {
      throw new Error("RESET_IDEMPOTENCY_FAILED");
    }

    return {
      atomicPasswordReset: { status: "pass", metrics: { mutations: 5 } },
      staleAccessRejected: {
        status: "pass",
        metrics: { devices: 2, accessTokens: 2, refreshTokens: 2 },
      },
      resetOperationIdempotency: {
        status: "pass",
        metrics: {
          retries: 2,
          concurrent: true,
          responseLostBeforeHeaders: true,
          terminalStatus: "completed",
        },
      },
    };
  } finally {
    await cleanupAccount(context.pool, account);
  }
}

function faultTarget(table, account, operationId) {
  if (!FAULT_TABLES.includes(table)) throw new Error("Invalid fault table");
  if (table === "password_reset_tokens") return ["operation_id", operationId];
  if (table === "password_reset_operations") return ["id", operationId];
  return ["user_id", account.userId];
}

export async function installFaultTrigger(pool, table, account, operationId) {
  const suffix = randomUUID().replaceAll("-", "");
  const functionName = `auth_gate_fail_${suffix}`;
  const triggerName = `auth_gate_trigger_${suffix}`;
  const lockKey = BigInt(`0x${suffix.slice(0, 15)}`).toString();
  const [column, value] = faultTarget(table, account, operationId);
  await pool.query(
    `create function public.${functionName}() returns trigger
     language plpgsql as $$
       begin
         if new.${column} = '${value}'::uuid then
          perform pg_advisory_xact_lock(${lockKey});
          perform pg_sleep(1);
          raise exception 'auth capability gate injected failure'
           using errcode = '${FAULT_SQLSTATE}';
       end if;
       return new;
     end
     $$`,
  );
  try {
    await pool.query(
      `create trigger ${triggerName}
       before update on public.${table}
       for each row execute function public.${functionName}()`,
    );
  } catch (error) {
    try {
      await pool.query(`drop function if exists public.${functionName}()`);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Fault trigger creation and cleanup failed",
      );
    }
    throw error;
  }
  const removeFault = async () => {
    const errors = [];
    try {
      await pool.query(`drop trigger if exists ${triggerName} on public.${table}`);
    } catch (error) {
      errors.push(error);
    }
    try {
      await pool.query(`drop function if exists public.${functionName}()`);
    } catch (error) {
      errors.push(error);
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "Fault trigger cleanup failed");
    }
  };
  removeFault.lockKey = lockKey;
  return removeFault;
}

export async function observeFaultTriggerEntry(pool, lockKey, requestPromise) {
  if (!/^\d+$/u.test(lockKey)) throw new Error("Invalid fault lock key");
  let requestSettled = false;
  void Promise.resolve(requestPromise).then(
    () => {
      requestSettled = true;
    },
    () => {
      requestSettled = true;
    },
  );
  const client = await pool.connect();
  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (requestSettled) {
        throw new Error("FAULT_REQUEST_FINISHED_BEFORE_TRIGGER_OBSERVATION");
      }
      const result = await client.query(
        "select pg_try_advisory_lock($1::bigint) as acquired",
        [lockKey],
      );
      if (result.rows[0]?.acquired === false) return;
      const unlock = await client.query(
        "select pg_advisory_unlock($1::bigint) as released",
        [lockKey],
      );
      if (unlock.rows[0]?.released !== true) {
        throw new Error("FAULT_OBSERVER_LOCK_RELEASE_FAILED");
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("FAULT_TRIGGER_LOCK_NOT_OBSERVED");
  } finally {
    client.release();
  }
}

function faultControlStatement(table, column) {
  const assignments = {
    password_credentials: "updated_at = updated_at",
    account_security: "updated_at = updated_at",
    auth_sessions: "last_used_at = last_used_at",
    password_reset_tokens: "used_at = used_at",
    password_reset_operations: "updated_at = updated_at",
  };
  return `update public.${table} set ${assignments[table]} where ${column} = $1`;
}

async function confirmFaultTrigger(pool, table, account, operationId) {
  const [column, value] = faultTarget(table, account, operationId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    try {
      await client.query(faultControlStatement(table, column), [value]);
      throw new Error("FAULT_CONTROL_DID_NOT_FIRE");
    } catch (error) {
      if (error?.code !== FAULT_SQLSTATE) throw error;
    } finally {
      await client.query("ROLLBACK");
    }
  } finally {
    client.release();
  }
}

export function isInjectedFailureResponse(result, expectedRequestId) {
  return (
    result?.status === 500 &&
    typeof expectedRequestId === "string" &&
    result.requestId === expectedRequestId
  );
}

export async function cleanupProbeArtifacts(pool) {
  const triggers = await pool.query(
    `select trigger_name as "triggerName", event_object_table as "tableName"
     from information_schema.triggers
     where trigger_schema = 'public'
       and event_object_table = any($1::text[])`,
    [FAULT_TABLES],
  );
  for (const { triggerName, tableName } of triggers.rows) {
    if (PROBE_TRIGGER_NAME.test(triggerName) && FAULT_TABLES.includes(tableName)) {
      await pool.query(
        `drop trigger if exists ${triggerName} on public.${tableName}`,
      );
    }
  }

  const functions = await pool.query(
    `select p.proname as "functionName"
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and pg_get_function_identity_arguments(p.oid) = ''`,
  );
  for (const { functionName } of functions.rows) {
    if (PROBE_FUNCTION_NAME.test(functionName)) {
      await pool.query(`drop function if exists public.${functionName}()`);
    }
  }

  const tables = await pool.query(
    `select tablename as "tableName"
     from pg_tables
     where schemaname = 'public'`,
  );
  for (const { tableName } of tables.rows) {
    if (PROBE_RLS_TABLE_NAME.test(tableName)) {
      await pool.query(`drop table if exists public.${tableName}`);
    }
  }

  await pool.query(
    `delete from public.users
     where email_normalized like 'auth-gate-%@example.invalid'`,
  );
}

export async function acquireProbeLock(pool) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `select pg_try_advisory_lock(
         hashtext('wishtoday'), hashtext('auth-gateway-capability-gate')
       ) as acquired`,
    );
    if (result.rows[0]?.acquired !== true) {
      throw new Error("Another auth capability probe is running");
    }
  } catch (error) {
    client.release();
    throw error;
  }

  return async () => {
    try {
      const result = await client.query(
        `select pg_advisory_unlock(
           hashtext('wishtoday'), hashtext('auth-gateway-capability-gate')
         ) as released`,
      );
      if (result.rows[0]?.released !== true) {
        throw new Error("Auth capability probe lock was not held");
      }
    } finally {
      client.release();
    }
  };
}

async function runFaultInjectionChecks(context) {
  const tables = [
    "password_credentials",
    "account_security",
    "auth_sessions",
    "password_reset_tokens",
    "password_reset_operations",
  ];
  for (const [index, table] of tables.entries()) {
    let account;
    let removeFault = async () => undefined;
    try {
      account = await seedVerifiedAccount(
        context.pool,
        context.argon2,
        context.runId,
        `fault-${index + 1}`,
      );
      await login(context.config, account, `fault-${index + 1}`);
      const reset = await createResetOperation(
        context.pool,
        account,
        context.config.tokenPepper,
      );
      const before = await readResetState(context.pool, account, reset.operationId);
      removeFault = await installFaultTrigger(
        context.pool,
        table,
        account,
        reset.operationId,
      );
      await confirmFaultTrigger(
        context.pool,
        table,
        account,
        reset.operationId,
      );
      const requestId = `auth-gate-${context.runId}-${randomUUID()}`;
      const responsePromise = apiRequest(
        context.config,
        "/api/v1/auth/password-reset",
        {
          body: {
            ...reset,
            newPassword: `${randomBytes(18).toString("base64url")}cC3!`,
          },
          requestId,
        },
      );
      await observeFaultTriggerEntry(
        context.pool,
        removeFault.lockKey,
        responsePromise,
      );
      const response = await responsePromise;
      if (!isInjectedFailureResponse(response, requestId)) {
        throw new Error("FAULT_NOT_OBSERVED");
      }
      const after = await readResetState(context.pool, account, reset.operationId);
      if (
        after.passwordHash !== before.passwordHash ||
        after.sessionVersion !== before.sessionVersion ||
        after.activeSessions !== before.activeSessions ||
        after.tokenUsedAt !== before.tokenUsedAt ||
        after.operationStatus !== before.operationStatus ||
        after.targetSessionVersion !== before.targetSessionVersion
      ) {
        throw new Error("FAULT_ROLLBACK_FAILED");
      }
    } finally {
      try {
        await removeFault();
      } finally {
        await cleanupAccount(context.pool, account);
      }
    }
  }
  return { status: "pass", metrics: { faultPoints: tables.length } };
}

async function runSessionChecks(context) {
  let account;
  try {
    account = await seedVerifiedAccount(
      context.pool,
      context.argon2,
      context.runId,
      "sessions",
    );
    const deviceA = await login(context.config, account, "session-a");
    const deviceB = await login(context.config, account, "session-b");
    requireApiResult(
      await apiRequest(context.config, "/api/v1/auth/logout", {
        body: {},
        cookies: deviceA.cookies,
      }),
      200,
      "LOGOUT_FAILED",
    );
    await assertDeviceSessionRevoked(context.config, deviceA);
    requireApiResult(
      await apiRequest(context.config, "/api/v1/auth/me", {
        accessToken: deviceB.accessToken,
      }),
      200,
      "OTHER_DEVICE_REVOKED",
    );

    const rotated = requireApiResult(
      await apiRequest(context.config, "/api/v1/auth/refresh", {
        body: {},
        cookies: deviceB.cookies,
      }),
      200,
      "REFRESH_ROTATION_FAILED",
    );
    if (
      !rotated.payload?.data?.accessToken ||
      !rotated.cookies.refresh ||
      !rotated.cookies.csrf
    ) {
      throw new Error("REFRESH_ROTATION_CONTRACT_FAILED");
    }
    const family = await context.pool.query(
      `select family_id as "familyId"
       from public.auth_sessions
       where refresh_token_hash = $1`,
      [tokenHash(deviceB.cookies.refresh, context.config.tokenPepper)],
    );
    const familyId = family.rows[0]?.familyId;
    if (!familyId) throw new Error("SESSION_FAMILY_MISSING");

    const [ancestorReplay, successorRotation] = await Promise.all([
      apiRequest(context.config, "/api/v1/auth/refresh", {
        body: {},
        cookies: deviceB.cookies,
      }),
      apiRequest(context.config, "/api/v1/auth/refresh", {
        body: {},
        cookies: rotated.cookies,
      }),
    ]);
    const successorWasRotated = validateReplayRaceResponses(
      ancestorReplay,
      successorRotation,
    );
    const familyState = await context.pool.query(
      `select
         count(*)::int as "sessions",
         count(*) filter (where revoked_at is null)::int as "activeSessions"
       from public.auth_sessions
       where family_id = $1`,
      [familyId],
    );
    if (
      familyState.rows[0]?.sessions < 2 ||
      familyState.rows[0]?.activeSessions !== 0
    ) {
      throw new Error("SESSION_FAMILY_REPLAY_NOT_REVOKED");
    }
    await expectAuthFailure(
      context.config,
      "/api/v1/auth/me",
      { accessToken: rotated.payload.data.accessToken },
      ["SESSION_REVOKED"],
    );
    if (successorWasRotated) {
      await expectAuthFailure(
        context.config,
        "/api/v1/auth/refresh",
        { body: {}, cookies: successorRotation.cookies },
        ["SESSION_REVOKED"],
      );
      await expectAuthFailure(
        context.config,
        "/api/v1/auth/me",
        { accessToken: successorRotation.payload.data.accessToken },
        ["SESSION_REVOKED"],
      );
    }
    return {
      status: "pass",
      metrics: {
        devices: 2,
        rotations: successorWasRotated ? 2 : 1,
        replays: 1,
        concurrentRace: true,
        activeFamilySessions: 0,
      },
    };
  } finally {
    await cleanupAccount(context.pool, account);
  }
}

export async function runRateLimitChecks(context) {
  await waitForStableRateLimitWindow(context.now, context.sleep);
  const transport = buildLoopbackRateLimitTransport(
    context.config,
    context.runId,
  );
  const normalizedEmail = `auth-gate-rate-${context.runId}@example.com`;
  const distinctEmails = Array.from(
    { length: 27 },
    (_, index) => `auth-gate-rate-${context.runId}-${index}@example.com`,
  );
  const emailVariants = [
    normalizedEmail,
    normalizedEmail.toUpperCase(),
    ` ${normalizedEmail} `,
    `AUTH-GATE-RATE-${context.runId}@EXAMPLE.COM`,
  ];
  const keys = [
    `ip:${transport.localAddress}`,
    `email:${normalizedEmail}`,
    ...distinctEmails.map((email) => `email:${email}`),
  ];
  const hashes = keys.map((key) => tokenHash(key, context.config.tokenPepper));
  let httpRequestsCompleted = false;
  try {
    const emailResults = await drainApiRequests(
      emailVariants.map((email, index) =>
        loopbackApiRequest(
          context.config,
          "/api/v1/auth/password-recovery",
          {
            body: { email },
            requestId: `auth-gate-rate-email-${context.runId}-${index}`,
            timeoutMs: context.requestTimeoutMs,
          },
          transport,
        ),
      ),
    );
    const ipResults = await drainApiRequests(
      distinctEmails.map((email, index) =>
        loopbackApiRequest(
          context.config,
          "/api/v1/auth/password-recovery",
          {
            body: { email },
            requestId: `auth-gate-rate-ip-${context.runId}-${index}`,
            timeoutMs: context.requestTimeoutMs,
          },
          transport,
        ),
      ),
    );
    httpRequestsCompleted = true;
    classifyRateLimitResponses(emailResults, 3);
    classifyRateLimitResponses(ipResults, 26);
    await assertRateLimitCounter(context.pool, hashes[0], 31);
    await assertRateLimitCounter(context.pool, hashes[1], 4);
    await assertDistinctEmailCounters(context.pool, hashes.slice(2), 26);
    return {
      status: "pass",
      metrics: {
        ipLimit: 30,
        emailLimit: 3,
        concurrent: true,
        realHttp: true,
        loopbackSource: true,
        clientForwardedIp: false,
        normalizedEmail: true,
      },
    };
  } finally {
    if (httpRequestsCompleted) {
      await deleteRateLimitCounters(context.pool, hashes);
    }
  }
}

async function assertRateLimitCounter(pool, subjectHash, expectedCount) {
  const counter = await pool.query(
    `select request_count as "requestCount"
     from public.rate_limit_counters
     where subject_hash = $1`,
    [subjectHash],
  );
  if (counter.rows.length !== 1 || counter.rows[0].requestCount !== expectedCount) {
    throw new Error("RATE_LIMIT_DATABASE_COUNTER_FAILED");
  }
}

async function assertDistinctEmailCounters(pool, subjectHashes, expectedCount) {
  const counters = await pool.query(
    `select count(*)::int as "matchingCount"
     from public.rate_limit_counters
     where subject_hash = any($1::bytea[])
       and request_count = 1`,
    [subjectHashes],
  );
  if (counters.rows[0]?.matchingCount !== expectedCount) {
    throw new Error("RATE_LIMIT_DATABASE_COUNTER_FAILED");
  }
}

async function deleteRateLimitCounters(pool, hashes) {
  if (hashes.length === 0) return;
  await pool.query(
    "delete from public.rate_limit_counters where subject_hash = any($1::bytea[])",
    [hashes],
  );
}

export async function rlsTransaction(database, tableName, userId) {
  if (!/^auth_gate_rls_[a-f0-9]+$/u.test(tableName)) {
    throw new Error("Invalid RLS probe table");
  }
  return database.transaction(async (client) => {
    await client.query("SET LOCAL ROLE wishtoday_auth_repository");
    if (userId) {
      await client.query(
        "select set_config('app.user_id', $1, true)",
        [userId],
      );
    }
    const backend = await client.query(
      `select pg_backend_pid()::int as "backendPid"`,
    );
    const result = await client.query(
      `select owner_id as "ownerId" from public.${tableName}`,
    );
    return {
      backendPid: backend.rows[0]?.backendPid,
      ownerIds: result.rows.map((row) => row.ownerId),
    };
  });
}

export async function holdPoolConnectionsExceptOne(pool, alreadyHeld = 0) {
  const max = pool.options?.max;
  if (!Number.isInteger(max) || max <= alreadyHeld + 1) {
    throw new Error("Pool size cannot reserve one application connection");
  }
  const held = [];
  try {
    for (let index = 0; index < max - alreadyHeld - 1; index += 1) {
      held.push(await pool.connect());
    }
  } catch (error) {
    for (const client of held) client.release();
    throw error;
  }
  return async () => {
    for (const client of held) client.release();
  };
}

async function runRlsChecks(context) {
  const databaseModule = await import(
    new URL("../../server/dist/database/database.service.js", import.meta.url)
  );
  const database = new databaseModule.DatabaseService(context.pool);
  const tableName = `auth_gate_rls_${randomUUID().replaceAll("-", "")}`;
  const userA = randomUUID();
  const userB = randomUUID();
  let releaseHeldConnections = async () => undefined;
  try {
    await context.pool.query(
      `create table public.${tableName} (
         owner_id uuid primary key,
         marker text not null
       )`,
    );
    await context.pool.query(
      `insert into public.${tableName} (owner_id, marker)
       values ($1, 'a'), ($2, 'b')`,
      [userA, userB],
    );
    await context.pool.query(`alter table public.${tableName} enable row level security`);
    await context.pool.query(`alter table public.${tableName} force row level security`);
    await context.pool.query(
      `create policy auth_gate_owner on public.${tableName}
       for select
       using (
         owner_id = nullif(current_setting('app.user_id', true), '')::uuid
       )`,
    );
    await context.pool.query(
      `grant select on public.${tableName} to wishtoday_auth_repository`,
    );
    releaseHeldConnections = await holdPoolConnectionsExceptOne(context.pool, 1);
    const rounds = 12;
    let backendPid;
    for (let round = 0; round < rounds; round += 1) {
      const evidenceA = await rlsTransaction(database, tableName, userA);
      const evidenceB = await rlsTransaction(database, tableName, userB);
      const withoutContext = await rlsTransaction(database, tableName);
      const evidence = [evidenceA, evidenceB, withoutContext];
      if (backendPid === undefined) backendPid = evidenceA.backendPid;
      if (
        !Number.isInteger(backendPid) ||
        evidence.some((entry) => entry.backendPid !== backendPid)
      ) {
        throw new Error("RLS_PHYSICAL_CONNECTION_NOT_REUSED");
      }
      if (evidenceA.ownerIds.length !== 1 || evidenceA.ownerIds[0] !== userA) {
        throw new Error("RLS_CONTEXT_A_LEAKED");
      }
      if (evidenceB.ownerIds.length !== 1 || evidenceB.ownerIds[0] !== userB) {
        throw new Error("RLS_CONTEXT_B_LEAKED");
      }
      if (withoutContext.ownerIds.length !== 0) {
        throw new Error("RLS_DEFAULT_DENY_FAILED");
      }
    }
    return {
      status: "pass",
      metrics: {
        sequentialTransactions: rounds * 3,
        reuseRounds: rounds,
        defaultDenyChecks: rounds,
        singlePhysicalConnection: true,
      },
    };
  } finally {
    try {
      await releaseHeldConnections();
    } finally {
      await context.pool.query(`drop table if exists public.${tableName}`);
    }
  }
}

async function safeCheck(code, work) {
  try {
    return await work();
  } catch {
    return { status: "fail", code };
  }
}

export function buildProbePoolOptions(config) {
  return {
    connectionString: config.databaseUrl,
    ssl: { ca: config.databaseCaCert, rejectUnauthorized: true },
    max: 3,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
  };
}

export async function runStagingCapabilityProbe(config) {
  const { Pool } = requireFromServer("pg");
  const argon2 = requireFromServer("argon2");
  const nestVersion = requireFromServer("@nestjs/core/package.json").version;
  const pool = new Pool(buildProbePoolOptions(config));
  const runId = randomUUID().slice(0, 8);
  let releaseProbeLock;
  try {
    const tlsClient = await pool.connect();
    try {
      assertProbeDatabaseTls(tlsClient);
    } finally {
      tlsClient.release();
    }
    releaseProbeLock = await acquireProbeLock(pool);
    await cleanupProbeArtifacts(pool);
    const migration = await pool.query(
      `select exists (
         select 1 from pg_indexes
         where schemaname = 'public'
           and indexname = 'auth_sessions_family_idx'
       ) as applied`,
    );
    if (!migration.rows[0]?.applied) throw new Error("MIGRATION_MISSING");
    const version = await pool.query("show server_version");
    const context = { config, pool, argon2, runId };
    let resetPromise;
    const resetChecks = () => {
      resetPromise ??= runPasswordResetChecks(context);
      return resetPromise;
    };
    const evidence = await executeChecks({
      atomicPasswordReset: async () =>
        safeCheck("ATOMIC_PASSWORD_RESET_FAILED", async () =>
          (await resetChecks()).atomicPasswordReset
        ),
      rollbackOnInjectedFailure: async () =>
        safeCheck("ROLLBACK_INJECTION_FAILED", () =>
          runFaultInjectionChecks(context),
        ),
      staleAccessRejected: async () =>
        safeCheck("STALE_TOKEN_REJECTION_FAILED", async () =>
          (await resetChecks()).staleAccessRejected
        ),
      refreshFamilyReplayRevoked: async () =>
        safeCheck("SESSION_REPLAY_FAILED", () => runSessionChecks(context)),
      resetOperationIdempotency: async () =>
        safeCheck("RESET_IDEMPOTENCY_FAILED", async () =>
          (await resetChecks()).resetOperationIdempotency
        ),
      postgresRateLimits: async () =>
        safeCheck("POSTGRES_RATE_LIMIT_FAILED", () =>
          runRateLimitChecks(context),
        ),
      rlsContextIsolation: async () =>
        safeCheck("RLS_CONTEXT_ISOLATION_FAILED", () => runRlsChecks(context)),
    });
    return buildProbeReport(evidence, {
      commit: config.commit,
      node: process.version,
      nest: nestVersion,
      postgres: version.rows[0]?.server_version ?? "unknown",
      service: config.service,
      serviceId: config.serviceId,
      branch: config.branch,
      region: config.region,
      plan: config.plan,
      runId,
      executedAt: new Date().toISOString(),
    });
  } finally {
    try {
      if (releaseProbeLock) await cleanupProbeArtifacts(pool);
    } finally {
      try {
        if (releaseProbeLock) await releaseProbeLock();
      } finally {
        await pool.end();
      }
    }
  }
}

function isDirectExecution() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

function stagingIsAttested(source) {
  return (
    source.RENDER === "true" &&
    source.RENDER_SERVICE_NAME === "wishtoday-api-staging" &&
    source.WISHTODAY_DEPLOYMENT_ENV === "staging" &&
    source.WISHTODAY_DEPLOYMENT_REGION === "singapore" &&
    source.WISHTODAY_DEPLOYMENT_PLAN === "starter"
  );
}

function failedEvidence(code) {
  return Object.fromEntries(
    CAPABILITY_NAMES.map((name) => [name, { status: "fail", code }]),
  );
}

if (isDirectExecution()) {
  let report;
  try {
    const config = resolveStagingConfig(process.env);
    try {
      report = await runStagingCapabilityProbe(config);
    } catch {
      const errorCode = "PROBE_SETUP_FAILED";
      report = {
        ...buildProbeReport(failedEvidence(errorCode), {
          commit: process.env.RENDER_GIT_COMMIT ?? "unknown",
          node: process.version,
          nest: "unknown",
          postgres: "unknown",
          service: config.service,
          region: config.region,
          plan: config.plan,
          runId: "setup-failed",
          executedAt: new Date().toISOString(),
        }),
        errorCode,
      };
    }
  } catch {
    const errorCode = "ENVIRONMENT_ATTESTATION_FAILED";
    report = {
      ...buildProbeReport(failedEvidence(errorCode), {
        commit: process.env.RENDER_GIT_COMMIT ?? "unknown",
        node: process.version,
        nest: "unknown",
        postgres: "unknown",
        service: process.env.RENDER_SERVICE_NAME ?? "unknown",
        region: process.env.WISHTODAY_DEPLOYMENT_REGION ?? "unknown",
        plan: process.env.WISHTODAY_DEPLOYMENT_PLAN ?? "unknown",
        runId: "not-started",
        executedAt: new Date().toISOString(),
      }),
      errorCode,
    };
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.decision === "GO" ? 0 : 1;
}
