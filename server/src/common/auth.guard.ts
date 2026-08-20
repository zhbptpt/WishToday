import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { AuthRepository } from "../auth/auth.repository.js";
import {
  AccessTokenVerifier,
  type AccessTokenClaims,
} from "../sessions/access-token-verifier.js";

export interface AuthPrincipal extends AccessTokenClaims {
  email: string;
}

export type AuthenticatedRequest = Request & { auth: AuthPrincipal };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AccessTokenVerifier)
    private readonly verifier: AccessTokenVerifier,
    @Inject(AuthRepository) private readonly repository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const authorization = request.get("authorization");
    const token = authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
    if (!token) this.reject(response, "AUTH_REQUIRED");

    let claims: AccessTokenClaims;
    try {
      claims = await this.verifier.verify(token!);
    } catch {
      this.reject(response, "AUTH_REQUIRED");
    }

    const session = await this.repository.validateSession(claims!);
    if (session.status !== "valid") {
      this.reject(
        response,
        session.status === "revoked" ? "SESSION_REVOKED" : "AUTH_REQUIRED",
      );
    }
    request.auth = { ...claims!, email: session.email };
    return true;
  }

  private reject(
    response: Response,
    code: "AUTH_REQUIRED" | "SESSION_REVOKED",
  ): never {
    throw new HttpException(
      {
        ok: false,
        code,
        retryable: false,
        requestId: String(response.getHeader("x-request-id") ?? "unavailable"),
      },
      401,
    );
  }
}
