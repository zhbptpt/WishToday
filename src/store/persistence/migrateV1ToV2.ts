import { mockCocktails } from "../../mocks/cocktails";
import { resolvePreviewStepSnapshot } from "../../pages/previewRecipeSteps";
import { createPendingAction, parsePendingAction } from "../../routes/pendingAction";
import type {
  CocktailIngredient,
  DiyDraft,
  IngredientCategory,
  LocalLegacyRecipe,
} from "../../types/domain";
import { ingredientCategories } from "../../types/domain";
import { PERSISTENCE_VERSION, type V2PersistedState } from "./schema";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIngredientCategory(value: unknown): value is IngredientCategory {
  return (
    typeof value === "string" &&
    ingredientCategories.includes(value as IngredientCategory)
  );
}

function parseIngredients(value: unknown): CocktailIngredient[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const ingredients: CocktailIngredient[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.ingredientId) ||
      !isNonEmptyString(item.name) ||
      !isIngredientCategory(item.category) ||
      typeof item.amount !== "string" ||
      typeof item.unit !== "string"
    ) {
      return undefined;
    }

    ingredients.push({
      ingredientId: item.ingredientId,
      name: item.name,
      category: item.category,
      amount: item.amount,
      unit: item.unit,
      stepOrder:
        typeof item.stepOrder === "number" && Number.isFinite(item.stepOrder)
          ? item.stepOrder
          : ingredients.length + 1,
    });
  }

  return ingredients;
}

function parseStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? [...value]
    : undefined;
}

function parseDraft(value: unknown): DiyDraft | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const ingredients = parseIngredients(value.ingredients);
  const flavorTags = parseStringArray(value.flavorTags);
  if (
    !ingredients ||
    !flavorTags ||
    !isNonEmptyString(value.sourceCocktailId) ||
    !isNonEmptyString(value.sourceCocktailName) ||
    typeof value.name !== "string" ||
    typeof value.baseSpirit !== "string" ||
    typeof value.notes !== "string" ||
    typeof value.isDirty !== "boolean"
  ) {
    return undefined;
  }

  return {
    draftId: isNonEmptyString(value.draftId)
      ? value.draftId
      : crypto.randomUUID(),
    saveIntentId: isNonEmptyString(value.saveIntentId)
      ? value.saveIntentId
      : crypto.randomUUID(),
    sourceCocktailId: value.sourceCocktailId,
    sourceCocktailName: value.sourceCocktailName,
    name: value.name,
    nameEn: typeof value.nameEn === "string" ? value.nameEn : undefined,
    baseSpirit: value.baseSpirit,
    ingredients,
    flavorTags,
    notes: value.notes,
    isDirty: value.isDirty,
  };
}

function parseLegacyRecipe(value: unknown): LocalLegacyRecipe | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const localRecordId = isNonEmptyString(value.localRecordId)
    ? value.localRecordId
    : isNonEmptyString(value.id)
      ? value.id
      : undefined;
  const ingredients = parseIngredients(value.ingredients);
  const flavorTags = parseStringArray(value.flavorTags);
  if (
    !localRecordId ||
    !ingredients ||
    !flavorTags ||
    !isNonEmptyString(value.sourceCocktailId) ||
    !isNonEmptyString(value.sourceCocktailName) ||
    typeof value.name !== "string" ||
    typeof value.baseSpirit !== "string" ||
    typeof value.notes !== "string" ||
    !isNonEmptyString(value.createdAt)
  ) {
    return undefined;
  }

  const existingSteps = parseStringArray(value.steps);
  const resolved = resolvePreviewStepSnapshot(
    value.sourceCocktailId,
    ingredients,
    mockCocktails,
  );
  const migrationSource =
    value.migrationSource === "v0.1-source" ||
    value.migrationSource === "v0.1-fallback"
      ? value.migrationSource
      : resolved.source === "source"
        ? "v0.1-source"
        : "v0.1-fallback";

  return {
    localRecordId,
    sourceCocktailId: value.sourceCocktailId,
    sourceCocktailName: value.sourceCocktailName,
    name: value.name,
    nameEn: typeof value.nameEn === "string" ? value.nameEn : undefined,
    baseSpirit: value.baseSpirit,
    ingredients,
    flavorTags,
    notes: value.notes,
    createdAt: value.createdAt,
    steps: existingSteps ?? resolved.steps,
    migrationSource,
  };
}

function unwrapPersistedState(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) {
    return {};
  }

  return isRecord(raw.state) ? raw.state : raw;
}

export function migrateV1ToV2(raw: unknown): V2PersistedState {
  const source = unwrapPersistedState(raw);
  const currentDraft = parseDraft(source.currentDraft);
  const rawRecipes = Array.isArray(source.localLegacyRecipes)
    ? source.localLegacyRecipes
    : Array.isArray(source.savedRecipes)
      ? source.savedRecipes
      : [];
  const localLegacyRecipes = rawRecipes
    .map(parseLegacyRecipe)
    .filter((recipe): recipe is LocalLegacyRecipe => recipe !== undefined);
  const pendingAction = parsePendingAction(source.pendingAction);
  const migratedRedirect =
    !pendingAction && source.redirectAction === "saveRecipe" && currentDraft
      ? createPendingAction({
          kind: "saveRecipe",
          draftId: currentDraft.draftId,
          saveIntentId: currentDraft.saveIntentId,
        })
      : undefined;

  return {
    schemaVersion: PERSISTENCE_VERSION,
    currentDraft,
    localLegacyRecipes,
    pendingAction: pendingAction ?? migratedRedirect,
    clientBatchId: isNonEmptyString(source.clientBatchId)
      ? source.clientBatchId
      : undefined,
  };
}
