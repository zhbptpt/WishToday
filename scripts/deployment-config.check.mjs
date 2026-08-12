import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const mainEntry = readFileSync("src/main.tsx", "utf8");
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

test("Pages build uses the repository base path and SPA fallback", () => {
  assert.equal(
    packageJson.scripts["build:pages"],
    "npm run build -- --base=/WishToday/ && node scripts/prepare-spa-fallback.mjs",
  );
  assert.match(mainEntry, /basename=\{import\.meta\.env\.BASE_URL\}/);
});

test("GitHub Pages workflow builds and deploys the artifact", () => {
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /npm run build:pages/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /group:\s*"pages"/);
});
