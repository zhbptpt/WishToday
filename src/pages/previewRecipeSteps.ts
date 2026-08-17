import type { Cocktail, CocktailIngredient } from "../types/domain";

export type PreviewStepSnapshot = {
  steps: string[];
  source: "source" | "fallback";
};

export function resolvePreviewStepSnapshot(
  sourceCocktailId: string,
  ingredients: CocktailIngredient[],
  cocktails: Cocktail[],
): PreviewStepSnapshot {
  const sourceCocktail = cocktails.find(
    (cocktail) => cocktail.id === sourceCocktailId,
  );

  if (sourceCocktail?.steps.length) {
    return { steps: [...sourceCocktail.steps], source: "source" };
  }

  return {
    steps: ingredients.map(
      (ingredient) =>
        `${ingredient.name} · ${ingredient.amount} ${ingredient.unit}`,
    ),
    source: "fallback",
  };
}

export function resolvePreviewSteps(
  sourceCocktailId: string,
  ingredients: CocktailIngredient[],
  cocktails: Cocktail[],
) {
  return resolvePreviewStepSnapshot(
    sourceCocktailId,
    ingredients,
    cocktails,
  ).steps;
}
