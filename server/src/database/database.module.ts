import { DynamicModule, Global, Module } from "@nestjs/common";
import { Pool } from "pg";

import type { ServerEnv } from "../config/env.js";
import { DATABASE_HEALTH, DATABASE_POOL } from "./database.constants.js";
import { DatabaseService } from "./database.service.js";
import { ScopedDatabaseService } from "./scoped-database.service.js";

@Global()
@Module({})
export class DatabaseModule {
  static register(env: ServerEnv): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_POOL,
          useFactory: () => createDatabasePool(env),
        },
        DatabaseService,
        {
          provide: DATABASE_HEALTH,
          inject: [DatabaseService],
          useFactory: (database: DatabaseService) => ({
            ping: () => database.ping(),
          }),
        },
        ScopedDatabaseService,
      ],
      exports: [DATABASE_HEALTH, ScopedDatabaseService],
    };
  }
}

export function createDatabasePool(env: ServerEnv): Pool {
  const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: { ca: env.databaseCaCert, rejectUnauthorized: true },
    max: 10,
    connectionTimeoutMillis: 5_000,
    query_timeout: 750,
  });

  pool.on("error", (error) => {
    console.error("PostgreSQL idle client error", error.name);
  });
  return pool;
}
