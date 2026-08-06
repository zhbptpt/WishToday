import { mockIngredients } from "../mocks/ingredients";
import type { Ingredient, IngredientCategory } from "../types/domain";
import { mockDelay } from "./apiClient";

export async function listIngredients(): Promise<Ingredient[]> {
  return mockDelay(mockIngredients);
}

export async function listIngredientsByCategory(
  category: IngredientCategory,
): Promise<Ingredient[]> {
  return mockDelay(
    mockIngredients.filter((ingredient) => ingredient.category === category),
  );
}

export async function searchIngredients(query: string): Promise<Ingredient[]> {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return listIngredients();
  }

  return mockDelay(
    mockIngredients.filter((ingredient) => {
      const searchableText = [
        ingredient.id,
        ingredient.name,
        ingredient.description,
        ingredient.alcoholLevel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(normalizedQuery);
    }),
  );
}
