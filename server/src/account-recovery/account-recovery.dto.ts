import { Transform } from "class-transformer";
import {
  IsEmail,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
} from "class-validator";

import { normalizeEmail } from "../auth/auth.dto.js";

export class PasswordRecoveryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeEmail(value) : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class PasswordResetDto {
  @IsUUID()
  operationId!: string;

  @IsString()
  @Length(43, 128)
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}

export class PasswordResetStatusDto {
  @IsString()
  @Length(43, 128)
  token!: string;
}
