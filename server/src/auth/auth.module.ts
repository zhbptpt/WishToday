import { DynamicModule, Module } from "@nestjs/common";

import type { ServerEnv } from "../config/env.js";
import { MailModule } from "../mail/mail.module.js";
import { RateLimitModule } from "../rate-limit/rate-limit.module.js";
import { AccessTokenIssuer } from "./access-token-issuer.js";
import { AUTH_CONFIG } from "./auth.constants.js";
import { AuthController } from "./auth.controller.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import { PasswordHasher } from "./password-hasher.js";
import { TokenHasher } from "./token-hasher.js";
import { CsrfGuard } from "../common/csrf.guard.js";
import { AuthGuard } from "../common/auth.guard.js";
import { AccessTokenVerifier } from "../sessions/access-token-verifier.js";
import { SessionController } from "../sessions/session.controller.js";
import { AccountRecoveryController } from "../account-recovery/account-recovery.controller.js";
import { AccountRecoveryRepository } from "../account-recovery/account-recovery.repository.js";
import { AccountRecoveryService } from "../account-recovery/account-recovery.service.js";

@Module({})
export class AuthModule {
  static register(env: ServerEnv): DynamicModule {
    return {
      module: AuthModule,
      imports: [MailModule.register(env), RateLimitModule.register(env)],
      controllers: [AuthController, SessionController, AccountRecoveryController],
      providers: [
        {
          provide: AUTH_CONFIG,
          useValue: {
            tokenPepper: env.tokenPepper,
            jwtPrivateKey: env.jwtPrivateKey,
            jwtPublicKey: env.jwtPublicKey,
            jwtKeyId: env.jwtKeyId,
            frontendBaseUrl: env.allowedOrigins[0],
            allowedOrigins: env.allowedOrigins,
          },
        },
        AuthRepository,
        AuthService,
        PasswordHasher,
        TokenHasher,
        AccessTokenIssuer,
        CsrfGuard,
        AuthGuard,
        AccessTokenVerifier,
        AccountRecoveryRepository,
        AccountRecoveryService,
      ],
    };
  }
}
