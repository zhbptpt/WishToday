import type {
  DiyDraft,
  LocalLegacyRecipe,
  PendingAction,
} from "../../types/domain";

export const PERSISTENCE_VERSION = 2;

export type V2PersistedState = {
  schemaVersion: typeof PERSISTENCE_VERSION;
  currentDraft?: DiyDraft;
  localLegacyRecipes: LocalLegacyRecipe[];
  pendingAction?: PendingAction;
  clientBatchId?: string;
};
