import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";

import {
  DATABASE_HEALTH,
  type DatabaseHealth,
} from "../database/database.constants.js";

@Controller()
export class HealthController {
  constructor(
    @Inject(DATABASE_HEALTH) private readonly database: DatabaseHealth,
  ) {}

  @Get("healthz")
  async check(): Promise<{ status: "ok" }> {
    try {
      await this.database.ping();
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException({ status: "unavailable" });
    }
  }
}
