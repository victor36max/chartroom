declare const MIGRATIONS_PATH: string;

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";
import { _setDb, _resetDb, type Database } from ".";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://test:test@localhost:5433/chartroom_test";

let testClient: ReturnType<typeof postgres> | null = null;
let testDb: Database | null = null;

export function getTestDb(): Database {
  if (!testDb) {
    testClient = postgres(TEST_DATABASE_URL, { prepare: false });
    testDb = drizzle(testClient, { schema });
  }
  return testDb;
}

/** Run migrations and wire up the test DB singleton */
export async function setupTestDb() {
  const db = getTestDb();
  _setDb(db);

  await migrate(db, { migrationsFolder: MIGRATIONS_PATH });
}

/** Truncate all tables between tests */
export async function cleanTestDb() {
  const db = getTestDb();
  await db.delete(schema.usageLogs);
  await db.delete(schema.payments);
  await db.delete(schema.profiles);
}

/** Close connection and reset singleton */
export async function teardownTestDb() {
  if (testClient) {
    await testClient.end();
    testClient = null;
  }
  testDb = null;
  _resetDb();
}
