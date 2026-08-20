import { Inject, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";

import { ScopedDatabaseService } from "../database/scoped-database.service.js";

export interface LoginAccount {
  userId: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  status: "active" | "disabled";
  sessionVersion: number;
}

export type RotateSessionResult =
  | { status: "missing" | "replayed" | "revoked" }
  | {
      status: "rotated";
      userId: string;
      sessionId: string;
      sessionVersion: number;
    };

export type ValidateSessionResult =
  | { status: "missing" | "revoked" }
  | { status: "valid"; email: string };

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(ScopedDatabaseService)
    private readonly database: ScopedDatabaseService,
  ) {}

  async createRegistration(input: {
    email: string;
    passwordHash: string;
    verificationTokenHash: Buffer;
    verificationExpiresAt: Date;
  }): Promise<"created" | "exists"> {
    return this.database.authTransaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `insert into public.users (email, email_normalized)
         values ($1, $1)
         on conflict (email_normalized) do nothing
         returning id`,
        [input.email],
      );
      const userId = inserted.rows[0]?.id;
      if (!userId) return "exists";

      await client.query(
        `insert into public.password_credentials (user_id, password_hash)
         values ($1, $2)`,
        [userId, input.passwordHash],
      );
      await client.query(
        `insert into public.account_security (user_id, session_version)
         values ($1, 1)`,
        [userId],
      );
      await client.query(
        `insert into public.email_verification_tokens
           (user_id, token_hash, expires_at)
         values ($1, $2, $3)`,
        [userId, input.verificationTokenHash, input.verificationExpiresAt],
      );
      return "created";
    });
  }

  async replaceVerificationToken(input: {
    email: string;
    tokenHash: Buffer;
    expiresAt: Date;
  }): Promise<string | null> {
    return this.database.authTransaction(async (client) => {
      const found = await client.query<{ id: string; email: string }>(
        `select id, email
         from public.users
         where email_normalized = $1
           and email_verified_at is null
           and status = 'active'
         for update`,
        [input.email],
      );
      const account = found.rows[0];
      if (!account) return null;

      await client.query(
        `update public.email_verification_tokens
         set used_at = least(now(), expires_at)
         where user_id = $1 and used_at is null`,
        [account.id],
      );
      await client.query(
        `insert into public.email_verification_tokens
           (user_id, token_hash, expires_at)
         values ($1, $2, $3)`,
        [account.id, input.tokenHash, input.expiresAt],
      );
      return account.email;
    });
  }

  async consumeVerificationToken(tokenHash: Buffer): Promise<void> {
    await this.database.authTransaction(async (client) => {
      const account = await client.query<{ user_id: string }>(
        `select u.id as user_id
         from public.users u
         join public.email_verification_tokens t on t.user_id = u.id
         where t.token_hash = $1
         for update of u`,
        [tokenHash],
      );
      if (!account.rows[0]) return;

      const consumed = await client.query<{ user_id: string }>(
        `update public.email_verification_tokens
         set used_at = now()
         where token_hash = $1
           and used_at is null
           and expires_at > now()
         returning user_id`,
        [tokenHash],
      );
      const token = consumed.rows[0];
      if (!token) return;

      await client.query(
        `update public.users
         set email_verified_at = coalesce(email_verified_at, now()), updated_at = now()
         where id = $1`,
        [token.user_id],
      );
    });
  }

  async findLoginAccount(email: string): Promise<LoginAccount | null> {
    const found = await this.database.authTransaction((client) =>
      client.query<LoginAccount>(
        `select
           u.id as "userId",
           u.email,
           p.password_hash as "passwordHash",
           u.email_verified_at as "emailVerifiedAt",
           u.status,
           s.session_version as "sessionVersion"
         from public.users u
         join public.password_credentials p on p.user_id = u.id
         join public.account_security s on s.user_id = u.id
         where u.email_normalized = $1`,
        [email],
      ),
    );
    return found.rows[0] ?? null;
  }

  async createSession(input: {
    userId: string;
    sessionVersion: number;
    refreshTokenHash: Buffer;
    deviceSummary?: string;
    expiresAt: Date;
  }): Promise<{ id: string } | null> {
    return this.database.authTransaction(async (client) => {
      if (!(await this.lockAccount(client, input.userId))) return null;
      const result = await client.query<{ id: string }>(
        `insert into public.auth_sessions
           (user_id, session_version, refresh_token_hash, device_summary, expires_at)
         select u.id, s.session_version, $3, $4, $5
         from public.users u
         join public.account_security s on s.user_id = u.id
         where u.id = $1
           and u.status = 'active'
           and u.email_verified_at is not null
           and s.session_version = $2
         returning id`,
        [
          input.userId,
          input.sessionVersion,
          input.refreshTokenHash,
          input.deviceSummary ?? null,
          input.expiresAt,
        ],
      );
      return result.rows[0] ?? null;
    });
  }

  async rotateSession(input: {
    currentTokenHash: Buffer;
    nextTokenHash: Buffer;
    expiresAt: Date;
  }): Promise<RotateSessionResult> {
    return this.database.authTransaction(async (client) => {
      if (!(await this.lockSessionAccount(client, input.currentTokenHash))) {
        return { status: "missing" };
      }
      const found = await client.query<{
        id: string;
        userId: string;
        familyId: string;
        rotationCounter: number;
        sessionVersion: number;
        currentSessionVersion: number;
        status: "active" | "disabled";
        emailVerifiedAt: Date | null;
        expiresAt: Date;
        revokedAt: Date | null;
      }>(
        `select
           a.id,
           a.user_id as "userId",
           a.family_id as "familyId",
           a.rotation_counter as "rotationCounter",
           a.session_version as "sessionVersion",
           s.session_version as "currentSessionVersion",
           u.status,
           u.email_verified_at as "emailVerifiedAt",
           a.expires_at as "expiresAt",
           a.revoked_at as "revokedAt"
         from public.auth_sessions a
         join public.users u on u.id = a.user_id
         join public.account_security s on s.user_id = a.user_id
         where a.refresh_token_hash = $1
         for update of a`,
        [input.currentTokenHash],
      );
      const current = found.rows[0];
      if (!current) return { status: "missing" };

      if (current.revokedAt) {
        await client.query(
          `update public.auth_sessions
           set revoked_at = coalesce(revoked_at, now())
           where family_id = $1`,
          [current.familyId],
        );
        return { status: "replayed" };
      }

      if (
        current.expiresAt.getTime() <= Date.now() ||
        current.status !== "active" ||
        !current.emailVerifiedAt ||
        current.sessionVersion !== current.currentSessionVersion
      ) {
        await client.query(
          `update public.auth_sessions
           set revoked_at = coalesce(revoked_at, now())
           where family_id = $1`,
          [current.familyId],
        );
        return { status: "revoked" };
      }

      await client.query(
        `update public.auth_sessions
         set revoked_at = now(), last_used_at = now()
         where id = $1`,
        [current.id],
      );
      const inserted = await client.query<{ id: string }>(
        `insert into public.auth_sessions
           (user_id, family_id, refresh_token_hash, rotation_counter,
            session_version, expires_at, last_used_at)
         values ($1, $2, $3, $4, $5, $6, now())
         returning id`,
        [
          current.userId,
          current.familyId,
          input.nextTokenHash,
          current.rotationCounter + 1,
          current.currentSessionVersion,
          input.expiresAt,
        ],
      );
      return {
        status: "rotated",
        userId: current.userId,
        sessionId: inserted.rows[0]!.id,
        sessionVersion: current.currentSessionVersion,
      };
    });
  }

  async revokeSessionByToken(tokenHash: Buffer): Promise<void> {
    await this.database.authTransaction(async (client) => {
      if (!(await this.lockSessionAccount(client, tokenHash))) return;
      const found = await client.query<{
        id: string;
        familyId: string;
        revokedAt: Date | null;
      }>(
        `select id, family_id as "familyId", revoked_at as "revokedAt"
         from public.auth_sessions
         where refresh_token_hash = $1
         for update`,
        [tokenHash],
      );
      const current = found.rows[0];
      if (!current) return;

      if (current.revokedAt) {
        await client.query(
          `update public.auth_sessions
           set revoked_at = coalesce(revoked_at, now())
           where family_id = $1`,
          [current.familyId],
        );
        return;
      }
      await client.query(
        `update public.auth_sessions
         set revoked_at = now(), last_used_at = now()
         where id = $1`,
        [current.id],
      );
    });
  }

  private async lockSessionAccount(
    client: PoolClient,
    tokenHash: Buffer,
  ): Promise<boolean> {
    const owner = await client.query<{ userId: string }>(
      `select user_id as "userId"
       from public.auth_sessions
       where refresh_token_hash = $1`,
      [tokenHash],
    );
    const userId = owner.rows[0]?.userId;
    if (!userId) return false;
    return this.lockAccount(client, userId);
  }

  private async lockAccount(
    client: PoolClient,
    userId: string,
  ): Promise<boolean> {
    const user = await client.query(
      `select id
       from public.users
       where id = $1
       for update`,
      [userId],
    );
    if (user.rowCount !== 1) return false;
    const locked = await client.query(
      `select user_id
       from public.account_security
       where user_id = $1
       for update`,
      [userId],
    );
    return locked.rowCount === 1;
  }

  async validateSession(input: {
    userId: string;
    sessionId: string;
    sessionVersion: number;
  }): Promise<ValidateSessionResult> {
    const found = await this.database.authTransaction((client) =>
      client.query<{
        email: string;
        userStatus: "active" | "disabled";
        emailVerifiedAt: Date | null;
        sessionVersion: number;
        currentSessionVersion: number;
        expiresAt: Date;
        revokedAt: Date | null;
      }>(
        `select
           u.email,
           u.status as "userStatus",
           u.email_verified_at as "emailVerifiedAt",
           a.session_version as "sessionVersion",
           s.session_version as "currentSessionVersion",
           a.expires_at as "expiresAt",
           a.revoked_at as "revokedAt"
         from public.auth_sessions a
         join public.users u on u.id = a.user_id
         join public.account_security s on s.user_id = a.user_id
         where a.id = $1 and a.user_id = $2`,
        [input.sessionId, input.userId],
      ),
    );
    const session = found.rows[0];
    if (!session) return { status: "missing" };
    if (
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.userStatus !== "active" ||
      !session.emailVerifiedAt ||
      session.sessionVersion !== session.currentSessionVersion ||
      input.sessionVersion !== session.currentSessionVersion
    ) {
      return { status: "revoked" };
    }
    return { status: "valid", email: session.email };
  }
}
