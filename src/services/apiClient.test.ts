import { beforeEach, describe, expect, it } from "vitest";
import { mockCocktails } from "../mocks/cocktails";
import {
  configureMockFailure,
  resetMockFailures,
} from "./apiClient";
import { listTodayRecommendations } from "./cocktailService";
import {
  listSavedRecipes,
  saveDraftAsRecipe,
} from "./recipeService";

beforeEach(() => {
  resetMockFailures();
});

describe("mock API failure controls", () => {
  it("fails only the configured operation for the configured number of requests", async () => {
    configureMockFailure("listTodayRecommendations", {
      message: "今日推荐加载失败",
      times: 1,
    });

    await expect(listTodayRecommendations()).rejects.toThrow(
      "今日推荐加载失败",
    );
    await expect(listTodayRecommendations()).resolves.toHaveLength(
      mockCocktails.length,
    );
  });

  it("does not persist a recipe when the save request fails", async () => {
    const source = mockCocktails[0];
    const beforeCount = (await listSavedRecipes()).length;
    configureMockFailure("saveDraftAsRecipe", {
      message: "保存服务暂时不可用",
      times: 1,
    });

    await expect(
      saveDraftAsRecipe({
        sourceCocktailId: source.id,
        sourceCocktailName: source.nameZh,
        name: `${source.nameZh}验收失败版`,
        nameEn: source.nameEn,
        baseSpirit: source.baseSpirit,
        ingredients: source.ingredients.map((ingredient) => ({ ...ingredient })),
        flavorTags: [...source.flavorTags],
        notes: "",
        isDirty: true,
      }),
    ).rejects.toThrow("保存服务暂时不可用");

    await expect(listSavedRecipes()).resolves.toHaveLength(beforeCount);
  });
});
