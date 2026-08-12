import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PreviewRecipePage book actions", () => {
  it("uses a continuous final-chapter ledger instead of stacked panels", () => {
    const page = readFileSync(
      new URL("./PreviewRecipePage.tsx", import.meta.url),
      "utf8",
    );

    expect(page).toContain('className="preview-final-chapter"');
    expect(page).toContain('className="preview-meta-ledger"');
    expect(page).toContain('className="preview-ledger-grid"');
    expect(page).toContain('className="preview-flavor-note"');
    expect(page).not.toContain("preview-line-index");
    expect(page).not.toContain('<section className="info-grid">');
  });

  it("keeps the preview ledger readable at mobile and desktop widths", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--preview-book \.preview-ledger-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--preview-book \.preview-ledger-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--preview-book \.preview-ledger-section\s*\{[\s\S]*?font-size: 0\.95rem;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--preview-book \.preview-ledger-section\s*\{[\s\S]*?font-size: 0\.875rem;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--preview-book \.book-page-action\s*\{[\s\S]*?min-height: 40px;/,
    );
  });

  it("keeps the metadata ledger in three equal columns and adds a 630px-friendly breakpoint", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--preview-book \.preview-meta-ledger\s*\{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--preview-book \.preview-meta-ledger dt\s*\{[\s\S]*?font-size: 0\.78rem;/,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 621px\) and \(max-width: 700px\)[\s\S]*?\.app-shell--preview-book \.preview-ledger-grid\s*\{[\s\S]*?gap: 28px;/,
    );
  });

  it("keeps the preview label text-only", () => {
    const page = readFileSync(
      new URL("./PreviewRecipePage.tsx", import.meta.url),
      "utf8",
    );
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--preview-book \.workbench-heading-label::before,\s*\.app-shell--preview-book \.workbench-heading-label::after\s*\{[\s\S]*?content: none;/,
    );
  });

  it("places the preview label at the left edge of its heading row", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--preview-book \.workbench-heading-label\s*\{[\s\S]*?justify-self: start;/,
    );
  });

  it("matches the save action position to the workbench preview action", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.dual-action-row \.book-page-action--forward\s*\{[\s\S]*?position: absolute;[\s\S]*?right: 13\.5%;[\s\S]*?bottom: 48px;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.dual-action-row \.book-page-action--forward\s*\{[\s\S]*?right: 49px;[\s\S]*?bottom: 30px;/,
    );
    expect(stylesheet).toMatch(
      /\.dual-action-row \.book-page-action--back\s*\{[\s\S]*?position: absolute;[\s\S]*?left: 13\.5%;[\s\S]*?bottom: 48px;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.dual-action-row \.book-page-action--back\s*\{[\s\S]*?left: 49px;[\s\S]*?bottom: 30px;/,
    );
  });
});
