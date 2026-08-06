import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("HomePage mobile layout", () => {
  it("uses the same 260px reading width for the title frame and recommendation stage", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-hero-frame\s*\{[\s\S]*?width: min\(100%, 260px\);/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.recommendation-stage\s*\{[\s\S]*?width: min\(100%, 260px\);/,
    );
  });

  it("uses one continuous photo surface behind the mobile featured card", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-feature-card img\s*\{[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*object-position:\s*center;[^}]*transform:\s*none;[^}]*mask-image:\s*none;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-feature-card \.cocktail-card-content\s*\{[^}]*width:\s*62%;[^}]*padding:\s*16px 8px 14px 14px;/,
    );
  });

  it("uses the blended card composition across the 621px to 700px transition range", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /@media \(min-width: 621px\) and \(max-width: 700px\)[\s\S]*?\.app-shell--home-book \.home-feature-card img\s*\{[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*object-position:\s*center;[^}]*transform:\s*none;[^}]*mask-image:\s*none;/,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 621px\) and \(max-width: 700px\)[\s\S]*?\.app-shell--home-book \.home-feature-card \.cocktail-card-content\s*\{[^}]*width:\s*58%;[^}]*padding:\s*26px 18px 24px 28px;/,
    );
  });

  it("keeps the image darkening continuous through the copy column", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-feature-card \.card-sheen\s*\{[^}]*background:\s*linear-gradient\(\s*90deg,\s*rgba\(12, 6, 4, 0\.98\) 0%,\s*rgba\(12, 6, 4, 0\.96\) 44%,\s*rgba\(12, 6, 4, 0\.72\) 58%,\s*rgba\(12, 6, 4, 0\.24\) 72%,\s*rgba\(12, 6, 4, 0\.08\) 100%\s*\);/,
    );
  });

  it("keeps the bottom card ornament compact instead of stretching across the card", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.home-card-ornament\s*\{[^}]*top:\s*0;[^}]*\}[\s\S]*?\.home-card-ornament\.home-card-ornament--bottom\s*\{[^}]*top:\s*auto;[^}]*bottom:\s*0;[^}]*transform:\s*translate\(-50%, 50%\);/,
    );
  });
});
