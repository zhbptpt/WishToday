import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockCocktails } from "../mocks/cocktails";
import {
  configureMockFailure,
  resetMockFailures,
} from "../services/apiClient";
import type { Ingredient, SavedRecipe } from "../types/domain";
import { useWishTodayStore } from "./useWishTodayStore";

const sourceCocktail = mockCocktails[0];

const extraIngredient: Ingredient = {
  id: "mint",
  name: "薄荷",
  category: "herb",
  description: "增加清凉草本气息。",
};

beforeEach(async () => {
  resetMockFailures();
  await useWishTodayStore.persist.clearStorage();
  useWishTodayStore.getState().resetFlow();
});

describe("useWishTodayStore flow state", () => {
  it("restores the core flow state from localStorage after a reload", async () => {
    const savedRecipe: SavedRecipe = {
      id: "saved-persisted",
      sourceCocktailId: sourceCocktail.id,
      sourceCocktailName: sourceCocktail.nameZh,
      name: "持久化配方",
      nameEn: "Persisted Recipe",
      baseSpirit: sourceCocktail.baseSpirit,
      ingredients: sourceCocktail.ingredients,
      flavorTags: sourceCocktail.flavorTags,
      notes: "刷新后仍应存在",
      createdAt: "2026-08-12T10:00:00.000Z",
    };

    const store = useWishTodayStore.getState();
    store.createDraftFromCocktail(sourceCocktail);
    store.setSession({
      isAuthenticated: true,
      userId: "user-persisted",
      nickname: "今日调酒师",
    });
    store.addSavedRecipe(savedRecipe);

    const { name, storage } = useWishTodayStore.persist.getOptions();
    if (!name || !storage) {
      throw new Error("Store persistence is not configured");
    }

    const persistedValue = await storage?.getItem(name);
    if (!persistedValue) {
      throw new Error("Core flow state was not persisted");
    }

    useWishTodayStore.setState({
      currentDraft: undefined,
      lastSavedRecipeId: undefined,
      savedRecipes: [],
      session: { isAuthenticated: false },
    });
    await storage.setItem(name, persistedValue);
    await useWishTodayStore.persist.rehydrate();

    expect(useWishTodayStore.getState()).toMatchObject({
      currentDraft: { sourceCocktailId: sourceCocktail.id },
      lastSavedRecipeId: savedRecipe.id,
      savedRecipes: [{ id: savedRecipe.id }],
      session: {
        isAuthenticated: true,
        userId: "user-persisted",
      },
    });
  });

  it("creates an editable DIY draft from a source cocktail", () => {
    useWishTodayStore.getState().createDraftFromCocktail(sourceCocktail);

    const draft = useWishTodayStore.getState().currentDraft;

    expect(draft).toMatchObject({
      sourceCocktailId: sourceCocktail.id,
      sourceCocktailName: sourceCocktail.nameZh,
      name: `${sourceCocktail.nameZh}改造版`,
      nameEn: sourceCocktail.nameEn,
      baseSpirit: sourceCocktail.baseSpirit,
      isDirty: false,
    });
    expect(draft?.ingredients).toHaveLength(sourceCocktail.ingredients.length);
    expect(draft?.ingredients).not.toBe(sourceCocktail.ingredients);
  });

  it("updates draft fields and marks the draft dirty", () => {
    const store = useWishTodayStore.getState();
    store.createDraftFromCocktail(sourceCocktail);
    store.updateDraftInfo({ name: "晚风古典", notes: "少糖，多橙皮香气。" });

    expect(useWishTodayStore.getState().currentDraft).toMatchObject({
      name: "晚风古典",
      notes: "少糖，多橙皮香气。",
      isDirty: true,
    });
  });

  it("adds only non-duplicate ingredients to the current draft", () => {
    const store = useWishTodayStore.getState();
    store.createDraftFromCocktail(sourceCocktail);

    const added = store.addIngredientToDraft(extraIngredient);
    const duplicated = store.addIngredientToDraft(extraIngredient);
    const draft = useWishTodayStore.getState().currentDraft;

    expect(added).toBe(true);
    expect(duplicated).toBe(false);
    expect(
      draft?.ingredients.filter((item) => item.ingredientId === "mint"),
    ).toHaveLength(1);
    expect(draft?.ingredients.at(-1)).toMatchObject({
      ingredientId: "mint",
      amount: "",
      unit: "ml",
      stepOrder: sourceCocktail.ingredients.length + 1,
    });
  });

  it("updates, removes, and reorders draft ingredients while keeping step order contiguous", () => {
    const store = useWishTodayStore.getState();
    store.createDraftFromCocktail(sourceCocktail);
    store.updateDraftIngredient("bourbon", { amount: "50", unit: "ml" });
    store.removeDraftIngredient("sugar-syrup");
    store.reorderDraftIngredient("aromatic-bitters", 0);

    const draft = useWishTodayStore.getState().currentDraft;

    expect(draft?.ingredients.map((item) => item.stepOrder)).toEqual([1, 2]);
    expect(draft?.ingredients[0]).toMatchObject({
      ingredientId: "aromatic-bitters",
    });
    expect(
      draft?.ingredients.find((item) => item.ingredientId === "bourbon"),
    ).toMatchObject({
      amount: "50",
      unit: "ml",
    });
    expect(
      draft?.ingredients.some((item) => item.ingredientId === "sugar-syrup"),
    ).toBe(false);
  });

  it("redirects unauthenticated users to saveRecipe without losing the draft", async () => {
    const store = useWishTodayStore.getState();
    store.createDraftFromCocktail(sourceCocktail);

    const result = await store.saveCurrentDraft();

    expect(result.status).toBe("authRequired");
    expect(useWishTodayStore.getState()).toMatchObject({
      redirectAction: "saveRecipe",
      saveStatus: "idle",
    });
    expect(useWishTodayStore.getState().currentDraft?.sourceCocktailId).toBe(
      sourceCocktail.id,
    );
  });

  it("validates draft name, ingredients, amount, and unit before preview or save", () => {
    const store = useWishTodayStore.getState();
    store.createDraftFromCocktail(sourceCocktail);
    store.updateDraftInfo({ name: "   " });

    expect(useWishTodayStore.getState().validateCurrentDraft()).toEqual([
      "请输入配方名称",
    ]);

    store.updateDraftInfo({ name: "晚风古典" });
    store.updateDraftIngredient("bourbon", { amount: "" });

    expect(useWishTodayStore.getState().validateCurrentDraft()).toEqual([
      "请填写每个材料的用量",
    ]);

    store.updateDraftIngredient("bourbon", { amount: "50", unit: "" });

    expect(useWishTodayStore.getState().validateCurrentDraft()).toEqual([
      "请选择每个材料的单位",
    ]);
  });

  it("does not save invalid drafts", async () => {
    const store = useWishTodayStore.getState();
    const saveRecipe = vi.fn();
    store.createDraftFromCocktail(sourceCocktail);
    store.setSession({
      isAuthenticated: true,
      userId: "user-1",
      nickname: "调酒新手",
    });
    store.updateDraftInfo({ name: "" });

    const result = await store.saveCurrentDraft(saveRecipe);

    expect(result).toEqual({
      status: "invalid",
      errors: ["请输入配方名称"],
    });
    expect(saveRecipe).not.toHaveBeenCalled();
    expect(useWishTodayStore.getState()).toMatchObject({
      saveStatus: "error",
      saveError: "请输入配方名称",
    });
  });

  it("continues saveRecipe after authentication and records the saved recipe", async () => {
    const store = useWishTodayStore.getState();
    const saveRecipe = vi.fn(async () => {
      const draft = useWishTodayStore.getState().currentDraft;
      return {
        id: "saved-1",
        sourceCocktailId: draft?.sourceCocktailId ?? "",
        sourceCocktailName: draft?.sourceCocktailName ?? "",
        name: draft?.name ?? "",
        nameEn: draft?.nameEn,
        baseSpirit: draft?.baseSpirit ?? "",
        ingredients: draft?.ingredients ?? [],
        flavorTags: draft?.flavorTags ?? [],
        notes: draft?.notes ?? "",
        createdAt: "2026-07-09T10:00:00.000Z",
      } satisfies SavedRecipe;
    });

    store.createDraftFromCocktail(sourceCocktail);
    await store.saveCurrentDraft(saveRecipe);
    store.setSession({
      isAuthenticated: true,
      userId: "user-1",
      nickname: "调酒新手",
    });
    const result = await useWishTodayStore
      .getState()
      .continueAfterAuth(saveRecipe);

    expect(result.status).toBe("saved");
    expect(saveRecipe).toHaveBeenCalledTimes(1);
    expect(useWishTodayStore.getState()).toMatchObject({
      redirectAction: undefined,
      saveStatus: "success",
      lastSavedRecipeId: "saved-1",
    });
    expect(useWishTodayStore.getState().savedRecipes[0]).toMatchObject({
      id: "saved-1",
      sourceCocktailId: sourceCocktail.id,
    });
  });

  it("keeps the draft and exposes the service error when saving fails", async () => {
    const store = useWishTodayStore.getState();
    store.createDraftFromCocktail(sourceCocktail);
    store.setSession({
      isAuthenticated: true,
      userId: "user-1",
      nickname: "调酒新手",
    });
    configureMockFailure("saveDraftAsRecipe", {
      message: "保存服务暂时不可用",
      times: 1,
    });

    const result = await store.saveCurrentDraft();

    expect(result).toEqual({
      status: "error",
      error: "保存服务暂时不可用",
    });
    expect(useWishTodayStore.getState()).toMatchObject({
      saveStatus: "error",
      saveError: "保存服务暂时不可用",
    });
    expect(useWishTodayStore.getState().currentDraft?.sourceCocktailId).toBe(
      sourceCocktail.id,
    );
  });
});
