import { describe, expect, it, vi } from "vitest";
import type { StateStorage } from "zustand/middleware";
import {
  FLOW_STATE_BACKUP_KEY,
  FLOW_STATE_STORAGE_KEY,
  createResilientStorage,
} from "./storage";

function createMapStorage(initial: Record<string, string> = {}): StateStorage {
  const items = new Map(Object.entries(initial));

  return {
    getItem: (name) => items.get(name) ?? null,
    removeItem: (name) => {
      items.delete(name);
    },
    setItem: (name, value) => {
      items.set(name, value);
    },
  };
}

describe("createResilientStorage", () => {
  it("backs up the original v1 value once and never overwrites the backup", async () => {
    const original = '{"state":{"savedRecipes":[]},"version":0}';
    const replacement = '{"state":{"savedRecipes":[{"id":"later"}]},"version":0}';
    const primary = createMapStorage({
      [FLOW_STATE_STORAGE_KEY]: original,
    });
    const storage = createResilientStorage({ primary });

    await storage.getItem(FLOW_STATE_STORAGE_KEY);
    await primary.setItem(FLOW_STATE_STORAGE_KEY, replacement);
    await storage.getItem(FLOW_STATE_STORAGE_KEY);

    expect(await primary.getItem(FLOW_STATE_BACKUP_KEY)).toBe(original);
  });

  it("switches to memory when localStorage throws and reports persistence unavailable", async () => {
    const onAvailabilityChange = vi.fn();
    const primary: StateStorage = {
      getItem: () => {
        throw new Error("storage blocked");
      },
      removeItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {
        throw new Error("storage blocked");
      },
    };
    const storage = createResilientStorage({
      primary,
      onAvailabilityChange,
    });

    await expect(storage.getItem("draft")).resolves.toBeNull();
    await storage.setItem("draft", "memory-copy");

    await expect(storage.getItem("draft")).resolves.toBe("memory-copy");
    expect(storage.isPersistent()).toBe(false);
    expect(onAvailabilityChange).toHaveBeenCalledOnce();
    expect(onAvailabilityChange).toHaveBeenCalledWith(false);
  });
});
