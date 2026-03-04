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
        } catch {
          // Not JSON, leave as-is
        }

        return part;
      }),
    };
  });
}

export async function POST(req: Request) {
  const {
    messages,
    csvData,
    dataContext,
  }: {
    messages: UIMessage[];
    csvData?: Record<string, unknown>[];
    dataContext?: string;
  } = await req.json();

  const tools = createTools(csvData);

  const modelMessages = await convertToModelMessages(messages);
  const messagesWithImages = injectChartImages(modelMessages);

  const result = streamText({
    model: openrouter(process.env.MODEL_ID ?? "anthropic/claude-sonnet-4"),
    system: buildSystemPrompt(dataContext),
    messages: messagesWithImages,
    tools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
