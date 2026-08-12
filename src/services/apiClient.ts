export type MockOperation =
  | "listTodayRecommendations"
  | "getCocktailById"
  | "createDraftFromCocktailId"
  | "listIngredients"
  | "listIngredientsByCategory"
  | "searchIngredients"
  | "saveDraftAsRecipe"
  | "listSavedRecipes"
  | "getSavedRecipeById";

type MockFailure = {
  message: string;
  remaining: number;
};

const mockFailures = new Map<MockOperation, MockFailure>();

export function configureMockFailure(
  operation: MockOperation,
  options: { message: string; times?: number },
) {
  mockFailures.set(operation, {
    message: options.message,
    remaining: Math.max(1, options.times ?? 1),
  });
}

export function resetMockFailures() {
  mockFailures.clear();
}

export async function mockDelay<T>(
  value: T,
  delayMs = 160,
  operation?: MockOperation,
): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  if (operation) {
    const failure = mockFailures.get(operation);

    if (failure) {
      if (failure.remaining <= 1) {
        mockFailures.delete(operation);
      } else {
        mockFailures.set(operation, {
          ...failure,
          remaining: failure.remaining - 1,
        });
      }

      throw new Error(failure.message);
    }
  }

  return value;
}
