import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createPendingAction,
  matchesSaveRecipePendingAction,
} from "../routes/pendingAction";
import { saveDraftAsRecipe } from "../services/recipeService";
import type {
  Cocktail,
  CocktailIngredient,
  DiyDraft,
  Ingredient,
  LocalLegacyRecipe,
  PendingAction,
  SavedRecipe,
  UserSession,
} from "../types/domain";
import { migrateV1ToV2 } from "./persistence/migrateV1ToV2";
import { PERSISTENCE_VERSION } from "./persistence/schema";
import {
  FLOW_STATE_STORAGE_KEY,
  createResilientStorage,
} from "./persistence/storage";

type SaveStatus = "idle" | "saving" | "success" | "error";
type SaveResult =
  | { status: "saved"; recipe: SavedRecipe }
  | { status: "authRequired" }
  | { status: "emptyDraft" }
  | { status: "invalid"; errors: string[] }
  | { status: "error"; error: string };
type SaveRecipeFn = (draft: DiyDraft) => Promise<SavedRecipe>;

type WishTodayState = {
  schemaVersion: typeof PERSISTENCE_VERSION;
  currentDraft?: DiyDraft;
  clientBatchId?: string;
  lastSavedRecipeId?: string;
  localLegacyRecipes: LocalLegacyRecipe[];
  pendingAction?: PendingAction;
  persistenceAvailable: boolean;
  redirectAction?: "saveRecipe";
  saveError?: string;
  savedRecipes: SavedRecipe[];
  saveStatus: SaveStatus;
  session: UserSession;
  addIngredientToDraft: (ingredient: Ingredient) => boolean;
  addSavedRecipe: (recipe: SavedRecipe) => void;
  clearCurrentDraft: () => void;
  continueAfterAuth: (saveRecipe?: SaveRecipeFn) => Promise<SaveResult>;
  createDraftFromCocktail: (cocktail: Cocktail) => void;
  removeDraftIngredient: (ingredientId: string) => void;
  reorderDraftIngredient: (ingredientId: string, nextIndex: number) => void;
  resetFlow: () => void;
  saveCurrentDraft: (saveRecipe?: SaveRecipeFn) => Promise<SaveResult>;
  setCurrentDraft: (draft: DiyDraft) => void;
  setRedirectAction: (action?: "saveRecipe") => void;
  setSession: (session: UserSession) => void;
  updateDraftInfo: (
    fields: Partial<Pick<DiyDraft, "name" | "nameEn" | "flavorTags" | "notes">>,
  ) => void;
  updateDraftIngredient: (
    ingredientId: string,
    fields: Partial<Pick<CocktailIngredient, "amount" | "unit">>,
  ) => void;
  validateCurrentDraft: () => string[];
};

const initialSession: UserSession = { isAuthenticated: false };

function normalizeStepOrder(
  ingredients: CocktailIngredient[],
): CocktailIngredient[] {
  return ingredients.map((ingredient, index) => ({
    ...ingredient,
    stepOrder: index + 1,
  }));
}

function sortSavedRecipes(recipes: SavedRecipe[]): SavedRecipe[] {
  return [...recipes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function toDraft(cocktail: Cocktail): DiyDraft {
  return {
    draftId: crypto.randomUUID(),
    saveIntentId: crypto.randomUUID(),
    sourceCocktailId: cocktail.id,
    sourceCocktailName: cocktail.nameZh,
    name: `${cocktail.nameZh}改造版`,
    nameEn: cocktail.nameEn,
    baseSpirit: cocktail.baseSpirit,
    ingredients: normalizeStepOrder(
      cocktail.ingredients.map((ingredient) => ({ ...ingredient })),
    ),
    flavorTags: [...cocktail.flavorTags],
    notes: "",
    isDirty: false,
  };
}

function validateDraft(draft?: DiyDraft): string[] {
  if (!draft) {
    return ["请先从一杯推荐鸡尾酒进入实验台"];
  }

  if (!draft.name.trim()) {
    return ["请输入配方名称"];
  }

  if (draft.ingredients.length < 1) {
    return ["请至少保留 1 个材料"];
  }

  if (draft.ingredients.some((ingredient) => !ingredient.amount.trim())) {
    return ["请填写每个材料的用量"];
  }

  if (draft.ingredients.some((ingredient) => !ingredient.unit.trim())) {
    return ["请选择每个材料的单位"];
  }

  return [];
}

let updatePersistenceAvailability = (_available: boolean) => {};
const flowStorage = createResilientStorage({
  onAvailabilityChange: (available) =>
    updatePersistenceAvailability(available),
});

export const useWishTodayStore = create<WishTodayState>()(
  persist(
    (set, get) => ({
      schemaVersion: PERSISTENCE_VERSION,
      localLegacyRecipes: [],
      persistenceAvailable: flowStorage.isPersistent(),
      savedRecipes: [],
      saveStatus: "idle",
      session: initialSession,
      addIngredientToDraft: (ingredient) => {
        const draft = get().currentDraft;

        if (!draft) {
          return false;
        }

        const alreadyExists = draft.ingredients.some(
          (item) => item.ingredientId === ingredient.id,
        );

        if (alreadyExists) {
          return false;
        }

        const nextIngredient: CocktailIngredient = {
          ingredientId: ingredient.id,
          name: ingredient.name,
          category: ingredient.category,
          amount: "",
          unit: "ml",
          stepOrder: draft.ingredients.length + 1,
        };

        set({
          currentDraft: {
            ...draft,
            ingredients: normalizeStepOrder([
              ...draft.ingredients,
              nextIngredient,
            ]),
            isDirty: true,
          },
        });

        return true;
      },
      addSavedRecipe: (recipe) =>
        set((state) => ({
          lastSavedRecipeId: recipe.id,
          savedRecipes: sortSavedRecipes([recipe, ...state.savedRecipes]),
        })),
      clearCurrentDraft: () => set({ currentDraft: undefined }),
      continueAfterAuth: async (saveRecipe = saveDraftAsRecipe) => {
        const draft = get().currentDraft;
        if (
          !draft ||
          !matchesSaveRecipePendingAction(get().pendingAction, draft)
        ) {
          return { status: "emptyDraft" };
        }

        return get().saveCurrentDraft(saveRecipe);
      },
      createDraftFromCocktail: (cocktail) =>
        set({
          currentDraft: toDraft(cocktail),
          saveError: undefined,
          saveStatus: "idle",
        }),
      removeDraftIngredient: (ingredientId) => {
        const draft = get().currentDraft;

        if (!draft || draft.ingredients.length <= 1) {
          return;
        }

        set({
          currentDraft: {
            ...draft,
            ingredients: normalizeStepOrder(
              draft.ingredients.filter(
                (ingredient) => ingredient.ingredientId !== ingredientId,
              ),
            ),
            isDirty: true,
          },
        });
      },
      reorderDraftIngredient: (ingredientId, nextIndex) => {
        const draft = get().currentDraft;

        if (!draft) {
          return;
        }

        const currentIndex = draft.ingredients.findIndex(
          (ingredient) => ingredient.ingredientId === ingredientId,
        );

        if (currentIndex < 0) {
          return;
        }

        const nextIngredients = [...draft.ingredients];
        const [movedIngredient] = nextIngredients.splice(currentIndex, 1);
        const boundedIndex = Math.max(
          0,
          Math.min(nextIndex, nextIngredients.length),
        );
        nextIngredients.splice(boundedIndex, 0, movedIngredient);

        set({
          currentDraft: {
            ...draft,
            ingredients: normalizeStepOrder(nextIngredients),
            isDirty: true,
          },
        });
      },
      resetFlow: () =>
        set({
          schemaVersion: PERSISTENCE_VERSION,
          clientBatchId: undefined,
          currentDraft: undefined,
          lastSavedRecipeId: undefined,
          localLegacyRecipes: [],
          pendingAction: undefined,
          redirectAction: undefined,
          saveError: undefined,
          savedRecipes: [],
          saveStatus: "idle",
          session: initialSession,
        }),
      saveCurrentDraft: async (saveRecipe = saveDraftAsRecipe) => {
        const draft = get().currentDraft;

        if (!draft) {
          return { status: "emptyDraft" };
        }

        const validationErrors = validateDraft(draft);

        if (validationErrors.length > 0) {
          set({ saveError: validationErrors[0], saveStatus: "error" });
          return { status: "invalid", errors: validationErrors };
        }

        if (!get().session.isAuthenticated) {
          const pendingAction = createPendingAction({
            kind: "saveRecipe",
            draftId: draft.draftId,
            saveIntentId: draft.saveIntentId,
          });
          set({
            pendingAction,
            redirectAction: "saveRecipe",
            saveError: undefined,
            saveStatus: "idle",
          });
          return { status: "authRequired" };
        }

        set({ saveError: undefined, saveStatus: "saving" });

        try {
          const recipe = await saveRecipe(draft);
          set((state) => ({
            currentDraft: undefined,
            lastSavedRecipeId: recipe.id,
            pendingAction: undefined,
            redirectAction: undefined,
            saveError: undefined,
            savedRecipes: sortSavedRecipes([recipe, ...state.savedRecipes]),
            saveStatus: "success",
          }));
          return { status: "saved", recipe };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "保存失败，请重试。";
          set({ saveError: message, saveStatus: "error" });
          return { status: "error", error: message };
        }
      },
      setCurrentDraft: (draft) => set({ currentDraft: draft }),
      setRedirectAction: (action) => {
        const draft = get().currentDraft;
        set({
          redirectAction: action,
          pendingAction:
            action === "saveRecipe" && draft
              ? createPendingAction({
                  kind: "saveRecipe",
                  draftId: draft.draftId,
                  saveIntentId: draft.saveIntentId,
                })
              : undefined,
        });
      },
      setSession: (session) => set({ session }),
      updateDraftInfo: (fields) => {
        const draft = get().currentDraft;

        if (!draft) {
          return;
        }

        set({
          currentDraft: {
            ...draft,
            ...fields,
            flavorTags: fields.flavorTags
              ? [...fields.flavorTags]
              : draft.flavorTags,
            isDirty: true,
          },
        });
      },
      updateDraftIngredient: (ingredientId, fields) => {
        const draft = get().currentDraft;

        if (!draft) {
          return;
        }

        set({
          currentDraft: {
            ...draft,
            ingredients: draft.ingredients.map((ingredient) =>
              ingredient.ingredientId === ingredientId
                ? { ...ingredient, ...fields }
                : ingredient,
            ),
            isDirty: true,
          },
        });
      },
      validateCurrentDraft: () => validateDraft(get().currentDraft),
    }),
    {
      name: FLOW_STATE_STORAGE_KEY,
      version: PERSISTENCE_VERSION,
      storage: createJSONStorage(() => flowStorage),
      migrate: (persistedState) => migrateV1ToV2(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...migrateV1ToV2(persistedState),
      }),
      onRehydrateStorage: () => () => {
        updatePersistenceAvailability(flowStorage.isPersistent());
      },
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        currentDraft: state.currentDraft,
        localLegacyRecipes: state.localLegacyRecipes,
        pendingAction: state.pendingAction,
        clientBatchId: state.clientBatchId,
      }),
    },
  ),
);

updatePersistenceAvailability = (available) => {
  useWishTodayStore.setState({ persistenceAvailable: available });
};
