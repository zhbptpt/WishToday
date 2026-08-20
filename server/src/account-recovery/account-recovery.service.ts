import { Inject, Injectable, Logger } from "@nestjs/common";

import { AUTH_CONFIG, type AuthConfig } from "../auth/auth.constants.js";
import { normalizeEmail } from "../auth/auth.dto.js";
import { AuthError } from "../auth/auth.error.js";
import { PasswordHasher } from "../auth/password-hasher.js";
import { TokenHasher } from "../auth/token-hasher.js";
import { MAIL_PORT, type MailPort } from "../mail/mail.port.js";
import {
  RateLimitExceededError,
  RateLimitService,
} from "../rate-limit/rate-limit.service.js";
import {
  AccountRecoveryRepository,
  type PasswordResetStatus,
} from "./account-recovery.repository.js";

const RECOVERY_TTL_MS = 60 * 60 * 1000;
const STATUS_QUERY_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);

  constructor(
    @Inject(AccountRecoveryRepository)
    private readonly repository: AccountRecoveryRepository,
    @Inject(PasswordHasher) private readonly passwordHasher: PasswordHasher,
    @Inject(TokenHasher) private readonly tokenHasher: TokenHasher,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(AUTH_CONFIG)
    private readonly config: Pick<AuthConfig, "frontendBaseUrl">,
  ) {}

  async requestRecovery(input: {
    email: string;
    ip: string;
  }): Promise<void> {
    const email = normalizeEmail(input.email);
    await this.consumeLimit(`ip:${input.ip}`, "5m", 30);
    await this.consumeLimit(`email:${email}`, "1h", 3);
    const token = this.tokenHasher.issue();
    const now = Date.now();
    const recovery = await this.repository.createRecovery({
      email,
      tokenHash: token.tokenHash,
      expiresAt: new Date(now + RECOVERY_TTL_MS),
      statusQueryExpiresAt: new Date(now + STATUS_QUERY_TTL_MS),
    });
    if (recovery) void this.deliverRecovery(recovery, token.rawToken);
  }

  async resetPassword(input: {
    operationId: string;
    token: string;
    newPassword: string;
    ip: string;
  }): Promise<void> {
    await this.consumeLimit(`password-reset:ip:${input.ip}`, "5m", 10);
    const tokenHash = this.tokenHasher.hash(input.token);
    const inspection = await this.repository.inspectPasswordReset({
      operationId: input.operationId,
      tokenHash,
    });
    if (inspection === "invalid") throw new AuthError("NOT_FOUND", 404);
    if (inspection === "completed") return;

    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    const result = await this.repository.resetPassword({
      operationId: input.operationId,
      tokenHash,
      passwordHash,
    });
    if (result !== "completed") throw new AuthError("NOT_FOUND", 404);
  }

  async getStatus(input: {
    operationId: string;
    token: string;
  }): Promise<PasswordResetStatus> {
    const status = await this.repository.getResetStatus({
      operationId: input.operationId,
      tokenHash: this.tokenHasher.hash(input.token),
    });
    if (!status) throw new AuthError("NOT_FOUND", 404);
    return status;
  }

  private async consumeLimit(
    key: string,
    window: "5m" | "1h",
    limit: number,
  ): Promise<void> {
    try {
      await this.rateLimit.consume(key, window, limit);
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        throw new AuthError("RATE_LIMITED", 429, error.retryAfter);
      }
      throw error;
    }
  }

  private async deliverRecovery(
    recovery: { email: string; operationId: string },
    rawToken: string,
  ): Promise<void> {
    const link = new URL("/auth/reset-password", this.config.frontendBaseUrl);
    link.hash = new URLSearchParams({
      token: rawToken,
      operationId: recovery.operationId,
    }).toString();
    try {
      await this.mail.sendPasswordRecovery({
        to: recovery.email,
        link: link.toString(),
      });
    } catch {
      this.logger.warn("Password recovery email delivery failed");
    }
  }
}
