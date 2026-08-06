import type { DiyDraft, SavedRecipe } from "../types/domain";
import { mockDelay } from "./apiClient";

const savedRecipeRepository: SavedRecipe[] = [];

export async function saveDraftAsRecipe(draft: DiyDraft): Promise<SavedRecipe> {
  const recipe: SavedRecipe = {
    id: crypto.randomUUID(),
    sourceCocktailId: draft.sourceCocktailId,
    sourceCocktailName: draft.sourceCocktailName,
    name: draft.name,
    nameEn: draft.nameEn,
    baseSpirit: draft.baseSpirit,
    ingredients: draft.ingredients,
    flavorTags: draft.flavorTags,
    notes: draft.notes,
    createdAt: new Date().toISOString(),
  };

  savedRecipeRepository.unshift(recipe);

  return mockDelay(recipe);
}

export async function listSavedRecipes(): Promise<SavedRecipe[]> {
  return mockDelay(
    [...savedRecipeRepository].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );
}

export async function getSavedRecipeById(
  id: string,
): Promise<SavedRecipe | undefined> {
  return mockDelay(savedRecipeRepository.find((recipe) => recipe.id === id));
}
