import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("HomePage mobile layout", () => {
  it("uses the approved reference structure and measured composition anchors", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );
    const source = readFileSync(
      new URL("./HomePage.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('className="home-recommendation-image"');
    expect(source).toContain(
      'className="cocktail-card-content home-recommendation-copy"',
    );
    expect(source).toContain('className="home-flavor-rule"');
    expect(source).toContain('className="home-flavor-separator"');
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.recommendation-stage\s*\{[^}]*min-height:\s*664px;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-section-title-row\s*\{[^}]*padding:\s*0 6\.2% 0 16%;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-feature-card\s*\{[^}]*min-height:\s*430px;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-recommendation-copy\s*\{[^}]*left:\s*19%;[^}]*width:\s*36%;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-recommendation-image\s*\{[^}]*left:\s*47%;[^}]*width:\s*45%;/,
    );
  });

  it("uses a dedicated wide soft-edge wash without cropping the real drink", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(
      existsSync(
        new URL(
          "../../public/assets/ink-wash/home-old-fashioned-wide-wash-v1.png",
          import.meta.url,
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        new URL(
          "../../public/assets/ink-wash/old-fashioned-background-wash-v1.png",
          import.meta.url,
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        new URL(
          "../../public/assets/ink-wash/old-fashioned-glass-mask-v1.png",
          import.meta.url,
        ),
      ),
    ).toBe(true);
    expect(stylesheet).toContain(
      'mask-image: url("/assets/ink-wash/home-old-fashioned-wide-wash-v1.png")',
    );
    expect(stylesheet).toMatch(
      /\.home-recommendation-image \.home-feature-photo\s*\{[^}]*object-fit:\s*contain;[^}]*object-position:\s*center bottom;/,
    );
  });

  it("matches the reference divider and flavor-note grammar", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(
      existsSync(
        new URL(
          "../../public/assets/ink-wash/home-divider-ornament-v1.png",
          import.meta.url,
        ),
      ),
    ).toBe(true);
    expect(stylesheet).toMatch(
      /\.home-card-divider\s*\{[^}]*background-image:\s*url\("\/assets\/ink-wash\/home-divider-ornament-v1\.png"\);/,
    );
    expect(stylesheet).toMatch(
      /\.home-flavor-rule\s*\{[^}]*border-top:\s*1px dashed/,
    );
    expect(stylesheet).not.toMatch(
      /\.home-flavor-notes\s*\{[^}]*(?:border-top|border-bottom):/,
    );
  });

  it("keeps copy and the complete drink side by side on narrow screens", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.recommendation-stage\s*\{[^}]*width:\s*126\.1%;[^}]*min-height:\s*664px;[^}]*margin-left:\s*-16\.65%;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-recommendation-copy\s*\{[^}]*left:\s*19%;[^}]*width:\s*36%;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-recommendation-image\s*\{[^}]*left:\s*47%;[^}]*width:\s*45%;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 480px\)[\s\S]*?\.app-shell--home-book \.home-recommendation-image\s*\{[^}]*left:\s*49\.5%;[^}]*width:\s*43\.5%;/,
    );
  });

  it("keeps the hero narrow while expanding the recommendation to the page edges", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-hero-frame\s*\{[\s\S]*?width: min\(100%, 260px\);/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.recommendation-stage\s*\{[\s\S]*?width: 126\.1%;/,
    );
  });

  it("keeps the recommendation copy readable beside the complete drink on mobile", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-recommendation-copy\s*\{[^}]*left:\s*19%;[^}]*width:\s*36%;[^}]*padding:\s*0;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell--home-book \.home-recommendation-copy strong\s*\{[^}]*font-size:\s*clamp\(1\.72rem, 5vw, 2rem\);/,
    );
  });

  it("preserves the copy column across the 621px to 700px transition range", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /@media \(min-width: 621px\) and \(max-width: 700px\)[\s\S]*?\.app-shell--home-book \.home-recommendation-copy\s*\{[^}]*left:\s*19%;[^}]*width:\s*36%;/,
    );
  });

  it("shows a lighter archival photo through a drink-specific irregular rectangle", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );
    const source = readFileSync(
      new URL("./HomePage.tsx", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-feature-card \.card-sheen\s*\{[^}]*background:\s*none;[^}]*opacity:\s*0;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-feature-card\s*\{[^}]*isolation:\s*auto;/,
    );
    expect(stylesheet).toMatch(
      /\.home-recommendation-image \.home-feature-photo\s*\{[^}]*top:\s*-20%;[^}]*left:\s*-112%;[^}]*width:\s*255%;[^}]*height:\s*102\.6%;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-feature-photo--wash\s*\{[^}]*filter:\s*sepia\(1\) saturate\(1\.48\) hue-rotate\(-8deg\) contrast\(0\.9\) brightness\(0\.87\) blur\(18px\);[^}]*mix-blend-mode:\s*multiply;[^}]*opacity:\s*0\.46;[^}]*mask-image:\s*url\("\/assets\/ink-wash\/home-old-fashioned-wide-wash-v1\.png"\);/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-feature-photo--subject\s*\{[^}]*filter:\s*sepia\(0\.68\) saturate\(1\.35\) hue-rotate\(-9deg\) contrast\(0\.92\) brightness\(1\.07\);[^}]*mix-blend-mode:\s*normal;[^}]*opacity:\s*0\.93;[^}]*mask-image:\s*url\("\/assets\/ink-wash\/home-old-fashioned-wide-wash-v1\.png"\);/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-feature-photo--subject\.home-feature-photo--old-fashioned\s*\{[^}]*mask-image:\s*url\("\/assets\/ink-wash\/old-fashioned-glass-mask-v1\.png"\);[^}]*mask-position:\s*center;[^}]*mask-size:\s*100% 100%;/,
    );
    expect(stylesheet).not.toMatch(
      /\.app-shell--home-book \.home-feature-photo--subject\s*\{[^}]*(?:radial-gradient|linear-gradient|clip-path)/,
    );
    expect(stylesheet).not.toMatch(
      /\.app-shell--home-book \.home-feature-card \.cocktail-card-content::before\s*\{[^}]*background-image:/,
    );
    expect(source).toContain(
      "home-feature-photo--${activeCocktail.id}",
    );
    expect(source).toContain(
      '"/assets/ink-wash/old-fashioned-background-wash-v1.png"',
    );
  });

  it("uses archival brown copy directly on the parchment", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-recommendation-copy strong\s*\{[^}]*color:\s*#3a1d10;/,
    );
    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-recommendation-copy em\s*\{[^}]*color:\s*#5a321d;/,
    );
    expect(stylesheet).toMatch(
      /\.home-card-description\s*\{[^}]*color:\s*#4b2918;/,
    );
  });

  it("does not render the black rectangular ornaments on the featured card", () => {
    const source = readFileSync(
      new URL("./HomePage.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("home-card-ornament");
    expect(source).toContain("home-feature-photo--wash");
    expect(source).toContain("home-feature-photo--subject");
    expect(source.match(/<img/g)).toHaveLength(2);
  });

  it("keeps the pager above the clickable recommendation card", () => {
    const stylesheet = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.app-shell--home-book \.home-pager\s*\{[^}]*z-index:\s*3;/,
    );
  });
});
