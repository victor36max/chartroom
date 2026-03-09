import { eq, sql } from "drizzle-orm";
import { db as getDb } from ".";
import { profiles, usageLogs, payments } from "./schema";

export async function getBalance(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ balanceUsd: profiles.balanceUsd })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row ? parseFloat(row.balanceUsd) : 0;
}

export async function upsertProfile(user: {
  id: string;
  email?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  freeCredits: number;
}) {
  await getDb()
    .insert(profiles)
    .values({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      balanceUsd: String(user.freeCredits),
    })
    .onConflictDoNothing({ target: profiles.id });
}

export async function deductBalance(params: {
  userId: string;
  amount: number;
  modelId: string;
  tier: string;
  inputTokens: number;
  outputTokens: number;
}) {
  return await getDb().transaction(async (tx) => {
    const [row] = await tx
      .select({ balanceUsd: profiles.balanceUsd })
      .from(profiles)
      .where(eq(profiles.id, params.userId))
      .for("update");

    if (!row || parseFloat(row.balanceUsd) < params.amount) {
      throw new Error("Insufficient balance");
    }

    const [updated] = await tx
      .update(profiles)
      .set({
        balanceUsd: sql`${profiles.balanceUsd}::numeric - ${params.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, params.userId))
      .returning({ balanceUsd: profiles.balanceUsd });

    await tx.insert(usageLogs).values({
      userId: params.userId,
      modelId: params.modelId,
      tier: params.tier,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd: String(params.amount),
    });

    return parseFloat(updated.balanceUsd);
  });
}

export async function creditBalance(userId: string, amount: number) {
  const [updated] = await getDb()
    .update(profiles)
    .set({
      balanceUsd: sql`${profiles.balanceUsd}::numeric + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning({ balanceUsd: profiles.balanceUsd });

  return updated ? parseFloat(updated.balanceUsd) : 0;
}

export async function processPayment(params: {
  userId: string;
  stripeSessionId: string;
  amountUsd: number;
}) {
  await getDb().transaction(async (tx) => {
    const [inserted] = await tx
      .insert(payments)
      .values({
        userId: params.userId,
        stripeSessionId: params.stripeSessionId,
        amountUsd: String(params.amountUsd),
      })
      .onConflictDoNothing({ target: payments.stripeSessionId })
      .returning({ id: payments.id });

    // Only credit if the payment was actually inserted (idempotent)
    if (inserted) {
      await tx
        .update(profiles)
        .set({
          balanceUsd: sql`${profiles.balanceUsd}::numeric + ${params.amountUsd}`,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, params.userId));
    }
  });
}
