import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("page background artwork", () => {
  const stylesheet = readFileSync(
    new URL("./global.css", import.meta.url),
    "utf8",
  );

  it.each([
    [
      "app-shell--home-book",
      "/assets/page-backgrounds/home-alchemy-grimoire-golden-v4.png",
    ],
    [
      "app-shell--cocktail-detail-book",
      "/assets/page-backgrounds/cocktail-detail-alchemy-grimoire-golden-v4.png",
    ],
    [
      "app-shell--leather-book",
      "/assets/page-backgrounds/diy-alchemy-workbench-grimoire-golden-v4.png",
    ],
    [
      "app-shell--preview-book",
      "/assets/page-backgrounds/preview-final-grimoire-golden-v4.png",
    ],
    [
      "app-shell--recipe-detail-book",
      "/assets/page-backgrounds/private-recipe-grimoire-golden-v4.png",
    ],
    [
      "app-shell--notebook-book",
      "/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png",
    ],
  ])("maps .%s to its dedicated manuscript", (className, assetPath) => {
    expect(stylesheet).toMatch(
      new RegExp(
        `\\.${className}\\s*\\{[^}]*background-image:\\s*url\\(["']${assetPath}["']\\)`,
        "s",
      ),
    );
  });

  it("uses the herbarium manuscript inside the add-ingredient drawer", () => {
    expect(stylesheet).toMatch(
      /\.ingredient-index-sheet\s*\{[^}]*background-image:\s*url\(["']\/assets\/page-backgrounds\/ingredient-herbarium-grimoire-golden-v4\.png["']\)/s,
    );
  });

  it("lets the private notebook manuscript grow with long recipe lists", () => {
    const notebookRule = stylesheet.match(
      /\.app-shell--notebook-book\s*\{([^}]*)\}/s,
    );

    expect(notebookRule?.[1]).toBeDefined();
    expect(notebookRule?.[1]).not.toContain("aspect-ratio");
  });
});
