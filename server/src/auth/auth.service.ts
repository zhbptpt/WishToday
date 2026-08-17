import { Inject, Injectable, Logger } from "@nestjs/common";

import { MAIL_PORT, type MailPort } from "../mail/mail.port.js";
import {
  RateLimitExceededError,
  RateLimitService,
} from "../rate-limit/rate-limit.service.js";
import { AccessTokenIssuer } from "./access-token-issuer.js";
import { AUTH_CONFIG, type AuthConfig } from "./auth.constants.js";
import { normalizeEmail } from "./auth.dto.js";
import { AuthError } from "./auth.error.js";
import { AuthRepository } from "./auth.repository.js";
import { PasswordHasher } from "./password-hasher.js";
import { TokenHasher } from "./token-hasher.js";

const VERIFICATION_TTL_MS = 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AuthRepository) private readonly repository: AuthRepository,
    @Inject(PasswordHasher) private readonly passwordHasher: PasswordHasher,
    @Inject(TokenHasher) private readonly tokenHasher: TokenHasher,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(AccessTokenIssuer)
    private readonly accessTokenIssuer: AccessTokenIssuer,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  async register(input: {
    email: string;
    password: string;
    ip: string;
  }): Promise<void> {
    const email = normalizeEmail(input.email);
    await this.consumeRegistrationLimits(input.ip, email);

    const passwordHash = await this.passwordHasher.hash(input.password);
    const token = this.tokenHasher.issue();
    const created = await this.repository.createRegistration({
      email,
      passwordHash,
      verificationTokenHash: token.tokenHash,
      verificationExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    });

    if (created === "created") {
      void this.deliverVerification(email, token.rawToken);
    }
  }

  async verifyEmail(input: { token: string; ip: string }): Promise<void> {
    await this.consumeLimit(`ip:${input.ip}`, "5m", 30);
    await this.repository.consumeVerificationToken(
      this.tokenHasher.hash(input.token),
    );
  }

  async resendVerification(input: { email: string; ip: string }): Promise<void> {
    const email = normalizeEmail(input.email);
    await this.consumeRegistrationLimits(input.ip, email);

    const token = this.tokenHasher.issue();
    const recipient = await this.repository.replaceVerificationToken({
      email,
      tokenHash: token.tokenHash,
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    });
    if (recipient) void this.deliverVerification(recipient, token.rawToken);
  }

  async login(input: {
    email: string;
    password: string;
    ip: string;
    deviceSummary?: string;
  }): Promise<{ accessToken: string; expiresIn: number }> {
    await this.consumeLimit(`ip:${input.ip}`, "5m", 30);
    const account = await this.repository.findLoginAccount(
      normalizeEmail(input.email),
    );

    if (!account) {
      await this.passwordHasher.verifyDummy(input.password);
      throw new AuthError("INVALID_CREDENTIALS", 401);
    }

    const passwordMatches = await this.passwordHasher.verify(
      account.passwordHash,
      input.password,
    );
    if (!passwordMatches || account.status !== "active") {
      throw new AuthError("INVALID_CREDENTIALS", 401);
    }
    if (!account.emailVerifiedAt) {
      throw new AuthError("EMAIL_UNVERIFIED", 403);
    }

    const session = await this.repository.createSession({
      userId: account.userId,
      sessionVersion: account.sessionVersion,
      deviceSummary: input.deviceSummary?.slice(0, 256),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    if (!session) throw new AuthError("INVALID_CREDENTIALS", 401);

    return this.accessTokenIssuer.issue({
      userId: account.userId,
      sessionId: session.id,
      sessionVersion: account.sessionVersion,
    });
  }

  private async consumeRegistrationLimits(ip: string, email: string): Promise<void> {
    await this.consumeLimit(`ip:${ip}`, "5m", 30);
    await this.consumeLimit(`email:${email}`, "1h", 3);
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

  private async deliverVerification(email: string, rawToken: string): Promise<void> {
    const link = new URL("/auth/callback", this.config.frontendBaseUrl);
    link.hash = new URLSearchParams({
      token: rawToken,
      type: "email-verification",
    }).toString();

    try {
      await this.mail.sendVerification({ to: email, link: link.toString() });
    } catch {
      this.logger.warn("Verification email delivery failed");
    }
  }
}
