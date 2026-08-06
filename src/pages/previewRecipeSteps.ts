import type { Cocktail, CocktailIngredient } from "../types/domain";

export function resolvePreviewSteps(
  _sourceCocktailId: string,
  ingredients: CocktailIngredient[],
  _cocktails: Cocktail[],
) {
  return ingredients.map(
    (ingredient) =>
      `${ingredient.name} · ${ingredient.amount} ${ingredient.unit}`,
  );
}
