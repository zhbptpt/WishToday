import { DynamicModule, Module } from "@nestjs/common";

import type { ServerEnv } from "../config/env.js";
import { MAIL_PORT } from "./mail.port.js";
import {
  DisabledMailAdapter,
  ResendMailAdapter,
} from "./resend-mail.adapter.js";

@Module({})
export class MailModule {
  static register(env: ServerEnv): DynamicModule {
    return {
      module: MailModule,
      providers: [
        {
          provide: MAIL_PORT,
          useFactory: () =>
            env.resendApiKey
              ? new ResendMailAdapter(env.resendApiKey)
              : new DisabledMailAdapter(),
        },
      ],
      exports: [MAIL_PORT],
    };
  }
}
