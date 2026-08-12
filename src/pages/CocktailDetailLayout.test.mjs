import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CocktailDetailPage mobile layout", () => {
  it("uses a dedicated two-column manuscript instead of stacked panels", () => {
    const page = readFileSync(
      new URL("./CocktailDetailPage.tsx", import.meta.url),
      "utf8",
    );
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(page).toContain('className="detail-ledger-grid"');
    expect(page).toContain(
      'className="detail-ledger-column detail-ledger-column--left"',
    );
    expect(page).toContain(
      'className="detail-ledger-column detail-ledger-column--right"',
    );
    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-ledger-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--cocktail-detail-book \.detail-ledger-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
  });

  it("lets all four edges of the hero photograph dissolve into the leather page", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-hero--manuscript > img\s*\{[\s\S]*?-webkit-mask-image:\s*linear-gradient\([\s\S]*?\),\s*linear-gradient\(/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-hero--manuscript > img\s*\{[\s\S]*?mask-image:\s*linear-gradient\([\s\S]*?\),\s*linear-gradient\(/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-hero--manuscript > img\s*\{[\s\S]*?-webkit-mask-composite: source-in;[\s\S]*?mask-composite: intersect;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-hero--manuscript::after\s*\{[\s\S]*?border-bottom: 0;/,
    );
  });

  it("keeps the difficulty badge in the top-right of the steps heading", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.steps-panel \.panel-title-row\s*\{[\s\S]*?align-items: center;[\s\S]*?flex-direction: row;/,
    );
    expect(stylesheet).toMatch(
      /\.difficulty-badge\s*\{[\s\S]*?white-space: nowrap;/,
    );
  });

  it("keeps manuscript body copy readable on narrow screens", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );
    const mobileManuscriptStyles = stylesheet.slice(
      stylesheet.lastIndexOf("@media (max-width: 620px)"),
    );

    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-hero-description\s*\{[\s\S]*?font-size: 0\.75rem;/,
    );
    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-hero-copy\s*\{[\s\S]*?height: 168px;[\s\S]*?align-content: space-between;/,
    );
    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.flavor-story p\s*\{[\s\S]*?font-size: 0\.74rem;/,
    );
    expect(mobileManuscriptStyles).not.toContain("margin-top: -20px");
    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.line-item span:not\(\.detail-list-index\),[\s\S]*?font-size: 0\.7rem;/,
    );
    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.step-list,[\s\S]*?font-size: 0\.7rem;/,
    );
    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.steps-panel \.panel-title-row h2::after\s*\{[\s\S]*?display: none;/,
    );
    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-ledger-column\s*\{[\s\S]*?gap: 28px;/,
    );
    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-ledger-column--right\s*\{[\s\S]*?gap: 40px;/,
    );
    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.flavor-radar\s*\{[\s\S]*?aspect-ratio: 1;[\s\S]*?height: auto;/,
    );
    expect(mobileManuscriptStyles).toMatch(
      /\.app-shell--cocktail-detail-book \.flavor-radar \.recharts-polar-angle-axis-tick-value\s*\{[\s\S]*?font-size: 0\.74rem;/,
    );
  });

  it("uses real irregular ink-wash assets as non-interactive contrast layers", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toContain(
      'url("/assets/ink-wash/cocktail-ink-wash-wide.png")',
    );
    expect(stylesheet).toContain(
      'url("/assets/ink-wash/cocktail-ink-wash-tall.png")',
    );
    expect(stylesheet).toContain(
      'url("/assets/ink-wash/cocktail-ink-wash-heading.png")',
    );
    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-hero-copy::before\s*\{[\s\S]*?pointer-events: none;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-ledger-section::before\s*\{[\s\S]*?pointer-events: none;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-ledger-section > \*\s*\{[\s\S]*?z-index: 1;/,
    );
  });

  it("preserves the native brown tonal range of every detail ink wash", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-hero-copy::before\s*\{[\s\S]*?filter: none;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.hero-fact::before\s*\{[\s\S]*?filter: none;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--cocktail-detail-book \.detail-ledger-section::before\s*\{[\s\S]*?filter: none;/,
    );
  });

  it("matches the DIY action position to the workbench preview action", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.sticky-action\.book-page-navigation\s*\{[\s\S]*?position: absolute;[\s\S]*?right: 13\.5%;[\s\S]*?bottom: 48px;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.sticky-action\.book-page-navigation\s*\{[\s\S]*?right: 49px;[\s\S]*?bottom: 30px;/,
    );
  });
});
