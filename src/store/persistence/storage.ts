import type { StateStorage } from "zustand/middleware";
import { PERSISTENCE_VERSION } from "./schema";

export const FLOW_STATE_STORAGE_KEY = "wishtoday-flow-state";
export const FLOW_STATE_BACKUP_KEY = "wishtoday-flow-state-v1-backup";

export type ResilientStorage = StateStorage & {
  isPersistent: () => boolean;
};

type ResilientStorageOptions = {
  primary?: StateStorage;
  onAvailabilityChange?: (available: boolean) => void;
};

function createMemoryStorage(): StateStorage {
  const items = new Map<string, string>();

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

function getBrowserStorage(): StateStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function isV1Value(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as { version?: unknown; state?: unknown };
    if (parsed.version === PERSISTENCE_VERSION) {
      return false;
    }

    if (
      typeof parsed.state === "object" &&
      parsed.state !== null &&
      "schemaVersion" in parsed.state &&
      (parsed.state as { schemaVersion?: unknown }).schemaVersion ===
        PERSISTENCE_VERSION
    ) {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export function createResilientStorage(
  options: ResilientStorageOptions = {},
): ResilientStorage {
  const memory = createMemoryStorage();
  const primary = options.primary ?? getBrowserStorage();
  let persistent = primary !== undefined;
  let availabilityReported = false;

  const markUnavailable = () => {
    persistent = false;
    if (!availabilityReported) {
      availabilityReported = true;
      options.onAvailabilityChange?.(false);
    }
  };

  return {
    isPersistent: () => persistent,
    getItem: async (name) => {
      if (!persistent || !primary) {
        return memory.getItem(name);
      }

      let value: string | null = null;
      try {
        value = await primary.getItem(name);
        if (
          name === FLOW_STATE_STORAGE_KEY &&
          value !== null &&
          isV1Value(value)
        ) {
          const backup = await primary.getItem(FLOW_STATE_BACKUP_KEY);
          if (backup === null) {
            await primary.setItem(FLOW_STATE_BACKUP_KEY, value);
          }
        }
        return value;
      } catch {
        markUnavailable();
        if (value !== null) {
          await memory.setItem(name, value);
          return value;
        }
        return memory.getItem(name);
      }
    },
    removeItem: async (name) => {
      if (name === FLOW_STATE_BACKUP_KEY) {
        return;
      }

      if (!persistent || !primary) {
        await memory.removeItem(name);
        return;
      }

      try {
        await primary.removeItem(name);
      } catch {
        markUnavailable();
        await memory.removeItem(name);
      }
    },
    setItem: async (name, value) => {
      if (!persistent || !primary) {
        await memory.setItem(name, value);
        return;
      }

      try {
        await primary.setItem(name, value);
      } catch {
        markUnavailable();
        await memory.setItem(name, value);
      }
    },
  };
}
