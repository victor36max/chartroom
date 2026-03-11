import { describe, it, expect } from "vitest";
import {
  getBalance,
  upsertProfile,
  creditBalance,
  deductBalance,
  processPayment,
} from "./queries";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID_2 = "00000000-0000-0000-0000-000000000002";

async function createProfile(id: string, balance: number = 0) {
  await upsertProfile({
    id,
    email: `${id}@test.com`,
    displayName: "Test User",
    avatarUrl: null,
    freeCredits: balance,
  });
}

describe("getBalance", () => {
  it("returns 0 for non-existent user", async () => {
    const balance = await getBalance(USER_ID);
    expect(balance).toBe(0);
  });

  it("returns balance for existing user", async () => {
    await createProfile(USER_ID, 10);
    const balance = await getBalance(USER_ID);
    expect(balance).toBe(10);
  });
});

describe("upsertProfile", () => {
  it("creates a new profile with initial balance", async () => {
    await createProfile(USER_ID, 5);
    const balance = await getBalance(USER_ID);
    expect(balance).toBe(5);
  });

  it("does not overwrite existing profile", async () => {
    await createProfile(USER_ID, 10);
    // Try to upsert again with different balance
    await upsertProfile({
      id: USER_ID,
      email: "new@test.com",
      displayName: "New Name",
      avatarUrl: null,
      freeCredits: 99,
    });
    // Balance should remain 10 (onConflictDoNothing)
    const balance = await getBalance(USER_ID);
    expect(balance).toBe(10);
  });
});

describe("creditBalance", () => {
  it("adds to existing balance", async () => {
    await createProfile(USER_ID, 10);
    const newBalance = await creditBalance(USER_ID, 5);
    expect(newBalance).toBe(15);
  });

  it("returns 0 for non-existent user", async () => {
    const result = await creditBalance(USER_ID, 5);
    expect(result).toBe(0);
  });
});

describe("deductBalance", () => {
  it("deducts from balance and logs usage", async () => {
    await createProfile(USER_ID, 10);
    const remaining = await deductBalance({
      userId: USER_ID,
      amount: 3,
      modelId: "test-model",
      tier: "fast",
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(remaining).toBe(7);

    const balance = await getBalance(USER_ID);
    expect(balance).toBe(7);
  });

  it("allows balance to go negative", async () => {
    await createProfile(USER_ID, 1);
    const remaining = await deductBalance({
      userId: USER_ID,
      amount: 5,
      modelId: "test-model",
      tier: "fast",
      inputTokens: 100,
      outputTokens: 50,
    });

    expect(remaining).toBe(-4);
    const balance = await getBalance(USER_ID);
    expect(balance).toBe(-4);
  });

  it("deducts exact balance to zero", async () => {
    await createProfile(USER_ID, 5);
    const remaining = await deductBalance({
      userId: USER_ID,
      amount: 5,
      modelId: "test-model",
      tier: "fast",
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(remaining).toBe(0);
  });
});

describe("processPayment", () => {
  it("inserts payment and credits balance atomically", async () => {
    await createProfile(USER_ID, 0);
    await processPayment({
      userId: USER_ID,
      stripeSessionId: "sess_001",
      amountUsd: 20,
    });
    const balance = await getBalance(USER_ID);
    expect(balance).toBe(20);
  });

  it("is idempotent — duplicate session does not double-credit", async () => {
    await createProfile(USER_ID, 0);
    await processPayment({
      userId: USER_ID,
      stripeSessionId: "sess_002",
      amountUsd: 10,
    });
    // Replay same session
    await processPayment({
      userId: USER_ID,
      stripeSessionId: "sess_002",
      amountUsd: 10,
    });
    const balance = await getBalance(USER_ID);
    expect(balance).toBe(10); // not 20
  });

  it("handles different sessions for same user", async () => {
    await createProfile(USER_ID, 0);
    await processPayment({
      userId: USER_ID,
      stripeSessionId: "sess_a",
      amountUsd: 10,
    });
    await processPayment({
      userId: USER_ID,
      stripeSessionId: "sess_b",
      amountUsd: 15,
    });
    const balance = await getBalance(USER_ID);
    expect(balance).toBe(25);
  });

  it("handles payments for different users", async () => {
    await createProfile(USER_ID, 0);
    await createProfile(USER_ID_2, 5);
    await processPayment({
      userId: USER_ID,
      stripeSessionId: "sess_x",
      amountUsd: 10,
    });
    await processPayment({
      userId: USER_ID_2,
      stripeSessionId: "sess_y",
      amountUsd: 20,
    });
    expect(await getBalance(USER_ID)).toBe(10);
    expect(await getBalance(USER_ID_2)).toBe(25);
  });
});
