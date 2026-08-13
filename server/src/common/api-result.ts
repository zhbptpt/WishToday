export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "EMAIL_UNVERIFIED"
  | "INVALID_CREDENTIALS"
  | "SESSION_REVOKED"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NETWORK_TIMEOUT"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type ApiResult<T> =
  | { ok: true; data: T; requestId: string }
  | {
      ok: false;
      code: ApiErrorCode;
      retryable: boolean;
      requestId: string;
      retryAfter?: number;
    };
