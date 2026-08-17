import { Transform } from "class-transformer";
import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from "class-validator";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeEmail(value) : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class LoginDto extends RegisterDto {}

export class ResendVerificationDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeEmail(value) : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class VerifyEmailDto {
  @IsString()
  @Length(43, 128)
  token!: string;
}
