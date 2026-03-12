import type { ModelMessage } from "ai";

/**
 * Parse a tool-result output into a usable object, handling the various
 * wrapping formats the AI SDK uses.
 */
function parseToolOutput(output: unknown): unknown {
  const raw =
    typeof output === "object" && output !== null && "type" in output
      ? (output as { type: string; value?: unknown }).value
      : output;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

/**
 * Aggressively prune context to save tokens.
 *
 * Detects whether this is a user-initiated request or a tool-call auto-send
 * based on the last message role:
 * - Last message is "user" → strip ALL chart images (zero vision tokens)
 * - Last message is "tool" → keep latest chart image for self-evaluation,
 *   converting it to a multimodal file-data block
 *
 * Always prunes:
 * - Old render_chart images (all except the latest)
 * - ALL lookup_docs results
 * - Reasoning from older assistant messages
 * - render_chart error results → text
 */
export function pruneContext(messages: ModelMessage[]): ModelMessage[] {
  const lastMsg = messages[messages.length - 1];
  const isUserMessage = lastMsg?.role === "user";

  // 1. Collect all render_chart tool-call IDs (in order) and ALL lookup_docs IDs
  const chartCallIds: string[] = [];
  const docCallIds = new Set<string>();

  for (const msg of messages) {
    if (msg.role !== "assistant" || typeof msg.content === "string") continue;
    for (const part of msg.content) {
      if (part.type === "tool-call") {
        if (part.toolName === "render_chart") {
          chartCallIds.push(part.toolCallId);
        } else if (part.toolName === "lookup_docs") {
          docCallIds.add(part.toolCallId);
        }
      }
    }
  }

  // All chart images except the latest should be pruned to text
  const staleImageIds = new Set(chartCallIds.slice(0, -1));
  const latestChartId = chartCallIds.at(-1);

  // Find last assistant message index for reasoning pruning
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }

  const nothingToPrune =
    staleImageIds.size === 0 &&
    docCallIds.size === 0 &&
    !latestChartId &&
    lastAssistantIdx <= 0;
  if (nothingToPrune) return messages;

  return messages.map((msg, idx) => {
    // Prune tool results
    if (msg.role === "tool" && Array.isArray(msg.content)) {
      const prunedContent = msg.content.map((part) => {
        if (part.type !== "tool-result") return part;

        // Prune old chart images
        if (staleImageIds.has(part.toolCallId)) {
          return {
            ...part,
            output: {
              type: "text" as const,
              value: "Chart result pruned to save context.",
            },
          };
        }

        // Handle latest chart image
        if (part.toolCallId === latestChartId) {
          try {
            const parsed = parseToolOutput(part.output) as Record<string, unknown> | null;

            if (parsed?.image && typeof parsed.image === "string") {
              if (isUserMessage) {
                // User message: strip image, keep text-only summary
                const warningText =
                  Array.isArray(parsed.warnings) && parsed.warnings.length > 0
                    ? ` Warnings: ${(parsed.warnings as string[]).join("; ")}`
                    : "";
                return {
                  ...part,
                  output: {
                    type: "text" as const,
                    value: `Chart rendered successfully.${warningText}`,
                  },
                };
              }
              // Auto-send: inject image as multimodal content for evaluation
              const warningText =
                Array.isArray(parsed.warnings) && parsed.warnings.length > 0
                  ? `\n\nVega-Lite warnings:\n${(parsed.warnings as string[]).map((w) => `- ${w}`).join("\n")}\n\nPlease fix these warnings.`
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
                      data: parsed.image as string,
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
        }

        // Prune ALL lookup_docs results
        if (docCallIds.has(part.toolCallId)) {
          return {
            ...part,
            output: {
              type: "text" as const,
              value: "(docs pruned — call lookup_docs again if needed)",
            },
          };
        }

        return part;
      });

      return { ...msg, content: prunedContent };
    }

    // Strip reasoning from older assistant messages
    if (
      msg.role === "assistant" &&
      idx < lastAssistantIdx &&
      Array.isArray(msg.content)
    ) {
      const filtered = msg.content.filter(
        (part) => (part as { type: string }).type !== "reasoning"
      );
      if (filtered.length !== msg.content.length) {
        return { ...msg, content: filtered };
      }
    }

    return msg;
  });
}

/** @deprecated Use `pruneContext` instead */
export const pruneOldToolResults = pruneContext;
