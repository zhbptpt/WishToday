import type { DiyDraft, PendingAction } from "../types/domain";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingActionInput =
  | { kind: "saveRecipe"; draftId: string; saveIntentId: string }
  | { kind: "openNotebook" }
  | { kind: "openRecipe"; recipeId: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function createPendingAction(
  input: PendingActionInput,
  now = new Date(),
): PendingAction {
  const expiresAt = new Date(now.getTime() + DEFAULT_TTL_MS).toISOString();

  switch (input.kind) {
    case "saveRecipe":
      return { ...input, expiresAt };
    case "openNotebook":
      return { ...input, expiresAt };
    case "openRecipe":
      return { ...input, expiresAt };
  }
}

export function parsePendingAction(
  value: unknown,
  now = new Date(),
): PendingAction | undefined {
  if (!isRecord(value) || !isNonEmptyString(value.expiresAt)) {
    return undefined;
  }

  const expiresAt = new Date(value.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return undefined;
  }

  if (
    value.kind === "saveRecipe" &&
    isNonEmptyString(value.draftId) &&
    isNonEmptyString(value.saveIntentId)
  ) {
    return {
      kind: "saveRecipe",
      draftId: value.draftId,
      saveIntentId: value.saveIntentId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  if (value.kind === "openNotebook") {
    return { kind: "openNotebook", expiresAt: expiresAt.toISOString() };
  }

  if (value.kind === "openRecipe" && isNonEmptyString(value.recipeId)) {
    return {
      kind: "openRecipe",
      recipeId: value.recipeId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  return undefined;
}

export function matchesSaveRecipePendingAction(
  action: PendingAction | undefined,
  draft: Pick<DiyDraft, "draftId" | "saveIntentId">,
  now = new Date(),
): boolean {
  const validAction = parsePendingAction(action, now);
  return (
    validAction?.kind === "saveRecipe" &&
    validAction.draftId === draft.draftId &&
    validAction.saveIntentId === draft.saveIntentId
  );
}
