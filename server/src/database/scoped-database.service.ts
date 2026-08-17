import { Inject, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";

import { DatabaseService } from "./database.service.js";

@Injectable()
export class ScopedDatabaseService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async authTransaction<T>(
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    return this.database.transaction(async (client) => {
      await client.query("SET LOCAL ROLE wishtoday_auth_repository");
      return work(client);
    });
  }
}
