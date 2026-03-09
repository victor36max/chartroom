import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let _db: Database | null = null;

export function db() {
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL!, { prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}

/** @internal Test-only: override the singleton DB instance */
export function _setDb(instance: Database) {
  _db = instance;
}

/** @internal Test-only: clear the singleton so it reconnects */
export function _resetDb() {
  _db = null;
}
