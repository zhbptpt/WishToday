import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { Pool } from "pg";

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
  "tests/auth_constraints.test.sql",
];

const database = new DatabaseService(pool);
const scopedDatabase = new ScopedDatabaseService(database);
const repository = new AuthRepository(scopedDatabase);
const tokenPepper = "database-test-pepper-that-is-at-least-32-bytes";
const rateLimit = new RateLimitService(scopedDatabase, { tokenPepper });
const runId = randomUUID();
const email = `task3-${runId}@example.test`;
const rollbackEmail = `task3-rollback-${runId}@example.test`;
const concurrencyEmail = `task3-concurrency-${runId}@example.test`;
const expiryEmail = `task3-expiry-${runId}@example.test`;
const tokenHash = randomBytes(32);
const rateLimitKey = `email:${email}`;
const rateLimitSubjectHash = createHmac("sha256", tokenPepper)
  .update(rateLimitKey, "utf8")
  .digest();

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
    deviceSummary: "database-test",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  assert.ok(session?.id);
  const staleSession = await repository.createSession({
    userId: registration.rows[0].id,
    sessionVersion: 2,
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

try {
  for (const file of files) {
    const sql = await readFile(resolve(process.cwd(), "../supabase", file), "utf8");
    await pool.query(sql);
  }
  await assertRepositoryContracts();
  await assertVerificationConcurrencyContracts();
  process.stdout.write(
    `${JSON.stringify({
      status: "ok",
      migrations: 3,
      constraintSuite: "auth",
      repositorySuite: "registration-verification-session-rate-limit",
    })}\n`,
  );
} finally {
  await pool.query(
    "delete from public.rate_limit_counters where subject_hash = $1",
    [rateLimitSubjectHash],
  ).catch(() => undefined);
  await pool.query(
    "delete from public.users where email_normalized = any($1::text[])",
    [[email, rollbackEmail, concurrencyEmail, expiryEmail]],
  ).catch(() => undefined);
  await pool.end();
}
