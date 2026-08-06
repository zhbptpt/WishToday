import { describe, expect, it } from "vitest";
import { mockCocktails } from "../mocks/cocktails";
import { resolvePreviewSteps } from "./previewRecipeSteps";

const sourceCocktail = mockCocktails[0];

describe("resolvePreviewSteps", () => {
  it("returns the source cocktail preparation steps", () => {
    expect(
      resolvePreviewSteps(
        sourceCocktail.id,
        sourceCocktail.ingredients,
        mockCocktails,
      ),
    ).toEqual([
      "杯中加入糖浆与苦精。",
      "加入威士忌和冰块，轻柔搅拌。",
      "用橙皮释放香气。",
    ]);
  });

  it("falls back to ingredient order when the source cocktail is unavailable", () => {
    expect(
      resolvePreviewSteps(
        "missing-source",
        sourceCocktail.ingredients,
        mockCocktails,
      ),
    ).toEqual([
      "波本威士忌 · 45 ml",
      "糖浆 · 8 ml",
      "芳香苦精 · 2 dash",
    ]);
  });
});
