import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { Pool } from "pg";

import { AccountRecoveryRepository } from "../src/account-recovery/account-recovery.repository.js";
import { AuthRepository } from "../src/auth/auth.repository.js";
import { DatabaseService } from "../src/database/database.service.js";
import { ScopedDatabaseService } from "../src/database/scoped-database.service.js";
import {
  RateLimitExceededError,
  RateLimitService,
} from "../src/rate-limit/rate-limit.service.js";

const connectionString = process.env.DATABASE_TEST_URL?.trim();
if (!connectionString) {
  throw new Error("DATABASE_TEST_URL is required");
}

const parsed = new URL(connectionString);
const databaseName = parsed.pathname.slice(1);
const localHost = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
if (!localHost && !databaseName.toLowerCase().includes("test")) {
  throw new Error(
    "Database tests require localhost or a database name containing 'test'",
  );
}

const ssl =
  process.env.DATABASE_TEST_SSL_MODE === "require"
    ? {
        ca: Buffer.from(
          process.env.DATABASE_TEST_CA_CERT_BASE64 ?? "",
          "base64",
        ).toString("utf8"),
        rejectUnauthorized: true,
      }
    : false;

const pool = new Pool({ connectionString, ssl, max: 4 });
const files = [
  "migrations/202608130101_auth_accounts.sql",
  "migrations/202608130102_auth_tokens.sql",
  "migrations/202608130103_rate_limits.sql",
  "migrations/202608200104_auth_session_family_index.sql",
  "tests/auth_constraints.test.sql",
];

const database = new DatabaseService(pool);
const scopedDatabase = new ScopedDatabaseService(database);
const repository = new AuthRepository(scopedDatabase);
const recoveryRepository = new AccountRecoveryRepository(scopedDatabase);
const tokenPepper = "database-test-pepper-that-is-at-least-32-bytes";
const rateLimit = new RateLimitService(scopedDatabase, { tokenPepper });
const runId = randomUUID();
const email = `task3-${runId}@example.test`;
const rollbackEmail = `task3-rollback-${runId}@example.test`;
const concurrencyEmail = `task3-concurrency-${runId}@example.test`;
const expiryEmail = `task3-expiry-${runId}@example.test`;
const refreshResetEmail = `task4-refresh-reset-${runId}@example.test`;
const loginResetEmail = `task4-login-reset-${runId}@example.test`;
const tokenHash = randomBytes(32);
const rateLimitKey = `email:${email}`;
const rateLimitSubjectHash = createHmac("sha256", tokenPepper)
  .update(rateLimitKey, "utf8")
  .digest();

async function waitForDatabaseLock(minimumWaitingConnections: number): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const waiting = await pool.query<{ count: number }>(
      `select count(*)::int as count
       from pg_stat_activity
       where datname = current_database()
         and pid <> pg_backend_pid()
         and wait_event_type = 'Lock'`,
    );
    if (waiting.rows[0].count >= minimumWaitingConnections) return;
    await delay(25);
  }
  throw new Error("Timed out waiting for the database concurrency barrier");
}

async function createVerifiedTestAccount(
  accountEmail: string,
): Promise<{ userId: string; sessionVersion: number }> {
  const verificationTokenHash = randomBytes(32);
  const created = await repository.createRegistration({
    email: accountEmail,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=1$dGVzdC1zYWx0$dGVzdC1oYXNo",
    verificationTokenHash,
    verificationExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  assert.equal(created, "created");
  await repository.consumeVerificationToken(verificationTokenHash);
  const account = await pool.query<{
    user_id: string;
    session_version: number;
  }>(
    `select u.id as user_id, s.session_version
     from public.users u
     join public.account_security s on s.user_id = u.id
     where u.email_normalized = $1`,
    [accountEmail],
  );
  return {
    userId: account.rows[0].user_id,
    sessionVersion: account.rows[0].session_version,
  };
}

async function createTestRecovery(accountEmail: string): Promise<{
  operationId: string;
  tokenHash: Buffer;
}> {
  const recoveryTokenHash = randomBytes(32);
  const recovery = await recoveryRepository.createRecovery({
    email: accountEmail,
    tokenHash: recoveryTokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    statusQueryExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  assert.ok(recovery?.operationId);
  return { operationId: recovery.operationId, tokenHash: recoveryTokenHash };
}

async function assertRefreshResetLockOrder(): Promise<void> {
  const { userId, sessionVersion } =
    await createVerifiedTestAccount(refreshResetEmail);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const currentToken = randomBytes(32);
  const nextToken = randomBytes(32);
  const session = await repository.createSession({
    userId,
    sessionVersion,
    refreshTokenHash: currentToken,
    expiresAt,
  });
  assert.ok(session?.id);
  const recovery = await createTestRecovery(refreshResetEmail);
  const advisoryKey = 2_026_082_005;
  const nextTokenHex = nextToken.toString("hex");
  const barrier = await pool.connect();
  let barrierLocked = false;
  try {
    await pool.query(
      "drop trigger if exists wishtoday_test_refresh_reset_pause on public.auth_sessions",
    );
    await pool.query(
      "drop function if exists public.wishtoday_test_refresh_reset_pause()",
    );
    await pool.query(`
      create function public.wishtoday_test_refresh_reset_pause()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.refresh_token_hash = decode('${nextTokenHex}', 'hex') then
          perform pg_advisory_xact_lock(${advisoryKey});
        end if;
        return new;
      end
      $$`,
    );
    await pool.query(`
      create trigger wishtoday_test_refresh_reset_pause
      before insert on public.auth_sessions
      for each row execute function public.wishtoday_test_refresh_reset_pause()`,
    );
    await barrier.query("select pg_advisory_lock($1)", [advisoryKey]);
    barrierLocked = true;

    const refreshPromise = repository.rotateSession({
      currentTokenHash: currentToken,
      nextTokenHash: nextToken,
      expiresAt,
    });
    await waitForDatabaseLock(1);
    const resetPromise = recoveryRepository.resetPassword({
      operationId: recovery.operationId,
      tokenHash: recovery.tokenHash,
      passwordHash:
        "$argon2id$v=19$m=65536,t=3,p=1$cmVzZXQtc2FsdA$cmVzZXQtaGFzaA",
    });
    await waitForDatabaseLock(2);
    await barrier.query("select pg_advisory_unlock($1)", [advisoryKey]);
    barrierLocked = false;

    const [refresh, reset] = await Promise.all([refreshPromise, resetPromise]);
    assert.equal(refresh.status, "rotated");
    assert.equal(reset, "completed");
  } finally {
    if (barrierLocked) {
      await barrier.query("select pg_advisory_unlock($1)", [advisoryKey]);
    }
    barrier.release();
    await pool.query(
      "drop trigger if exists wishtoday_test_refresh_reset_pause on public.auth_sessions",
    );
    await pool.query(
      "drop function if exists public.wishtoday_test_refresh_reset_pause()",
    );
  }
}

async function assertLoginResetBarrier(): Promise<void> {
  const { userId, sessionVersion } =
    await createVerifiedTestAccount(loginResetEmail);
  const recovery = await createTestRecovery(loginResetEmail);
  const advisoryKey = 2_026_082_006;
  const barrier = await pool.connect();
  let barrierLocked = false;
  try {
    await pool.query(
      "drop trigger if exists wishtoday_test_login_reset_pause on public.password_credentials",
    );
    await pool.query(
      "drop function if exists public.wishtoday_test_login_reset_pause()",
    );
    await pool.query(`
      create function public.wishtoday_test_login_reset_pause()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.user_id = '${userId}'::uuid then
          perform pg_advisory_xact_lock(${advisoryKey});
        end if;
        return new;
      end
      $$`,
    );
    await pool.query(`
      create trigger wishtoday_test_login_reset_pause
      before update on public.password_credentials
      for each row execute function public.wishtoday_test_login_reset_pause()`,
    );
    await barrier.query("select pg_advisory_lock($1)", [advisoryKey]);
    barrierLocked = true;

    const resetPromise = recoveryRepository.resetPassword({
      operationId: recovery.operationId,
      tokenHash: recovery.tokenHash,
      passwordHash:
        "$argon2id$v=19$m=65536,t=3,p=1$bG9naW4tc2FsdA$bG9naW4taGFzaA",
    });
    await waitForDatabaseLock(1);
    const createPromise = repository.createSession({
      userId,
      sessionVersion,
      refreshTokenHash: randomBytes(32),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await waitForDatabaseLock(2);
    await barrier.query("select pg_advisory_unlock($1)", [advisoryKey]);
    barrierLocked = false;

    const [reset, created] = await Promise.all([resetPromise, createPromise]);
    assert.equal(reset, "completed");
    assert.equal(created, null);
    const active = await pool.query<{ count: number }>(
      `select count(*)::int as count
       from public.auth_sessions
       where user_id = $1 and revoked_at is null`,
      [userId],
    );
    assert.equal(active.rows[0].count, 0);
  } finally {
    if (barrierLocked) {
      await barrier.query("select pg_advisory_unlock($1)", [advisoryKey]);
    }
    barrier.release();
    await pool.query(
      "drop trigger if exists wishtoday_test_login_reset_pause on public.password_credentials",
    );
    await pool.query(
      "drop function if exists public.wishtoday_test_login_reset_pause()",
    );
  }
}

async function assertRepositoryContracts(): Promise<void> {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const passwordHash =
    "$argon2id$v=19$m=65536,t=3,p=1$dGVzdC1zYWx0$dGVzdC1oYXNo";

  const created = await repository.createRegistration({
    email,
    passwordHash,
    verificationTokenHash: tokenHash,
    verificationExpiresAt: expiresAt,
  });
  assert.equal(created, "created");

  const duplicate = await repository.createRegistration({
    email,
    passwordHash,
    verificationTokenHash: randomBytes(32),
    verificationExpiresAt: expiresAt,
  });
  assert.equal(duplicate, "exists");

  const registration = await pool.query<{
    id: string;
    credential_count: number;
    security_count: number;
    verification_count: number;
  }>(
    `select
       u.id,
       count(distinct p.user_id)::int as credential_count,
       count(distinct s.user_id)::int as security_count,
       count(distinct v.id)::int as verification_count
     from public.users u
     left join public.password_credentials p on p.user_id = u.id
     left join public.account_security s on s.user_id = u.id
     left join public.email_verification_tokens v on v.user_id = u.id
     where u.email_normalized = $1
     group by u.id`,
    [email],
  );
  assert.equal(registration.rowCount, 1);
  assert.deepEqual(
    {
      credentialCount: registration.rows[0].credential_count,
      securityCount: registration.rows[0].security_count,
      verificationCount: registration.rows[0].verification_count,
    },
    { credentialCount: 1, securityCount: 1, verificationCount: 1 },
  );

  await assert.rejects(
    repository.createRegistration({
      email: rollbackEmail,
      passwordHash,
      verificationTokenHash: tokenHash,
      verificationExpiresAt: expiresAt,
    }),
    (error: unknown) =>
      typeof error === "object" && error !== null && "code" in error && error.code === "23505",
  );
  const rolledBack = await pool.query(
    "select 1 from public.users where email_normalized = $1",
    [rollbackEmail],
  );
  assert.equal(rolledBack.rowCount, 0);

  await Promise.all([
    repository.consumeVerificationToken(tokenHash),
    repository.consumeVerificationToken(tokenHash),
  ]);
  const verified = await pool.query<{
    email_verified_at: Date | null;
    used_at: Date | null;
  }>(
    `select u.email_verified_at, v.used_at
     from public.users u
     join public.email_verification_tokens v on v.user_id = u.id
     where u.email_normalized = $1`,
    [email],
  );
  assert.ok(verified.rows[0].email_verified_at instanceof Date);
  assert.ok(verified.rows[0].used_at instanceof Date);

  const session = await repository.createSession({
    userId: registration.rows[0].id,
    sessionVersion: 1,
    refreshTokenHash: randomBytes(32),
    deviceSummary: "database-test",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  assert.ok(session?.id);
  const staleSession = await repository.createSession({
    userId: registration.rows[0].id,
    sessionVersion: 2,
    refreshTokenHash: randomBytes(32),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  assert.equal(staleSession, null);

  await Promise.all(
    Array.from({ length: 5 }, () => rateLimit.consume(rateLimitKey, "1h", 5)),
  );
  await assert.rejects(
    rateLimit.consume(rateLimitKey, "1h", 5),
    RateLimitExceededError,
  );
  const counter = await pool.query<{ request_count: number }>(
    `select request_count
     from public.rate_limit_counters
     where subject_hash = $1 and window_kind = '1h'`,
    [rateLimitSubjectHash],
  );
  assert.equal(counter.rows[0].request_count, 6);

  const permissions = await pool.query<{
    repository_can_select: boolean;
    public_acl_count: number;
  }>(
    `select
       has_table_privilege(
         'wishtoday_auth_repository',
         'public.password_credentials',
         'select'
       ) as repository_can_select,
       (
         select count(*)::int
         from pg_class c
         cross join lateral aclexplode(
           coalesce(c.relacl, acldefault('r', c.relowner))
         ) acl
         where c.oid = 'public.password_credentials'::regclass
           and acl.grantee = 0
       ) as public_acl_count`,
  );
  assert.equal(permissions.rows[0].repository_can_select, true);
  assert.equal(permissions.rows[0].public_acl_count, 0);

  const supabaseRolePermissions = await pool.query<{
    rolname: string;
    can_select_credentials: boolean;
    can_select_tokens: boolean;
  }>(
    `select
       rolname,
       has_table_privilege(
         rolname,
         'public.password_credentials',
         'select'
       ) as can_select_credentials,
       has_table_privilege(
         rolname,
         'public.email_verification_tokens',
         'select'
       ) as can_select_tokens
     from pg_roles
     where rolname = any($1::text[])
     order by rolname`,
    [["anon", "authenticated", "service_role"]],
  );
  for (const role of supabaseRolePermissions.rows) {
    assert.equal(role.can_select_credentials, false, `${role.rolname} can read credentials`);
    assert.equal(role.can_select_tokens, false, `${role.rolname} can read tokens`);
  }
}

async function assertVerificationConcurrencyContracts(): Promise<void> {
  const passwordHash =
    "$argon2id$v=19$m=65536,t=3,p=1$dGVzdC1zYWx0$dGVzdC1oYXNo";
  const concurrentTokenHash = randomBytes(32);
  await repository.createRegistration({
    email: concurrencyEmail,
    passwordHash,
    verificationTokenHash: concurrentTokenHash,
    verificationExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  await pool.query(
    `create function public.wishtoday_test_delay_token_update()
     returns trigger
     language plpgsql
     as $$
     begin
       perform pg_sleep(0.2);
       return new;
     end
     $$;
     create trigger wishtoday_test_delay_token_update
     before update of used_at on public.email_verification_tokens
     for each row
     when (old.used_at is null and new.used_at is not null)
     execute function public.wishtoday_test_delay_token_update()`,
  );
  try {
    const consume = repository.consumeVerificationToken(concurrentTokenHash);
    await delay(50);
    const resend = repository.replaceVerificationToken({
      email: concurrencyEmail,
      tokenHash: randomBytes(32),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const results = await Promise.allSettled([consume, resend]);
    assert.deepEqual(
      results.map((result) => result.status),
      ["fulfilled", "fulfilled"],
    );
  } finally {
    await pool.query(
      `drop trigger if exists wishtoday_test_delay_token_update
         on public.email_verification_tokens;
       drop function if exists public.wishtoday_test_delay_token_update()`,
    );
  }

  const verified = await pool.query<{ email_verified_at: Date | null }>(
    "select email_verified_at from public.users where email_normalized = $1",
    [concurrencyEmail],
  );
  assert.ok(verified.rows[0].email_verified_at instanceof Date);

  const expiringTokenHash = randomBytes(32);
  await repository.createRegistration({
    email: expiryEmail,
    passwordHash,
    verificationTokenHash: expiringTokenHash,
    verificationExpiresAt: new Date(Date.now() + 150),
  });
  await delay(250);
  const originalDateNow = Date.now;
  Date.now = () => 0;
  try {
    await repository.consumeVerificationToken(expiringTokenHash);
  } finally {
    Date.now = originalDateNow;
  }
  const expired = await pool.query<{
    email_verified_at: Date | null;
    used_at: Date | null;
  }>(
    `select u.email_verified_at, v.used_at
     from public.users u
     join public.email_verification_tokens v on v.user_id = u.id
     where u.email_normalized = $1`,
    [expiryEmail],
  );
  assert.equal(expired.rows[0].email_verified_at, null);
  assert.equal(expired.rows[0].used_at, null);
}

async function assertConcurrentReplayRevokesFamily(
  userId: string,
  sessionVersion: number,
  expiresAt: Date,
): Promise<void> {
  const ancestorToken = randomBytes(32);
  const currentToken = randomBytes(32);
  const nextToken = randomBytes(32);
  const ancestor = await repository.createSession({
    userId,
    sessionVersion,
    refreshTokenHash: ancestorToken,
    expiresAt,
  });
  assert.ok(ancestor?.id);
  const firstRotation = await repository.rotateSession({
    currentTokenHash: ancestorToken,
    nextTokenHash: currentToken,
    expiresAt,
  });
  assert.equal(firstRotation.status, "rotated");

  const advisoryKey = 2_026_082_004;
  const nextTokenHex = nextToken.toString("hex");
  const barrier = await pool.connect();
  let barrierLocked = false;
  try {
    await pool.query(
      "drop trigger if exists wishtoday_test_session_insert_pause on public.auth_sessions",
    );
    await pool.query(
      "drop function if exists public.wishtoday_test_session_insert_pause()",
    );
    await pool.query(`
      create function public.wishtoday_test_session_insert_pause()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.refresh_token_hash = decode('${nextTokenHex}', 'hex') then
          perform pg_advisory_xact_lock(${advisoryKey});
        end if;
        return new;
      end
      $$`,
    );
    await pool.query(`
      create trigger wishtoday_test_session_insert_pause
      before insert on public.auth_sessions
      for each row execute function public.wishtoday_test_session_insert_pause()`,
    );
    await barrier.query("select pg_advisory_lock($1)", [advisoryKey]);
    barrierLocked = true;

    const rotationPromise = repository.rotateSession({
      currentTokenHash: currentToken,
      nextTokenHash: nextToken,
      expiresAt,
    });
    await waitForDatabaseLock(1);
    const replayPromise = repository.rotateSession({
      currentTokenHash: ancestorToken,
      nextTokenHash: randomBytes(32),
      expiresAt,
    });
    await waitForDatabaseLock(2);
    await barrier.query("select pg_advisory_unlock($1)", [advisoryKey]);
    barrierLocked = false;

    const [rotation, replay] = await Promise.all([
      rotationPromise,
      replayPromise,
    ]);
    assert.equal(rotation.status, "rotated");
    assert.equal(replay.status, "replayed");

    const active = await pool.query<{ count: number }>(
      `select count(*)::int as count
       from public.auth_sessions
       where family_id = (
         select family_id from public.auth_sessions where refresh_token_hash = $1
       ) and revoked_at is null`,
      [ancestorToken],
    );
    assert.equal(active.rows[0].count, 0);
  } finally {
    if (barrierLocked) {
      await barrier.query("select pg_advisory_unlock($1)", [advisoryKey]);
    }
    barrier.release();
    await pool.query(
      "drop trigger if exists wishtoday_test_session_insert_pause on public.auth_sessions",
    );
    await pool.query(
      "drop function if exists public.wishtoday_test_session_insert_pause()",
    );
  }
}

async function assertSessionAndRecoveryContracts(userId: string): Promise<void> {
  const sessionVersionResult = await pool.query<{ session_version: number }>(
    "select session_version from public.account_security where user_id = $1",
    [userId],
  );
  const sessionVersion = sessionVersionResult.rows[0].session_version;
  const deviceAToken = randomBytes(32);
  const deviceANextToken = randomBytes(32);
  const deviceBToken = randomBytes(32);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const deviceA = await repository.createSession({
    userId,
    sessionVersion,
    refreshTokenHash: deviceAToken,
    deviceSummary: "database-test-device-a",
    expiresAt,
  });
  const deviceB = await repository.createSession({
    userId,
    sessionVersion,
    refreshTokenHash: deviceBToken,
    deviceSummary: "database-test-device-b",
    expiresAt,
  });
  assert.ok(deviceA?.id);
  assert.ok(deviceB?.id);
  assert.notEqual(deviceA.id, deviceB.id);

  const rotated = await repository.rotateSession({
    currentTokenHash: deviceAToken,
    nextTokenHash: deviceANextToken,
    expiresAt,
  });
  assert.equal(rotated.status, "rotated");
  if (rotated.status !== "rotated") throw new Error("Device A did not rotate");
  assert.equal(
    (await repository.validateSession({
      userId,
      sessionId: deviceA.id,
      sessionVersion,
    })).status,
    "revoked",
  );
  assert.equal(
    (await repository.validateSession({
      userId,
      sessionId: rotated.sessionId,
      sessionVersion,
    })).status,
    "valid",
  );
  assert.equal(
    (await repository.validateSession({
      userId,
      sessionId: deviceB.id,
      sessionVersion,
    })).status,
    "valid",
  );

  assert.equal(
    (await repository.rotateSession({
      currentTokenHash: deviceAToken,
      nextTokenHash: randomBytes(32),
      expiresAt,
    })).status,
    "replayed",
  );
  assert.equal(
    (await repository.validateSession({
      userId,
      sessionId: rotated.sessionId,
      sessionVersion,
    })).status,
    "revoked",
  );
  assert.equal(
    (await repository.validateSession({
      userId,
      sessionId: deviceB.id,
      sessionVersion,
    })).status,
    "valid",
  );

  await repository.revokeSessionByToken(deviceBToken);
  assert.equal(
    (await repository.validateSession({
      userId,
      sessionId: deviceB.id,
      sessionVersion,
    })).status,
    "revoked",
  );

  const logoutDeviceCToken = randomBytes(32);
  const logoutDeviceDToken = randomBytes(32);
  const logoutDeviceC = await repository.createSession({
    userId,
    sessionVersion,
    refreshTokenHash: logoutDeviceCToken,
    expiresAt,
  });
  const logoutDeviceD = await repository.createSession({
    userId,
    sessionVersion,
    refreshTokenHash: logoutDeviceDToken,
    expiresAt,
  });
  assert.ok(logoutDeviceC?.id);
  assert.ok(logoutDeviceD?.id);
  await repository.revokeSessionByToken(logoutDeviceCToken);
  assert.equal(
    (await repository.validateSession({
      userId,
      sessionId: logoutDeviceC.id,
      sessionVersion,
    })).status,
    "revoked",
  );
  assert.equal(
    (await repository.validateSession({
      userId,
      sessionId: logoutDeviceD.id,
      sessionVersion,
    })).status,
    "valid",
  );

  await assertConcurrentReplayRevokesFamily(userId, sessionVersion, expiresAt);

  const familyIndex = await pool.query<{ exists: boolean }>(
    `select exists (
       select 1 from pg_indexes
       where schemaname = 'public'
         and tablename = 'auth_sessions'
         and indexname = 'auth_sessions_family_idx'
     )`,
  );
  assert.equal(familyIndex.rows[0].exists, true);

  const resetSessionA = await repository.createSession({
    userId,
    sessionVersion,
    refreshTokenHash: randomBytes(32),
    expiresAt,
  });
  const resetSessionB = await repository.createSession({
    userId,
    sessionVersion,
    refreshTokenHash: randomBytes(32),
    expiresAt,
  });
  assert.ok(resetSessionA?.id);
  assert.ok(resetSessionB?.id);

  const recoveryTokenHash = randomBytes(32);
  const recovery = await recoveryRepository.createRecovery({
    email,
    tokenHash: recoveryTokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    statusQueryExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  assert.ok(recovery?.operationId);
  assert.equal(
    await recoveryRepository.inspectPasswordReset({
      operationId: recovery.operationId,
      tokenHash: recoveryTokenHash,
    }),
    "pending",
  );
  assert.equal(
    await recoveryRepository.inspectPasswordReset({
      operationId: recovery.operationId,
      tokenHash: randomBytes(32),
    }),
    "invalid",
  );
  const newPasswordHash =
    "$argon2id$v=19$m=65536,t=3,p=1$bmV3LXRlc3Qtc2FsdA$bmV3LXRlc3QtaGFzaA";
  assert.equal(
    await recoveryRepository.resetPassword({
      operationId: recovery.operationId,
      tokenHash: recoveryTokenHash,
      passwordHash: newPasswordHash,
    }),
    "completed",
  );

  const resetState = await pool.query<{
    password_hash: string;
    session_version: number;
    active_sessions: number;
    used_at: Date | null;
    status: string;
    target_session_version: number | null;
  }>(
    `select
       p.password_hash,
       s.session_version,
       (select count(*)::int from public.auth_sessions a
        where a.user_id = u.id and a.revoked_at is null) as active_sessions,
       t.used_at,
       o.status,
       o.target_session_version
     from public.users u
     join public.password_credentials p on p.user_id = u.id
     join public.account_security s on s.user_id = u.id
     join public.password_reset_operations o on o.user_id = u.id
     join public.password_reset_tokens t on t.operation_id = o.id
     where o.id = $1`,
    [recovery.operationId],
  );
  assert.equal(resetState.rows[0].password_hash, newPasswordHash);
  assert.equal(resetState.rows[0].session_version, sessionVersion + 1);
  assert.equal(resetState.rows[0].active_sessions, 0);
  assert.ok(resetState.rows[0].used_at instanceof Date);
  assert.equal(resetState.rows[0].status, "completed");
  assert.equal(resetState.rows[0].target_session_version, sessionVersion + 1);
  assert.equal(
    await recoveryRepository.inspectPasswordReset({
      operationId: recovery.operationId,
      tokenHash: recoveryTokenHash,
    }),
    "completed",
  );
  assert.equal(
    await recoveryRepository.getResetStatus({
      operationId: recovery.operationId,
      tokenHash: recoveryTokenHash,
    }),
    "completed",
  );
  assert.equal(
    await recoveryRepository.getResetStatus({
      operationId: recovery.operationId,
      tokenHash: randomBytes(32),
    }),
    null,
  );

  assert.equal(
    await recoveryRepository.resetPassword({
      operationId: recovery.operationId,
      tokenHash: recoveryTokenHash,
      passwordHash:
        "$argon2id$v=19$m=65536,t=3,p=1$aWRlbXBvdGVudC1zYWx0$aWRlbXBvdGVudC1oYXNo",
    }),
    "completed",
  );
  const retried = await pool.query<{
    password_hash: string;
    session_version: number;
  }>(
    `select p.password_hash, s.session_version
     from public.password_credentials p
     join public.account_security s on s.user_id = p.user_id
     where p.user_id = $1`,
    [userId],
  );
  assert.equal(retried.rows[0].password_hash, newPasswordHash);
  assert.equal(retried.rows[0].session_version, sessionVersion + 1);

  const concurrentTokenHash = randomBytes(32);
  const concurrentRecovery = await recoveryRepository.createRecovery({
    email,
    tokenHash: concurrentTokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    statusQueryExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  assert.ok(concurrentRecovery?.operationId);
  const concurrentResults = await Promise.all([
    recoveryRepository.resetPassword({
      operationId: concurrentRecovery.operationId,
      tokenHash: concurrentTokenHash,
      passwordHash:
        "$argon2id$v=19$m=65536,t=3,p=1$Y29uY3VycmVudC1zYWx0$Y29uY3VycmVudC1oYXNo",
    }),
    recoveryRepository.resetPassword({
      operationId: concurrentRecovery.operationId,
      tokenHash: concurrentTokenHash,
      passwordHash:
        "$argon2id$v=19$m=65536,t=3,p=1$cmV0cnktc2FsdA$cmV0cnktaGFzaA",
    }),
  ]);
  assert.deepEqual(concurrentResults, ["completed", "completed"]);
  const concurrentVersion = await pool.query<{ session_version: number }>(
    "select session_version from public.account_security where user_id = $1",
    [userId],
  );
  assert.equal(concurrentVersion.rows[0].session_version, sessionVersion + 2);
}

const passwordResetFaultTargets = [
  { table: "password_credentials", column: "password_hash" },
  { table: "account_security", column: "session_version" },
  { table: "auth_sessions", column: "revoked_at" },
  { table: "password_reset_tokens", column: "used_at" },
  { table: "password_reset_operations", column: "status" },
] as const;

async function removePasswordResetFaultTriggers(): Promise<void> {
  for (const target of passwordResetFaultTargets) {
    await pool.query(
      `drop trigger if exists wishtoday_test_password_reset_fault
         on public.${target.table}`,
    );
  }
  await pool.query(
    "drop function if exists public.wishtoday_test_password_reset_fault()",
  );
}

async function assertPasswordResetRollbackContracts(userId: string): Promise<void> {
  await removePasswordResetFaultTriggers();
  await pool.query(
    `create function public.wishtoday_test_password_reset_fault()
     returns trigger
     language plpgsql
     as $$
     begin
       raise exception 'injected password reset failure';
     end
     $$`,
  );

  for (const target of passwordResetFaultTargets) {
    const before = await pool.query<{
      password_hash: string;
      session_version: number;
    }>(
      `select p.password_hash, s.session_version
       from public.password_credentials p
       join public.account_security s on s.user_id = p.user_id
       where p.user_id = $1`,
      [userId],
    );
    const session = await repository.createSession({
      userId,
      sessionVersion: before.rows[0].session_version,
      refreshTokenHash: randomBytes(32),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    assert.ok(session?.id);
    const recoveryTokenHash = randomBytes(32);
    const recovery = await recoveryRepository.createRecovery({
      email,
      tokenHash: recoveryTokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      statusQueryExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    assert.ok(recovery?.operationId);

    await pool.query(
      `create trigger wishtoday_test_password_reset_fault
       before update of ${target.column} on public.${target.table}
       for each row
       execute function public.wishtoday_test_password_reset_fault()`,
    );
    try {
      await assert.rejects(
        recoveryRepository.resetPassword({
          operationId: recovery.operationId,
          tokenHash: recoveryTokenHash,
          passwordHash:
            "$argon2id$v=19$m=65536,t=3,p=1$ZmF1bHQtc2FsdA$ZmF1bHQtaGFzaA",
        }),
        /injected password reset failure/,
      );
    } finally {
      await pool.query(
        `drop trigger if exists wishtoday_test_password_reset_fault
           on public.${target.table}`,
      );
    }

    const after = await pool.query<{
      password_hash: string;
      session_version: number;
      revoked_at: Date | null;
      used_at: Date | null;
      status: string;
      completed_at: Date | null;
    }>(
      `select
         p.password_hash,
         s.session_version,
         a.revoked_at,
         t.used_at,
         o.status,
         o.completed_at
       from public.password_credentials p
       join public.account_security s on s.user_id = p.user_id
       join public.auth_sessions a on a.user_id = p.user_id
       join public.password_reset_operations o on o.user_id = p.user_id
       join public.password_reset_tokens t on t.operation_id = o.id
       where p.user_id = $1 and a.id = $2 and o.id = $3`,
      [userId, session.id, recovery.operationId],
    );
    assert.equal(after.rows[0].password_hash, before.rows[0].password_hash);
    assert.equal(after.rows[0].session_version, before.rows[0].session_version);
    assert.equal(after.rows[0].revoked_at, null);
    assert.equal(after.rows[0].used_at, null);
    assert.equal(after.rows[0].status, "pending");
    assert.equal(after.rows[0].completed_at, null);
  }
}

try {
  for (const file of files) {
    const sql = await readFile(resolve(process.cwd(), "../supabase", file), "utf8");
    await pool.query(sql);
  }
  await assertRepositoryContracts();
  await assertVerificationConcurrencyContracts();
  const account = await pool.query<{ id: string }>(
    "select id from public.users where email_normalized = $1",
    [email],
  );
  await assertSessionAndRecoveryContracts(account.rows[0].id);
  await assertPasswordResetRollbackContracts(account.rows[0].id);
  await assertRefreshResetLockOrder();
  await assertLoginResetBarrier();
  process.stdout.write(
    `${JSON.stringify({
      status: "ok",
      migrations: files.filter((file) => file.startsWith("migrations/")).length,
      constraintSuite: "auth",
      repositorySuite:
        "registration-verification-session-rotation-password-reset-rate-limit",
    })}\n`,
  );
} finally {
  await removePasswordResetFaultTriggers().catch(() => undefined);
  await pool.query(
    "delete from public.rate_limit_counters where subject_hash = $1",
    [rateLimitSubjectHash],
  ).catch(() => undefined);
  await pool.query(
    "delete from public.users where email_normalized = any($1::text[])",
    [[
      email,
      rollbackEmail,
      concurrencyEmail,
      expiryEmail,
      refreshResetEmail,
      loginResetEmail,
    ]],
  ).catch(() => undefined);
  await pool.end();
}
