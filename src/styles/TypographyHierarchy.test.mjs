import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("./global.css", import.meta.url), "utf8");

describe("manuscript typography hierarchy", () => {
  it("defines the approved semantic weights and permits weight synthesis", () => {
    expect(stylesheet).toMatch(/--wt-font-weight-body:\s*500;/);
    expect(stylesheet).toMatch(/--wt-font-weight-heading:\s*600;/);
    expect(stylesheet).toMatch(/--wt-font-weight-numeric:\s*600;/);
    expect(stylesheet).toMatch(/--wt-font-weight-action:\s*700;/);
    expect(stylesheet).toMatch(/--wt-font-weight-brand:\s*800;/);
    expect(stylesheet).toMatch(/font-synthesis:\s*weight;/);
  });

  it("maps all seven manuscript surfaces to the readable body weight", () => {
    for (const selector of [
      ".app-shell--home-book",
      ".app-shell--cocktail-detail-book",
      ".app-shell--leather-book",
      ".ingredient-index-sheet",
      ".app-shell--preview-book",
      ".app-shell--recipe-detail-book",
      ".app-shell--notebook-book",
    ]) {
      expect(stylesheet).toContain(selector);
    }
    expect(stylesheet).toMatch(
      /Manuscript typography hierarchy[\s\S]*?font-weight:\s*var\(--wt-font-weight-body\);/,
    );
  });

  it("maps headings, values, actions, and brand marks to their semantic weights", () => {
    expect(stylesheet).toMatch(
      /Manuscript typography hierarchy[\s\S]*?h1,[\s\S]*?h2[\s\S]*?font-weight:\s*var\(--wt-font-weight-heading\);/,
    );
    expect(stylesheet).toMatch(
      /Manuscript typography hierarchy[\s\S]*?\.detail-list-index[\s\S]*?\.line-item strong[\s\S]*?\.recipe-ledger-index[\s\S]*?font-weight:\s*var\(--wt-font-weight-numeric\);/,
    );
    expect(stylesheet).toMatch(
      /Manuscript typography hierarchy[\s\S]*?\.primary-button[\s\S]*?\.ingredient-index-tab\.active[\s\S]*?font-weight:\s*var\(--wt-font-weight-action\);/,
    );
    expect(stylesheet).toMatch(
      /Manuscript typography hierarchy[\s\S]*?\.brand-mark[\s\S]*?font-weight:\s*var\(--wt-font-weight-brand\);/,
    );
  });
});
