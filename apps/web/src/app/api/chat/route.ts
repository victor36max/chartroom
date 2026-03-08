import {
  streamText,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
  type ModelMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { createTools } from "@/lib/agent/tools";
import { pruneOldToolResults } from "@/lib/agent/prune-context";
import { resolveModelId, type ModelTier } from "@/lib/agent/models";

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
          const parsed =
            typeof output === "string" ? JSON.parse(output) : output;

          if (parsed?.image && typeof parsed.image === "string") {
            const warningText = Array.isArray(parsed.warnings) && parsed.warnings.length > 0
              ? `\n\nVega-Lite warnings:\n${parsed.warnings.map((w: string) => `- ${w}`).join("\n")}\n\nPlease fix these warnings.`
              : "";
            return {
              ...part,
              output: [
                {
                  type: "text",
                  text: `Chart rendered successfully.${warningText} Here is a screenshot for evaluation:`,
                },
                {
                  type: "image",
                  data: parsed.image,
                  mediaType: "image/png",
                },
              ],
            };
          }

          if (parsed?.success === false && parsed?.error) {
            return {
              ...part,
              output: `Chart rendering failed with error: ${parsed.error}\nPlease fix the chart spec and try again.`,
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

  const result = streamText({
    model: openrouter(resolveModelId(tier)),
    system: buildSystemPrompt(dataContext),
    messages: messagesWithImages,
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
