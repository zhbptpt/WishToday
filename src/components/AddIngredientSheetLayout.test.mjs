import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AddIngredientSheet layout", () => {
  const stylesheet = readFileSync(
    new URL("../styles/global.css", import.meta.url),
    "utf8",
  );
  const componentSource = readFileSync(
    new URL("./AddIngredientSheet.tsx", import.meta.url),
    "utf8",
  );

  it("uses a centered 88dvh archive drawer with an independently scrolling list", () => {
    expect(stylesheet).toMatch(
      /\.ingredient-index-sheet\s*\{[^}]*width:\s*min\(100%,\s*620px\)[^}]*height:\s*88dvh[^}]*overflow:\s*hidden/s,
    );
    expect(stylesheet).toMatch(
      /\.ingredient-index-list\s*\{[^}]*overflow-y:\s*auto/s,
    );
  });

  it("keeps material actions touchable and removes the filled text-button treatment", () => {
    expect(stylesheet).toMatch(
      /\.ingredient-index-sheet \.ingredient-add-button\s*\{[^}]*width:\s*42px[^}]*height:\s*42px/s,
    );
    expect(stylesheet).toMatch(
      /\.ingredient-index-tab\.active\s*\{[^}]*border-bottom-color:/s,
    );
  });

  it("shows every category in a five-by-two mobile index without horizontal scrolling", () => {
    expect(stylesheet).toMatch(
      /@media screen and \(max-width: 620px\)[\s\S]*?\.category-scroll\.ingredient-index-tabs\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)[^}]*overflow-x:\s*visible/s,
    );
    expect(stylesheet).toMatch(
      /@media screen and \(max-width: 620px\)[\s\S]*?\.ingredient-index-tab\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*padding-inline:\s*4px/s,
    );
  });

  it("keeps the desktop category row compact enough for the 620px drawer", () => {
    expect(stylesheet).toMatch(
      /\.ingredient-index-tab\s*\{[^}]*flex:\s*0 0 auto[^}]*padding:\s*0 13px/s,
    );
  });

  it("uses an underline focus treatment instead of a rectangular browser outline", () => {
    expect(stylesheet).toMatch(
      /\.ingredient-index-tab:focus-visible\s*\{[^}]*outline:\s*none[^}]*box-shadow:\s*inset 0 -2px/s,
    );
  });

  it("portals the fixed drawer outside the transformed book page", () => {
    expect(componentSource).toContain('import { createPortal } from "react-dom";');
    expect(componentSource).toMatch(/createPortal\(sheet, document\.body\)/);
  });

  it("disables drawer motion when reduced motion is requested", () => {
    expect(stylesheet).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.ingredient-sheet-backdrop,[\s\S]*?\.ingredient-index-sheet\s*\{[^}]*animation:\s*none/s,
    );
  });
});
