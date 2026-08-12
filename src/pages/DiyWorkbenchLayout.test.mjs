import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DiyWorkbenchPage primary action", () => {
  it("renders the preview entry as a warm brown ink-wash action", () => {
    const page = readFileSync(
      new URL("./DiyWorkbenchPage.tsx", import.meta.url),
      "utf8",
    );
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(page).toContain("workbench-preview-action");
    expect(page).toContain("预览成品");
    expect(stylesheet).toMatch(
      /\.app-shell--leather-book \.sticky-action \.workbench-preview-action\s*\{[\s\S]*?min-width: 146px;[\s\S]*?min-height: 50px;[\s\S]*?color: #f2d694;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--leather-book \.workbench-preview-action::before\s*\{[\s\S]*?cocktail-ink-wash-wide\.png[\s\S]*?filter: none;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--leather-book \.workbench-preview-action:focus-visible\s*\{[\s\S]*?outline:/,
    );
  });
});
