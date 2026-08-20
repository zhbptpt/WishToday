import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import type { ApiResult } from "../common/api-result.js";
import {
  AuthGuard,
  type AuthenticatedRequest,
} from "../common/auth.guard.js";

@Controller("auth")
export class SessionController {
  @Get("me")
  @UseGuards(AuthGuard)
  me(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): ApiResult<{ id: string; email: string }> {
    return {
      ok: true,
      data: { id: request.auth.userId, email: request.auth.email },
      requestId: String(response.getHeader("x-request-id") ?? "unavailable"),
    };
  }
}
