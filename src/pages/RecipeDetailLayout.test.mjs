import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("RecipeDetailPage notebook return action", () => {
  it("renders the confirmed warm ink-wash treatment at the chosen size", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--recipe-detail-book\s+\.recipe-manuscript-navigation\s+\.recipe-notebook-return-action\s*\{[\s\S]*?width: 146px;[\s\S]*?min-width: 146px;[\s\S]*?min-height: 50px;[\s\S]*?color: #f2d694;[\s\S]*?white-space: nowrap;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--recipe-detail-book\s+\.recipe-manuscript-navigation\s+\.recipe-notebook-return-action::before\s*\{[\s\S]*?background-image: url\("\/assets\/ink-wash\/cocktail-ink-wash-wide\.png"\);[\s\S]*?filter: none;[\s\S]*?opacity: 0\.94;/,
    );
  });

  it("keeps mouse and keyboard interaction states visible", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--recipe-detail-book\s+\.recipe-manuscript-navigation\s+\.recipe-notebook-return-action:hover/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--recipe-detail-book\s+\.recipe-manuscript-navigation\s+\.recipe-notebook-return-action:focus-visible/,
    );
  });
});
