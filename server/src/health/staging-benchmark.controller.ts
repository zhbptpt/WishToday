import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { Controller, Get, NotFoundException } from "@nestjs/common";

const execFileAsync = promisify(execFile);
let benchmarkResult: Promise<unknown> | undefined;

@Controller("__task1/argon2-a5c8f2d1")
export class StagingBenchmarkController {
  @Get()
  async read(): Promise<unknown> {
    if (
      process.env.RENDER !== "true" ||
      process.env.RENDER_SERVICE_NAME !== "wishtoday-api-staging" ||
      process.env.WISHTODAY_DEPLOYMENT_ENV !== "staging"
    ) {
      throw new NotFoundException();
    }

    benchmarkResult ??= execFileAsync(
      "npm",
      ["run", "benchmark:argon2", "--silent"],
      { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 120_000 },
    ).then(({ stdout }) => JSON.parse(stdout));

    return benchmarkResult;
  }
}
