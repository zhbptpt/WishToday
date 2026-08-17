import { Injectable } from "@nestjs/common";
import { argon2id, hash, verify } from "argon2";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$tK6oF1hBWH4SrlPbHXwtfg$Na+VUfsCHorWYOnzorsFyJ9zN//KflUR9dB4IQfv1d4";

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    return hash(password, {
      type: argon2id,
      memoryCost: 64 * 1024,
      timeCost: 3,
      parallelism: 1,
      hashLength: 32,
    });
  }

  async verify(encoded: string, password: string): Promise<boolean> {
    try {
      return await verify(encoded, password);
    } catch {
      return false;
    }
  }

  async verifyDummy(password: string): Promise<boolean> {
    return this.verify(DUMMY_PASSWORD_HASH, password);
  }
}
