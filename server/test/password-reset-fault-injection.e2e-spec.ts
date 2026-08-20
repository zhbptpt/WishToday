import { describe, expect, it } from "vitest";

import { AccountRecoveryRepository } from "../src/account-recovery/account-recovery.repository.js";
import type { ScopedDatabaseService } from "../src/database/scoped-database.service.js";

interface ResetState {
  passwordHash: string;
  sessionVersion: number;
  sessionsRevoked: boolean;
  tokenUsed: boolean;
  operationStatus: "pending" | "completed";
  targetSessionVersion: number | null;
}

const OPERATION_ID = "5a7dfce8-61f2-4df7-bec2-88a704545d27";
const USER_ID = "1a24ad91-2364-429b-a7cb-65ba0041c589";
const TOKEN_HASH = Buffer.alloc(32, 7);

function fixture(options: {
  failMutation?: number;
  missingCredential?: boolean;
} = {}) {
  let state: ResetState = {
    passwordHash: "$argon2id$old",
    sessionVersion: 1,
    sessionsRevoked: false,
    tokenUsed: false,
    operationStatus: "pending",
    targetSessionVersion: null,
  };
  let mutation = 0;

  const database = {
    authTransaction: async <T>(work: (client: { query: Function }) => Promise<T>) => {
      const snapshot = structuredClone(state);
      const client = {
        query: async (sql: string, values?: unknown[]) => {
          if (sql.includes("from public.password_reset_operations o")) {
            return {
              rows: [
                {
                  userId: USER_ID,
                  status: state.operationStatus,
                  tokenUsedAt: state.tokenUsed ? new Date() : null,
                  expiresAt: new Date(Date.now() + 60_000),
                },
              ],
            };
          }

          const mutationIndex = mutation++;
          if (options.failMutation === mutationIndex) {
            throw new Error(`injected mutation failure ${mutationIndex}`);
          }
          if (sql.includes("update public.password_credentials")) {
            if (options.missingCredential) return { rows: [], rowCount: 0 };
            state.passwordHash = String(values?.[1]);
            return { rows: [], rowCount: 1 };
          }
          if (sql.includes("update public.account_security")) {
            state.sessionVersion += 1;
            return {
              rows: [{ sessionVersion: state.sessionVersion }],
              rowCount: 1,
            };
          }
          if (sql.includes("update public.auth_sessions")) {
            state.sessionsRevoked = true;
            return { rows: [], rowCount: 2 };
          }
          if (sql.includes("update public.password_reset_tokens")) {
            state.tokenUsed = true;
            return { rows: [], rowCount: 1 };
          }
          if (sql.includes("update public.password_reset_operations")) {
            state.operationStatus = "completed";
            state.targetSessionVersion = Number(values?.[1]);
            return { rows: [], rowCount: 1 };
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        },
      };
      try {
        return await work(client as never);
      } catch (error) {
        state = snapshot;
        throw error;
      }
    },
  };

  return {
    repository: new AccountRecoveryRepository(
      database as unknown as ScopedDatabaseService,
    ),
    state: () => state,
  };
}

const input = {
  operationId: OPERATION_ID,
  tokenHash: TOKEN_HASH,
  passwordHash: "$argon2id$new",
};

describe("atomic password reset fault injection", () => {
  it("locks the operation, recovery token, and account before mutating", async () => {
    let lockQuery = "";
    const database = {
      authTransaction: async <T>(
        work: (client: { query: (sql: string) => Promise<{ rows: never[] }> }) => Promise<T>,
      ) =>
        work({
          query: async (sql: string) => {
            lockQuery = sql;
            return { rows: [] };
          },
        }),
    };
    const repository = new AccountRecoveryRepository(
      database as unknown as ScopedDatabaseService,
    );

    await expect(repository.resetPassword(input)).resolves.toBe("invalid");
    expect(lockQuery).toMatch(/join public\.users u on u\.id = o\.user_id/i);
    expect(lockQuery.replace(/\s+/g, " ")).toMatch(/for update of o, t, u/i);
  });

  it("commits all five mutations once and keeps an operation retry idempotent", async () => {
    const test = fixture();

    await expect(test.repository.resetPassword(input)).resolves.toBe("completed");
    expect(test.state()).toEqual({
      passwordHash: "$argon2id$new",
      sessionVersion: 2,
      sessionsRevoked: true,
      tokenUsed: true,
      operationStatus: "completed",
      targetSessionVersion: 2,
    });

    await expect(test.repository.resetPassword(input)).resolves.toBe("completed");
    expect(test.state().sessionVersion).toBe(2);
  });

  for (let fault = 0; fault < 5; fault += 1) {
    it(`rolls back every table when mutation ${fault + 1} fails`, async () => {
      const test = fixture({ failMutation: fault });

      await expect(test.repository.resetPassword(input)).rejects.toThrow(
        "injected mutation failure",
      );
      expect(test.state()).toEqual({
        passwordHash: "$argon2id$old",
        sessionVersion: 1,
        sessionsRevoked: false,
        tokenUsed: false,
        operationStatus: "pending",
        targetSessionVersion: null,
      });
    });
  }

  it("does not complete an operation when the password credential is missing", async () => {
    const test = fixture({ missingCredential: true });

    await expect(test.repository.resetPassword(input)).rejects.toThrow(
      "Password credential update failed",
    );
    expect(test.state().operationStatus).toBe("pending");
    expect(test.state().sessionVersion).toBe(1);
  });
});
