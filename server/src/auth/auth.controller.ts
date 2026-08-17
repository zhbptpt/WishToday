import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  Ip,
  Inject,
  Post,
  Res,
  ValidationPipe,
} from "@nestjs/common";
import type { Type } from "@nestjs/common";
import type { Response } from "express";

import type { ApiResult } from "../common/api-result.js";
import {
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  VerifyEmailDto,
} from "./auth.dto.js";
import { AuthError } from "./auth.error.js";
import { AuthService } from "./auth.service.js";

type AcceptedResult = ApiResult<{ status: "ACCEPTED" | "PROCESSED" }>;

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
  ): Promise<ApiResult<{ accessToken: string; expiresIn: number; tokenType: "Bearer" }>> {
    return this.execute(response, async () => ({
      ...(await this.auth.login({
        ...input,
        ip,
        deviceSummary: userAgent,
      })),
      tokenType: "Bearer" as const,
    }));
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
