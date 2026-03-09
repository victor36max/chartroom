import { beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, cleanTestDb, teardownTestDb } from "./test-helper";

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});
