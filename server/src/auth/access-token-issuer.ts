import { createPrivateKey } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { SignJWT } from "jose";

import { AUTH_CONFIG, type AuthConfig } from "./auth.constants.js";

export const ACCESS_TOKEN_ISSUER = "wishtoday-api";
export const ACCESS_TOKEN_AUDIENCE = "wishtoday-web";
const ACCESS_TOKEN_TTL_SECONDS = 10 * 60;

type AccessTokenConfig = Pick<AuthConfig, "jwtPrivateKey" | "jwtKeyId">;

@Injectable()
export class AccessTokenIssuer {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AccessTokenConfig) {}

  async issue(input: {
    userId: string;
    sessionId: string;
    sessionVersion: number;
  }): Promise<{ accessToken: string; expiresIn: number }> {
    const accessToken = await new SignJWT({
      session_id: input.sessionId,
      session_version: input.sessionVersion,
    })
      .setProtectedHeader({ alg: "RS256", kid: this.config.jwtKeyId })
      .setSubject(input.userId)
      .setIssuer(ACCESS_TOKEN_ISSUER)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(createPrivateKey(this.config.jwtPrivateKey));

    return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }
}
