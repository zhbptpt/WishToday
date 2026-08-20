import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  Ip,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import type { Type } from "@nestjs/common";
import type { Request, Response } from "express";

import type { ApiResult } from "../common/api-result.js";
import { CsrfGuard } from "../common/csrf.guard.js";
import {
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "../sessions/session.constants.js";
import {
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  VerifyEmailDto,
} from "./auth.dto.js";
import { AuthError } from "./auth.error.js";
import { AuthService } from "./auth.service.js";

type AcceptedResult = ApiResult<{ status: "ACCEPTED" | "PROCESSED" }>;
const SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function setSessionCookies(
  response: Response,
  refreshToken: string,
  csrfToken: string,
): void {
  const shared = {
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
    secure: true,
    sameSite: "lax" as const,
  };
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...shared,
    httpOnly: true,
  });
  response.cookie(CSRF_COOKIE_NAME, csrfToken, shared);
}

function clearSessionCookies(response: Response): void {
  const shared = {
    path: "/",
    maxAge: 0,
    secure: true,
    sameSite: "lax" as const,
  };
  response.cookie(REFRESH_COOKIE_NAME, "", { ...shared, httpOnly: true });
  response.cookie(CSRF_COOKIE_NAME, "", shared);
}

function dtoPipe(type: Type): ValidationPipe {
  return new ValidationPipe({
    expectedType: type,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  @HttpCode(202)
  async register(
    @Body(dtoPipe(RegisterDto)) input: RegisterDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AcceptedResult> {
    return this.execute(response, async () => {
      await this.auth.register({ ...input, ip });
      return { status: "ACCEPTED" as const };
    });
  }

  @Post("verify-email")
  @HttpCode(200)
  async verifyEmail(
    @Body(dtoPipe(VerifyEmailDto)) input: VerifyEmailDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AcceptedResult> {
    return this.execute(response, async () => {
      await this.auth.verifyEmail({ token: input.token, ip });
      return { status: "PROCESSED" as const };
    });
  }

  @Post("resend-verification")
  @HttpCode(202)
  async resendVerification(
    @Body(dtoPipe(ResendVerificationDto)) input: ResendVerificationDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AcceptedResult> {
    return this.execute(response, async () => {
      await this.auth.resendVerification({ email: input.email, ip });
      return { status: "ACCEPTED" as const };
    });
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body(dtoPipe(LoginDto)) input: LoginDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResult<{
    accessToken: string;
    expiresIn: number;
    tokenType: "Bearer";
    csrfToken: string;
  }>> {
    return this.execute(response, async () => {
      const session = await this.auth.login({
        ...input,
        ip,
        deviceSummary: userAgent,
      });
      setSessionCookies(response, session.refreshToken, session.csrfToken);
      return {
        accessToken: session.accessToken,
        expiresIn: session.expiresIn,
        tokenType: "Bearer" as const,
        csrfToken: session.csrfToken,
      };
    });
  }

  @Post("refresh")
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResult<{
    accessToken: string;
    expiresIn: number;
    tokenType: "Bearer";
    csrfToken: string;
  }>> {
    return this.execute(response, async () => {
      const session = await this.auth.refresh({
        refreshToken: request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
      });
      setSessionCookies(response, session.refreshToken, session.csrfToken);
      return {
        accessToken: session.accessToken,
        expiresIn: session.expiresIn,
        tokenType: "Bearer" as const,
        csrfToken: session.csrfToken,
      };
    });
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AcceptedResult> {
    return this.execute(response, async () => {
      await this.auth.logout({
        refreshToken: request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
      });
      clearSessionCookies(response);
      return { status: "PROCESSED" as const };
    });
  }

  private async execute<T>(
    response: Response,
    work: () => Promise<T>,
  ): Promise<ApiResult<T>> {
    const requestId = String(response.getHeader("x-request-id") ?? "unavailable");
    try {
      return { ok: true, data: await work(), requestId };
    } catch (error) {
      if (error instanceof AuthError) {
        throw new HttpException(
          {
            ok: false,
            code: error.code,
            retryable: error.code === "RATE_LIMITED",
            requestId,
            ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}),
          },
          error.status,
        );
      }
      throw error;
    }
  }
}
