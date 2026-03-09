import {
  streamText,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
  type ModelMessage,
} from "ai";
import { after } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { createTools } from "@/lib/agent/tools";
import { pruneOldToolResults } from "@/lib/agent/prune-context";
import { resolveModelId, type ModelTier } from "@/lib/agent/models";
import { createClient } from "@/lib/supabase/server";
import { getBalance, deductBalance } from "@/lib/db/queries";
import { isAuthEnabled, getMarkupMultiplier } from "@/lib/utils";

export const maxDuration = 60;


function injectChartImages(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "tool") return msg;

    return {
      ...msg,
      content: msg.content.map((part) => {
        if (part.type !== "tool-result") return part;

        // Check if this is a render_chart result with an image
        try {
          const output = part.output;
          const raw = typeof output === "object" && output !== null && "type" in output
            ? (output as { type: string; value?: unknown }).value
            : output;
          const parsed =
            typeof raw === "string" ? JSON.parse(raw) : raw;

          if (parsed?.image && typeof parsed.image === "string") {
            const warningText = Array.isArray(parsed.warnings) && parsed.warnings.length > 0
              ? `\n\nVega-Lite warnings:\n${parsed.warnings.map((w: string) => `- ${w}`).join("\n")}\n\nPlease fix these warnings.`
              : "";
            return {
              ...part,
              output: {
                type: "content" as const,
                value: [
                  {
                    type: "text" as const,
                    text: `Chart rendered successfully.${warningText} Here is a screenshot for evaluation:`,
                  },
                  {
                    type: "file-data" as const,
                    data: parsed.image,
                    mediaType: "image/png",
                  },
                ],
              },
            };
          }

          if (parsed?.success === false && parsed?.error) {
            return {
              ...part,
              output: {
                type: "text" as const,
                value: `Chart rendering failed with error: ${parsed.error}\nPlease fix the chart spec and try again.`,
              },
            };
          }
        } catch {
          // Not JSON, leave as-is
        }

        return part;
      }),
    };
  });
}

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

  let body: { messages?: unknown; csvDatasets?: unknown; dataContext?: unknown; tier?: unknown };
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

  const csvDatasets: Record<string, Record<string, unknown>[]> =
    body.csvDatasets && typeof body.csvDatasets === "object" && !Array.isArray(body.csvDatasets)
      ? (body.csvDatasets as Record<string, Record<string, unknown>[]>)
      : {};

  const tools = createTools(csvDatasets);

  const modelMessages = await convertToModelMessages(messages);
  const prunedMessages = pruneOldToolResults(modelMessages);
  const messagesWithImages = injectChartImages(prunedMessages);

  const modelId = resolveModelId(tier);

  let result;
  try {
    result = streamText({
      model: openrouter(modelId),
      system: buildSystemPrompt(dataContext),
      messages: messagesWithImages,
      tools,
      stopWhen: stepCountIs(5),
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
