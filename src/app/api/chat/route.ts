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

export const maxDuration = 60;

/**
 * Strip old render_chart tool calls and results, keeping only the latest.
 * Older chart renders get replaced with a short text summary to save context.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pruneOldCharts(messages: any[]): any[] {
  const chartCallIds: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "assistant" || typeof msg.content === "string") continue;
    for (const part of msg.content) {
      if (part.type === "tool-call" && part.toolName === "render_chart") {
        chartCallIds.push(part.toolCallId);
      }
    }
  }

  if (chartCallIds.length <= 1) return messages;

  const staleIds = new Set(chartCallIds.slice(0, -1));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return messages.map((msg: any) => {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      return {
        ...msg,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: msg.content.map((part: any) => {
          if (
            part.type === "tool-call" &&
            part.toolName === "render_chart" &&
            staleIds.has(part.toolCallId)
          ) {
            return { ...part, input: { spec: "(pruned)" } };
          }
          return part;
        }),
      };
    }

    if (msg.role === "tool" && Array.isArray(msg.content)) {
      return {
        ...msg,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: msg.content.map((part: any) => {
          if (part.type === "tool-result" && staleIds.has(part.toolCallId)) {
            return { ...part, output: { type: "text", value: "Older chart — pruned to save context." } };
          }
          return part;
        }),
      };
    }

    return msg;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectChartImages(messages: ModelMessage[]): any[] {
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
            return {
              ...part,
              output: [
                {
                  type: "text",
                  text: "Chart rendered successfully. Here is a screenshot for evaluation:",
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
  let body: { messages?: unknown; csvData?: unknown; dataContext?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return Response.json({ error: "Invalid request body: messages must be an array" }, { status: 400 });
  }

  const messages = body.messages as UIMessage[];
  const csvData = Array.isArray(body.csvData) ? (body.csvData as Record<string, unknown>[]) : undefined;
  const dataContext = typeof body.dataContext === "string" ? body.dataContext : undefined;

  const tools = createTools(csvData);

  const modelMessages = await convertToModelMessages(messages);
  const prunedMessages = pruneOldCharts(modelMessages);
  const messagesWithImages = injectChartImages(prunedMessages);

  const result = streamText({
    model: openrouter(process.env.MODEL_ID ?? "anthropic/claude-sonnet-4"),
    system: buildSystemPrompt(dataContext),
    messages: messagesWithImages,
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
