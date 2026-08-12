import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("NotebookPage antique index slips", () => {
  const page = readFileSync(new URL("./NotebookPage.tsx", import.meta.url), "utf8");
  const stylesheet = readFileSync(
    new URL("../styles/global.css", import.meta.url),
    "utf8",
  );

  it("keeps every saved recipe as one linked archival index slip", () => {
    expect(page).toContain('className="recipe-card notebook-index-slip"');
    expect(page).toContain('className="notebook-index-heading"');
    expect(page).toContain('className="recipe-meta notebook-index-meta"');
    expect(page).toContain('className="tag-row notebook-index-stamps"');
    expect(page).toContain('className="tag notebook-index-stamp"');
    expect(page).toContain('className="recipe-card-arrow notebook-index-arrow"');
    expect(page).toContain('to={`/recipes/${recipe.id}`}');
    expect(page).toContain("recipe.flavorTags.slice(0, 3)");
  });

  it("uses three real torn-paper assets, stamped tags, and gently alternating placement", () => {
    expect(stylesheet).toMatch(
      /\.app-shell--notebook-book \.notebook-index-slip\s*\{[\s\S]*?background-image: url\("\/assets\/notebook\/antique-index-slip-torn-v1-reference-tone\.png"\);/,
    );
    expect(stylesheet).toContain("antique-index-slip-torn-v2-reference-tone.png");
    expect(stylesheet).toContain("antique-index-slip-torn-v3-reference-tone.png");
    expect(stylesheet).toMatch(
      /\.app-shell--notebook-book \.notebook-index-slip:nth-child\(4\)\s*\{[\s\S]*?reference-index-slip-final\.png\?preview=1/,
    );
    expect(stylesheet).not.toMatch(
      /\.app-shell--notebook-book \.notebook-index-slip\s*\{[\s\S]*?clip-path:/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--notebook-book \.notebook-index-slip:nth-child\(odd\)\s*\{[\s\S]*?transform: rotate\(-0\.55deg\)/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--notebook-book \.notebook-index-slip:nth-child\(even\)\s*\{[\s\S]*?transform: rotate\(0\.45deg\)/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--notebook-book \.notebook-index-stamp\s*\{[\s\S]*?border: 3px double[\s\S]*?border-radius: 2px/,
    );
  });

  it("keeps the slips readable and keyboard-visible on compact screens", () => {
    expect(stylesheet).toMatch(
      /\.app-shell--notebook-book \.notebook-index-slip:focus-visible\s*\{[\s\S]*?outline:/,
    );
    expect(stylesheet).toMatch(
      /@media screen and \(max-width: 620px\)[\s\S]*?\.app-shell--notebook-book \.notebook-index-slip\s*\{[\s\S]*?min-height: 108px;/,
    );
  });
});
