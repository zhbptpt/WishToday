export const DATABASE_POOL = Symbol("DATABASE_POOL");
export const DATABASE_HEALTH = Symbol("DATABASE_HEALTH");

export interface DatabaseHealth {
  ping(): Promise<void>;
}
