import { Inject, Injectable } from "@nestjs/common";

import { ScopedDatabaseService } from "../database/scoped-database.service.js";

export type PasswordResetStatus = "pending" | "completed" | "failed";

@Injectable()
export class AccountRecoveryRepository {
  constructor(
    @Inject(ScopedDatabaseService)
    private readonly database: ScopedDatabaseService,
  ) {}

  async createRecovery(input: {
    email: string;
    tokenHash: Buffer;
    expiresAt: Date;
    statusQueryExpiresAt: Date;
  }): Promise<{ email: string; operationId: string } | null> {
    return this.database.authTransaction(async (client) => {
      const account = await client.query<{ id: string; email: string }>(
        `select id, email
         from public.users
         where email_normalized = $1
           and status = 'active'
           and email_verified_at is not null`,
        [input.email],
      );
      const user = account.rows[0];
      if (!user) return null;

      const operation = await client.query<{ id: string }>(
        `insert into public.password_reset_operations (user_id)
         values ($1)
         returning id`,
        [user.id],
      );
      const operationId = operation.rows[0]!.id;
      await client.query(
        `insert into public.password_reset_tokens
           (operation_id, user_id, token_hash, expires_at, status_query_expires_at)
         values ($1, $2, $3, $4, $5)`,
        [
          operationId,
          user.id,
          input.tokenHash,
          input.expiresAt,
          input.statusQueryExpiresAt,
        ],
      );
      return { email: user.email, operationId };
    });
  }

  async resetPassword(input: {
    operationId: string;
    tokenHash: Buffer;
    passwordHash: string;
  }): Promise<"completed" | "invalid"> {
    return this.database.authTransaction(async (client) => {
      const locked = await client.query<{
        userId: string;
        status: PasswordResetStatus;
        tokenUsedAt: Date | null;
        expiresAt: Date;
      }>(
        `select
           o.user_id as "userId",
           o.status,
           t.used_at as "tokenUsedAt",
           t.expires_at as "expiresAt"
         from public.password_reset_operations o
         join public.password_reset_tokens t on t.operation_id = o.id
         join public.users u on u.id = o.user_id
         where o.id = $1 and t.token_hash = $2
         for update of o, t, u`,
        [input.operationId, input.tokenHash],
      );
      const reset = locked.rows[0];
      if (!reset) return "invalid";
      if (reset.status === "completed") return "completed";
      if (
        reset.status !== "pending" ||
        reset.tokenUsedAt ||
        reset.expiresAt.getTime() <= Date.now()
      ) {
        return "invalid";
      }

      const credential = await client.query(
        `update public.password_credentials
         set password_hash = $2,
             password_changed_at = now(),
             updated_at = now()
         where user_id = $1`,
        [reset.userId, input.passwordHash],
      );
      if (credential.rowCount !== 1) {
        throw new Error("Password credential update failed");
      }
      const security = await client.query<{ sessionVersion: number }>(
        `update public.account_security
         set session_version = session_version + 1, updated_at = now()
         where user_id = $1
         returning session_version as "sessionVersion"`,
        [reset.userId],
      );
      const sessionVersion = security.rows[0]?.sessionVersion;
      if (!sessionVersion) {
        throw new Error("Account security version update failed");
      }
      await client.query(
        `update public.auth_sessions
         set revoked_at = coalesce(revoked_at, now())
         where user_id = $1`,
        [reset.userId],
      );
      const consumed = await client.query(
        `update public.password_reset_tokens
         set used_at = now()
         where operation_id = $1`,
        [input.operationId],
      );
      if (consumed.rowCount !== 1) {
        throw new Error("Password reset token consumption failed");
      }
      const completed = await client.query(
        `update public.password_reset_operations
         set status = 'completed',
             target_session_version = $2,
             result_code = 'PASSWORD_RESET',
             completed_at = now(),
             updated_at = now()
         where id = $1`,
        [input.operationId, sessionVersion],
      );
      if (completed.rowCount !== 1) {
        throw new Error("Password reset operation completion failed");
      }
      return "completed";
    });
  }

  async inspectPasswordReset(input: {
    operationId: string;
    tokenHash: Buffer;
  }): Promise<"pending" | "completed" | "invalid"> {
    const found = await this.database.authTransaction((client) =>
      client.query<{ status: "pending" | "completed" }>(
        `select o.status
         from public.password_reset_operations o
         join public.password_reset_tokens t on t.operation_id = o.id
         where o.id = $1
           and t.token_hash = $2
           and (
             o.status = 'completed'
             or (
               o.status = 'pending'
               and t.used_at is null
               and t.expires_at > now()
             )
           )`,
        [input.operationId, input.tokenHash],
      ),
    );
    return found.rows[0]?.status ?? "invalid";
  }

  async getResetStatus(input: {
    operationId: string;
    tokenHash: Buffer;
  }): Promise<PasswordResetStatus | null> {
    const found = await this.database.authTransaction((client) =>
      client.query<{ status: PasswordResetStatus }>(
        `select o.status
         from public.password_reset_operations o
         join public.password_reset_tokens t on t.operation_id = o.id
         where o.id = $1
           and t.token_hash = $2
           and t.status_query_expires_at > now()`,
        [input.operationId, input.tokenHash],
      ),
    );
    return found.rows[0]?.status ?? null;
  }
}
