import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Inject,
  Ip,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import type { Response } from "express";

import type { ApiResult } from "../common/api-result.js";
import { AuthError } from "../auth/auth.error.js";
import {
  PasswordRecoveryDto,
  PasswordResetDto,
  PasswordResetStatusDto,
} from "./account-recovery.dto.js";
import { AccountRecoveryService } from "./account-recovery.service.js";
import type { PasswordResetStatus } from "./account-recovery.repository.js";

@Controller("auth")
export class AccountRecoveryController {
  constructor(
    @Inject(AccountRecoveryService)
    private readonly recovery: AccountRecoveryService,
  ) {}

  @Post("password-recovery")
  @HttpCode(202)
  recoveryRequest(
    @Body() input: PasswordRecoveryDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResult<{ status: "ACCEPTED" }>> {
    return this.execute(response, async () => {
      await this.recovery.requestRecovery({ ...input, ip });
      return { status: "ACCEPTED" as const };
    });
  }

  @Post("password-reset")
  @HttpCode(200)
  reset(
    @Body() input: PasswordResetDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResult<{ status: "PROCESSED" }>> {
    return this.execute(response, async () => {
      await this.recovery.resetPassword({ ...input, ip });
      return { status: "PROCESSED" as const };
    });
  }

  @Post("password-reset-operations/:id/status")
  @HttpCode(200)
  status(
    @Param("id") operationId: string,
    @Body() input: PasswordResetStatusDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResult<{ status: PasswordResetStatus }>> {
    return this.execute(response, async () => ({
      status: await this.recovery.getStatus({ operationId, token: input.token }),
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
