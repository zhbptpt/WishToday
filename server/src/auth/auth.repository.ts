import { Inject, Injectable } from "@nestjs/common";

import { ScopedDatabaseService } from "../database/scoped-database.service.js";

export interface LoginAccount {
  userId: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  status: "active" | "disabled";
  sessionVersion: number;
}

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
    deviceSummary?: string;
    expiresAt: Date;
  }): Promise<{ id: string } | null> {
    const result = await this.database.authTransaction((client) =>
      client.query<{ id: string }>(
        `insert into public.auth_sessions
           (user_id, session_version, device_summary, expires_at)
         select u.id, s.session_version, $3, $4
         from public.users u
         join public.account_security s on s.user_id = u.id
         where u.id = $1
           and u.status = 'active'
           and u.email_verified_at is not null
           and s.session_version = $2
         returning id`,
        [input.userId, input.sessionVersion, input.deviceSummary ?? null, input.expiresAt],
      ),
    );
    return result.rows[0] ?? null;
  }
}
