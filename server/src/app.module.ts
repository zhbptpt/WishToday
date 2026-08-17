import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common";

import { RequestIdMiddleware } from "./common/request-id.middleware.js";
import type { ServerEnv } from "./config/env.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";

@Module({})
export class AppModule implements NestModule {
  static register(env: ServerEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [DatabaseModule.register(env)],
      controllers: [HealthController],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
