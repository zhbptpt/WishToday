import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared ink-wash visual language", () => {
  const stylesheet = readFileSync(
    new URL("../styles/global.css", import.meta.url),
    "utf8",
  );

  it("uses approved raster ink textures on every remaining page surface", () => {
    const selectors = [
      ".app-shell--home-book .home-hero-frame::before",
      ".app-shell--leather-book .workbench-intro-panel::before",
      ".ingredient-sheet-header::before",
      ".app-shell--preview-book .preview-final-chapter::before",
      ".recipe-manuscript-hero::before",
    ];

    for (const selector of selectors) {
      expect(stylesheet).toContain(selector);
    }

    expect(stylesheet).toContain(
      'url("/assets/ink-wash/cocktail-ink-wash-wide.png")',
    );
    expect(stylesheet).toContain(
      'url("/assets/ink-wash/cocktail-ink-wash-tall.png")',
    );
    expect(stylesheet).toContain(
      'url("/assets/ink-wash/cocktail-ink-wash-heading.png")',
    );
  });

  it("keeps shared stains non-interactive and content above the decorative layer", () => {
    expect(stylesheet).toMatch(
      /Shared ink-wash language[\s\S]*?pointer-events:\s*none;/,
    );
    expect(stylesheet).toMatch(
      /Shared ink-wash language[\s\S]*?> \*\s*\{[\s\S]*?z-index:\s*1;/,
    );
  });

  it("uses dark manuscript ink for ingredient copy on the light parchment list", () => {
    expect(stylesheet).toMatch(
      /Ingredient archive contrast[\s\S]*?\.ingredient-index-name-row strong[\s\S]*?color:\s*#3a1d10;/,
    );
    expect(stylesheet).toMatch(
      /Ingredient archive contrast[\s\S]*?\.sheet-row\.ingredient-index-row p[\s\S]*?color:\s*#52301d;/,
    );
    expect(stylesheet).toMatch(
      /\.ingredient-index-row\.is-added[\s\S]*?opacity:\s*1;/,
    );
  });

  it("keeps preview manuscript text dark enough for the pale parchment", () => {
    expect(stylesheet).toMatch(
      /Preview parchment contrast[\s\S]*?\.preview-heading-title[\s\S]*?color:\s*#3a1d10;/,
    );
    expect(stylesheet).toMatch(
      /Preview parchment contrast[\s\S]*?\.preview-ledger-section[\s\S]*?color:\s*#4b2918;/,
    );
    expect(stylesheet).toMatch(
      /Preview parchment contrast[\s\S]*?\.preview-flavor-note p[\s\S]*?color:\s*#52301d;/,
    );
  });

  it("uses dark archival ink across the private recipe manuscript", () => {
    expect(stylesheet).toMatch(
      /Private recipe contrast[\s\S]*?\.recipe-manuscript-title[\s\S]*?color:\s*#32170d;/,
    );
    expect(stylesheet).toMatch(
      /Private recipe contrast[\s\S]*?\.recipe-ledger-section[\s\S]*?color:\s*#4b2918;/,
    );
    expect(stylesheet).toMatch(
      /Private recipe contrast[\s\S]*?\.recipe-notes p[\s\S]*?color:\s*#52301d;/,
    );
  });

  it("uses dark ink for static copy on the home and DIY parchment", () => {
    expect(stylesheet).toMatch(
      /Home and DIY parchment contrast[\s\S]*?\.home-section-title-row h2[\s\S]*?color:\s*#3a1d10;/,
    );
    expect(stylesheet).toMatch(
      /Home and DIY parchment contrast[\s\S]*?\.workbench-heading-label[\s\S]*?color:\s*#3a1d10;/,
    );
    expect(stylesheet).toMatch(
      /Home and DIY parchment contrast[\s\S]*?\.ingredient-row-head strong[\s\S]*?color:\s*#482616;/,
    );
  });

  it("keeps the home hero and recommendation heading free of frame traces", () => {
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-hero-frame\s*\{[^}]*?border:\s*0;[^}]*?box-shadow:\s*none;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-section-title-row\s*\{[^}]*?border-bottom:\s*0;/,
    );
  });

  it("varies the ink composition while keeping the recommendation card free of a dark stain", () => {
    expect(stylesheet).not.toContain(
      ".app-shell--home-book .home-feature-card .cocktail-card-content::before",
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-feature-card \.card-sheen\s*\{[^}]*?background:\s*none;[^}]*?opacity:\s*0;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--leather-book \.workbench-ingredients-panel::before[\s\S]*?background-image:[\s\S]*?tall\.png/,
    );
    expect(stylesheet).toMatch(
      /\.ingredient-index-row:nth-child\(even\) \.ingredient-index-copy::before[\s\S]*?transform:/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--preview-book \.preview-ledger-section:nth-child\(2\)::before[\s\S]*?transform:/,
    );
    expect(stylesheet).toMatch(
      /\.recipe-ledger-section:nth-child\(2\)::before[\s\S]*?transform:/,
    );
  });
});
