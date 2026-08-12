import { mockCocktails } from "../mocks/cocktails";
import type { Cocktail, DiyDraft } from "../types/domain";
import { mockDelay } from "./apiClient";

export async function listTodayRecommendations(): Promise<Cocktail[]> {
  return mockDelay(mockCocktails, 160, "listTodayRecommendations");
}

export async function getCocktailById(id: string): Promise<Cocktail | undefined> {
  return mockDelay(
    mockCocktails.find((cocktail) => cocktail.id === id),
    160,
    "getCocktailById",
  );
}

export async function createDraftFromCocktailId(
  id: string,
): Promise<DiyDraft | undefined> {
  const cocktail = mockCocktails.find((item) => item.id === id);

  if (!cocktail) {
    return mockDelay(undefined, 160, "createDraftFromCocktailId");
  }

  return mockDelay(
    {
      sourceCocktailId: cocktail.id,
      sourceCocktailName: cocktail.nameZh,
      name: `${cocktail.nameZh}改造版`,
      nameEn: cocktail.nameEn,
      baseSpirit: cocktail.baseSpirit,
      ingredients: cocktail.ingredients.map((ingredient) => ({ ...ingredient })),
      flavorTags: [...cocktail.flavorTags],
      notes: "",
      isDirty: false,
    },
    160,
    "createDraftFromCocktailId",
  );
}
