import { DynamicModule, Module } from "@nestjs/common";

import type { ServerEnv } from "../config/env.js";
import {
  RATE_LIMIT_CONFIG,
  RateLimitService,
} from "./rate-limit.service.js";

@Module({})
export class RateLimitModule {
  static register(env: ServerEnv): DynamicModule {
    return {
      module: RateLimitModule,
      providers: [
        { provide: RATE_LIMIT_CONFIG, useValue: { tokenPepper: env.tokenPepper } },
        RateLimitService,
      ],
      exports: [RateLimitService],
    };
  }
}
