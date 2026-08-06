import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mockCocktails } from "../mocks/cocktails";
import { CocktailHero } from "./CocktailHero";

describe("CocktailHero", () => {
  it("places the Chinese cocktail name inside the hero above the English name", () => {
    const cocktail = mockCocktails[0];
    const markup = renderToStaticMarkup(<CocktailHero cocktail={cocktail} />);
    const title = `<h1 class="detail-hero-title">${cocktail.nameZh}</h1>`;
    const englishName = `<p class="eyebrow">${cocktail.nameEn}</p>`;

    expect(markup).toContain(
      '<section class="detail-hero detail-hero--manuscript">',
    );
    expect(markup).toContain(title);
    expect(markup.indexOf(title)).toBeLessThan(markup.indexOf(englishName));
    expect(markup).toContain('class="detail-flavor-notes"');
    expect(markup).toContain('class="hero-facts hero-facts--manuscript"');
  });
});
