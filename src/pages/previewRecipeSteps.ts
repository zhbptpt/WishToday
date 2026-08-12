import type { Cocktail, CocktailIngredient } from "../types/domain";

export function resolvePreviewSteps(
  sourceCocktailId: string,
  ingredients: CocktailIngredient[],
  cocktails: Cocktail[],
) {
  const sourceCocktail = cocktails.find(
    (cocktail) => cocktail.id === sourceCocktailId,
  );

  if (sourceCocktail?.steps.length) {
    return sourceCocktail.steps;
  }

  return ingredients.map(
    (ingredient) =>
      `${ingredient.name} · ${ingredient.amount} ${ingredient.unit}`,
  );
}
