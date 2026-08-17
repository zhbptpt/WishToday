import type { ApiErrorCode } from "../common/api-result.js";

export class AuthError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    readonly retryAfter?: number,
  ) {
    super(code);
  }
}
