import { describe, expect, it } from "vitest";
import {
  createPendingAction,
  matchesSaveRecipePendingAction,
  parsePendingAction,
} from "./pendingAction";

const now = new Date("2026-08-17T08:00:00.000Z");

describe("PendingAction", () => {
  it("expires a newly created action after 24 hours by default", () => {
    expect(
      createPendingAction(
        {
          kind: "saveRecipe",
          draftId: "draft-1",
          saveIntentId: "intent-1",
        },
        now,
      ),
    ).toEqual({
      kind: "saveRecipe",
      draftId: "draft-1",
      saveIntentId: "intent-1",
      expiresAt: "2026-08-18T08:00:00.000Z",
    });
  });

  it("accepts only whitelisted, unexpired actions", () => {
    expect(
      parsePendingAction(
        {
          kind: "openRecipe",
          recipeId: "recipe-1",
          expiresAt: "2026-08-17T09:00:00.000Z",
        },
        now,
      ),
    ).toEqual({
      kind: "openRecipe",
      recipeId: "recipe-1",
      expiresAt: "2026-08-17T09:00:00.000Z",
    });
    expect(
      parsePendingAction(
        {
          kind: "redirect",
          url: "https://example.com",
          expiresAt: "2026-08-17T09:00:00.000Z",
        },
        now,
      ),
    ).toBeUndefined();
    expect(
      parsePendingAction(
        {
          kind: "openNotebook",
          expiresAt: "2026-08-17T07:59:59.000Z",
        },
        now,
      ),
    ).toBeUndefined();
  });

  it("matches a save action only when draftId and saveIntentId both match", () => {
    const action = createPendingAction(
      {
        kind: "saveRecipe",
        draftId: "draft-1",
        saveIntentId: "intent-1",
      },
      now,
    );

    expect(
      matchesSaveRecipePendingAction(action, {
        draftId: "draft-1",
        saveIntentId: "intent-1",
      }),
    ).toBe(true);
    expect(
      matchesSaveRecipePendingAction(action, {
        draftId: "draft-1",
        saveIntentId: "intent-2",
      }),
    ).toBe(false);
    expect(
      matchesSaveRecipePendingAction(action, {
        draftId: "draft-2",
        saveIntentId: "intent-1",
      }),
    ).toBe(false);
    expect(
      matchesSaveRecipePendingAction(
        action,
        {
          draftId: "draft-1",
          saveIntentId: "intent-1",
        },
        new Date("2026-08-18T08:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
