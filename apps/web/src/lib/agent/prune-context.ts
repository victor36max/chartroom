import type { ModelMessage } from "ai";

/**
 * Prune old tool results to save context:
 * - render_chart: keep all specs (small JSON), prune all images except the latest
 * - lookup_docs: prune all results except those from the latest user turn
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pruneOldToolResults(messages: any[]): ModelMessage[] {
  // Collect render_chart call IDs for image pruning
  const chartCallIds: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "assistant" || typeof msg.content === "string") continue;
    for (const part of msg.content) {
      if (part.type === "tool-call" && part.toolName === "render_chart") {
        chartCallIds.push(part.toolCallId);
      }
    }
  }
  const staleImageIds = new Set(chartCallIds.slice(0, -1));

  // Collect lookup_docs call IDs from before the last user message
  let lastUserIdx = -1;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "user") lastUserIdx = i;
  }
  const staleDocIds = new Set<string>();
  for (let i = 0; i < lastUserIdx; i++) {
    const msg = messages[i];
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "tool-call" && part.toolName === "lookup_docs") {
          staleDocIds.add(part.toolCallId);
        }
      }
    }
  }

  if (staleImageIds.size === 0 && staleDocIds.size === 0) return messages;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return messages.map((msg: any) => {
    if (msg.role === "tool" && Array.isArray(msg.content)) {
      return {
        ...msg,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: msg.content.map((part: any) => {
          if (part.type === "tool-result" && staleImageIds.has(part.toolCallId)) {
            return { ...part, output: { type: "text", value: "Older chart image — pruned to save context." } };
          }
          if (part.type === "tool-result" && staleDocIds.has(part.toolCallId)) {
            return { ...part, output: { type: "text", value: "(docs from earlier turn — look up again if needed)" } };
          }
          return part;
        }),
      };
    }
    return msg;
  });
}
