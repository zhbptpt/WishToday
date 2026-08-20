import { timingSafeEqual } from "node:crypto";

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { AUTH_CONFIG, type AuthConfig } from "../auth/auth.constants.js";
import { CSRF_COOKIE_NAME } from "../sessions/session.constants.js";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    @Inject(AUTH_CONFIG)
    private readonly config: Pick<AuthConfig, "allowedOrigins">,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const origin = request.get("origin");
    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    const headerToken = request.get("x-csrf-token");

    if (
      !origin ||
      !this.config.allowedOrigins.includes(origin) ||
      !cookieToken ||
      !headerToken ||
      !this.tokensEqual(cookieToken, headerToken)
    ) {
      const requestId = String(
        response.getHeader("x-request-id") ?? "unavailable",
      );
      throw new HttpException(
        {
          ok: false,
          code: "AUTH_REQUIRED",
          retryable: false,
          requestId,
        },
        403,
      );
    }
    return true;
  }

  private tokensEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, "utf8");
    const rightBuffer = Buffer.from(right, "utf8");
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}
