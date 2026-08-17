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

@Module({})
export class AuthModule {
  static register(env: ServerEnv): DynamicModule {
    return {
      module: AuthModule,
      imports: [MailModule.register(env), RateLimitModule.register(env)],
      controllers: [AuthController],
      providers: [
        {
          provide: AUTH_CONFIG,
          useValue: {
            tokenPepper: env.tokenPepper,
            jwtPrivateKey: env.jwtPrivateKey,
            jwtKeyId: env.jwtKeyId,
            frontendBaseUrl: env.allowedOrigins[0],
          },
        },
        AuthRepository,
        AuthService,
        PasswordHasher,
        TokenHasher,
        AccessTokenIssuer,
      ],
    };
  }
}
