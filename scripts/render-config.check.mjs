import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const blueprint = await readFile(new URL("../render.yaml", import.meta.url), "utf8");

test("Render staging service uses the approved runtime and health path", () => {
  assert.match(blueprint, /name:\s*wishtoday-api-staging/);
  assert.match(blueprint, /region:\s*singapore/);
  assert.match(blueprint, /plan:\s*starter/);
  assert.match(blueprint, /rootDir:\s*server/);
  assert.match(blueprint, /healthCheckPath:\s*\/healthz/);
  assert.match(blueprint, /buildCommand:\s*npm ci --include=dev && npm run build/);
  assert.match(blueprint, /key:\s*NODE_VERSION\s*\r?\n\s*value:\s*["']?22\.23\.2/);
});

test("Render blueprint marks the staging environment for probe attestation", () => {
  assert.match(blueprint, /key:\s*WISHTODAY_DEPLOYMENT_ENV\s*\r?\n\s*value:\s*staging/);
  assert.match(blueprint, /key:\s*WISHTODAY_DEPLOYMENT_REGION\s*\r?\n\s*value:\s*singapore/);
  assert.match(blueprint, /key:\s*WISHTODAY_DEPLOYMENT_PLAN\s*\r?\n\s*value:\s*starter/);
});

test("Render blueprint declares secrets without storing their values", () => {
  for (const name of [
    "DATABASE_URL",
    "DATABASE_CA_CERT_BASE64",
    "JWT_PRIVATE_KEY_BASE64",
    "JWT_PUBLIC_KEY_BASE64",
    "JWT_KEY_ID",
    "TOKEN_PEPPER",
    "ALLOWED_ORIGINS",
    "RESEND_API_KEY",
  ]) {
    assert.match(
      blueprint,
      new RegExp(`key:\\s*${name}\\s*\\r?\\n\\s*sync:\\s*false`),
      `${name} must be configured outside Git`,
    );
  }
});
