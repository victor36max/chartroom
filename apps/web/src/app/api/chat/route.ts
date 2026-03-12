import {
  streamText,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
} from "ai";
import { after } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { createTools } from "@/lib/agent/tools";
import { pruneContext } from "@/lib/agent/prune-context";
import { resolveModelId, type ModelTier } from "@/lib/agent/models";
import { createClient } from "@/lib/supabase/server";
import { getBalance, deductBalance } from "@/lib/db/queries";
import { isAuthEnabled, getMarkupMultiplier } from "@/lib/utils";

export const maxDuration = 60;

export async function POST(req: Request) {
  let userId: string | null = null;

  if (isAuthEnabled()) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await getBalance(session.user.id);
    if (balance <= 0) {
      return Response.json({ error: "Insufficient balance" }, { status: 402 });
    }

    userId = session.user.id;
  }

  let body: { messages?: unknown; dataContext?: unknown; tier?: unknown; modelId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return Response.json({ error: "Invalid request body: messages must be an array" }, { status: 400 });
  }

  const messages = body.messages as UIMessage[];
  const dataContext = typeof body.dataContext === "string" ? body.dataContext : undefined;
  const tier = (body.tier === "fast" || body.tier === "mid" || body.tier === "power" ? body.tier : "mid") as ModelTier;
  const customModelId = typeof body.modelId === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,100}$/.test(body.modelId)
    ? body.modelId
    : undefined;

  // Extract dataset names from dataContext (contains `"url": "name"` patterns)
  const datasetNames: string[] = dataContext
    ? [...dataContext.matchAll(/"url":\s*"([^"]+)"/g)].map(m => m[1])
    : [];

  const tools = createTools(datasetNames);

  const modelMessages = await convertToModelMessages(messages);
  const finalMessages = pruneContext(modelMessages);

  const modelId = customModelId ?? resolveModelId(tier);

  let result;
  try {
    result = streamText({
      model: openrouter(modelId),
      system: buildSystemPrompt(dataContext),
      messages: finalMessages,
      tools,
      stopWhen: stepCountIs(10),
    });
  } catch (err) {
    console.error("Failed to start chat stream:", err);
    return Response.json({ error: "Failed to generate response" }, { status: 500 });
  }

  // Track cost after stream completes
  if (userId) {
    const trackedUserId = userId;
    after(async () => {
      try {
        const [usage, metadata] = await Promise.all([
          result.totalUsage,
          result.providerMetadata,
        ]);
        const openrouter = metadata?.openrouter as Record<string, unknown> | undefined;
        const openrouterUsage = openrouter?.usage as Record<string, unknown> | undefined;
        const rawCost = (openrouterUsage?.cost as number) ?? 0;
        const cost = rawCost * getMarkupMultiplier();
        if (cost > 0) {
          await deductBalance({
            userId: trackedUserId,
            amount: cost,
            modelId,
            tier,
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to deduct balance:", err);
      }
    });
  }

  return result.toUIMessageStreamResponse();
}
