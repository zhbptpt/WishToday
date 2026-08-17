import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { AUTH_CONFIG, type AuthConfig } from "./auth.constants.js";

type TokenHasherConfig = Pick<AuthConfig, "tokenPepper">;

@Injectable()
export class TokenHasher {
  constructor(@Inject(AUTH_CONFIG) private readonly config: TokenHasherConfig) {}

  issue(): { rawToken: string; tokenHash: Buffer } {
    const rawToken = randomBytes(32).toString("base64url");
    return { rawToken, tokenHash: this.hash(rawToken) };
  }

  hash(rawToken: string): Buffer {
    return createHmac("sha256", this.config.tokenPepper)
      .update(rawToken, "utf8")
      .digest();
  }

  equals(left: Buffer, right: Buffer): boolean {
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
