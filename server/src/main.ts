import "reflect-metadata";

import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface.js";

import { AppModule } from "./app.module.js";
import { getServerEnv } from "./config/env.js";

export async function bootstrap(): Promise<void> {
  const env = getServerEnv();
  const app = await NestFactory.create(AppModule.register(env), {
    bodyParser: false,
  });

  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  const corsOptions: CorsOptions = {
    credentials: true,
    origin(origin, callback) {
      if (!origin || env.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed"), false);
    },
  };
  app.enableCors(corsOptions);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix("api/v1", {
    exclude: [{ path: "healthz", method: RequestMethod.GET }],
  });
  app.enableShutdownHooks();

  await app.listen(env.port, "0.0.0.0");
}

if (process.env.NODE_ENV !== "test") {
  void bootstrap();
}
