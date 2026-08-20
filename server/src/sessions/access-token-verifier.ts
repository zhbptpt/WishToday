import { createPublicKey } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { jwtVerify } from "jose";

import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from "../auth/access-token-issuer.js";
import { AUTH_CONFIG, type AuthConfig } from "../auth/auth.constants.js";

export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
  sessionVersion: number;
}

@Injectable()
export class AccessTokenVerifier {
  constructor(
    @Inject(AUTH_CONFIG)
    private readonly config: Pick<AuthConfig, "jwtPublicKey" | "jwtKeyId">,
  ) {}

  async verify(token: string): Promise<AccessTokenClaims> {
    const verified = await jwtVerify(token, createPublicKey(this.config.jwtPublicKey), {
      algorithms: ["RS256"],
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      requiredClaims: ["exp", "iat", "sub"],
    });
    if (verified.protectedHeader.kid !== this.config.jwtKeyId) {
      throw new Error("Access token key ID is invalid");
    }
    const { sub, session_id: sessionId, session_version: sessionVersion } =
      verified.payload;
    if (
      typeof sub !== "string" ||
      typeof sessionId !== "string" ||
      !Number.isInteger(sessionVersion) ||
      Number(sessionVersion) < 1
    ) {
      throw new Error("Access token claims are invalid");
    }
    return {
      userId: sub,
      sessionId,
      sessionVersion: Number(sessionVersion),
    };
  }
}
