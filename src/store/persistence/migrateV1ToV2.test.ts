import { describe, expect, it } from "vitest";
import { PERSISTENCE_VERSION } from "./schema";
import { migrateV1ToV2 } from "./migrateV1ToV2";

const oldFashionedIngredients = [
  {
    ingredientId: "bourbon",
    name: "波本威士忌",
    category: "baseSpirit",
    amount: "45",
    unit: "ml",
    stepOrder: 1,
  },
  {
    ingredientId: "sugar-syrup",
    name: "糖浆",
    category: "syrup",
    amount: "8",
    unit: "ml",
    stepOrder: 2,
  },
];

function createV1Recipe(overrides: Record<string, unknown> = {}) {
  return {
    id: "saved-v1",
    sourceCocktailId: "old-fashioned",
    sourceCocktailName: "古典鸡尾酒",
    name: "夜色古典",
    nameEn: "Night Old Fashioned",
    baseSpirit: "威士忌",
    ingredients: oldFashionedIngredients,
    flavorTags: ["橡木焦糖"],
    notes: "少糖。",
    createdAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("migrateV1ToV2", () => {
  it("migrates a complete v0.1 flow without carrying session or save transients", () => {
    const migrated = migrateV1ToV2({
      state: {
        currentDraft: {
          ...createV1Recipe({ id: undefined, createdAt: undefined }),
          isDirty: true,
        },
        redirectAction: "saveRecipe",
        savedRecipes: [createV1Recipe()],
        session: {
          isAuthenticated: true,
          userId: "mock-user",
        },
        saveStatus: "error",
        saveError: "旧错误",
        lastSavedRecipeId: "saved-v1",
      },
      version: 0,
    });

    expect(migrated.schemaVersion).toBe(PERSISTENCE_VERSION);
    expect(migrated.currentDraft).toMatchObject({
      sourceCocktailId: "old-fashioned",
      isDirty: true,
    });
    expect(migrated.currentDraft?.draftId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/i,
    );
    expect(migrated.currentDraft?.saveIntentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/i,
    );
    expect(migrated.pendingAction).toMatchObject({
      kind: "saveRecipe",
      draftId: migrated.currentDraft?.draftId,
      saveIntentId: migrated.currentDraft?.saveIntentId,
    });
    expect(migrated.localLegacyRecipes).toEqual([
      expect.objectContaining({
        localRecordId: "saved-v1",
        name: "夜色古典",
        migrationSource: "v0.1-source",
        steps: [
          "杯中加入糖浆与苦精。",
          "加入威士忌和冰块，轻柔搅拌。",
          "用橙皮释放香气。",
        ],
      }),
    ]);
    expect(migrated).not.toHaveProperty("session");
    expect(migrated).not.toHaveProperty("saveStatus");
    expect(migrated).not.toHaveProperty("saveError");
    expect(migrated).not.toHaveProperty("savedRecipes");
  });

  it("builds explicit fallback steps when a recipe source cannot be resolved", () => {
    const migrated = migrateV1ToV2({
      savedRecipes: [
        createV1Recipe({
          id: "missing-source-recipe",
          sourceCocktailId: "removed-cocktail",
        }),
      ],
    });

    expect(migrated.localLegacyRecipes[0]).toMatchObject({
      localRecordId: "missing-source-recipe",
      migrationSource: "v0.1-fallback",
      steps: ["波本威士忌 · 45 ml", "糖浆 · 8 ml"],
    });
  });

  it("isolates a damaged recipe instead of clearing valid local records", () => {
    const migrated = migrateV1ToV2({
      savedRecipes: [
        createV1Recipe({ id: "valid-first" }),
        { id: "damaged", name: "缺少必要字段" },
        createV1Recipe({ id: "valid-last", name: "仍然保留" }),
      ],
    });

    expect(migrated.localLegacyRecipes.map((item) => item.localRecordId)).toEqual(
      ["valid-first", "valid-last"],
    );
  });

  it("returns the same stable identifiers when a v2 state is migrated again", () => {
    const first = migrateV1ToV2({
      currentDraft: {
        ...createV1Recipe({ id: undefined, createdAt: undefined }),
        isDirty: false,
      },
      savedRecipes: [createV1Recipe()],
    });

    expect(migrateV1ToV2(first)).toEqual(first);
  });
});
