import { describe, it, expect } from "vitest";
import type { ModelMessage } from "ai";
import { pruneContext } from "../prune-context";

// Helper to build ModelMessage arrays without fighting AI SDK's strict types
function msg(role: string, content: unknown[]): ModelMessage {
  return { role, content } as unknown as ModelMessage;
}

function toolCall(toolName: string, toolCallId: string): ModelMessage {
  return msg("assistant", [{ type: "tool-call", toolName, toolCallId }]);
}

function toolResult(toolCallId: string, output: unknown): ModelMessage {
  return msg("tool", [{ type: "tool-result", toolCallId, output }]);
}

function userMsg(text: string): ModelMessage {
  return msg("user", [{ type: "text", text }]);
}

function assistantMsg(text: string, reasoning = false): ModelMessage {
  const content: unknown[] = [];
  if (reasoning) content.push({ type: "reasoning", text: "thinking..." });
  content.push({ type: "text", text });
  return msg("assistant", content);
}

function getOutput(message: ModelMessage): unknown {
  return (message.content as { output: unknown }[])[0].output;
}

function hasPartType(message: ModelMessage, type: string): boolean {
  return (message.content as { type: string }[]).some((p) => p.type === type);
}

describe("pruneContext", () => {
  it("returns messages unchanged when nothing to prune", () => {
    const messages = [userMsg("hello"), assistantMsg("hi")];
    const result = pruneContext(messages);
    expect(result).toStrictEqual(messages);
  });

  it("prunes old render_chart images and injects latest as multimodal (auto-send)", () => {
    // Last message is tool result → auto-send scenario
    const messages = [
      userMsg("chart 1"),
      toolCall("render_chart", "rc1"),
      toolResult("rc1", { image: "base64_1", success: true }),
      toolCall("render_chart", "rc2"),
      toolResult("rc2", { image: "base64_2", success: true }),
    ];
    const result = pruneContext(messages);

    // rc1 should be pruned to text
    expect(getOutput(result[2])).toEqual({
      type: "text",
      value: "Chart result pruned to save context.",
    });

    // rc2 (latest) should be injected as multimodal content
    const latestOutput = getOutput(result[4]) as { type: string; value: unknown[] };
    expect(latestOutput.type).toBe("content");
    expect(latestOutput.value).toHaveLength(2);
    expect(latestOutput.value[0]).toMatchObject({ type: "text" });
    expect(latestOutput.value[1]).toMatchObject({
      type: "file-data",
      data: "base64_2",
      mediaType: "image/png",
    });
  });

  it("strips ALL images when last message is user (user-send)", () => {
    const messages = [
      userMsg("chart"),
      toolCall("render_chart", "rc1"),
      toolResult("rc1", { image: "base64_1", success: true }),
      assistantMsg("here's your chart"),
      userMsg("now change the color"), // user message last
    ];
    const result = pruneContext(messages);

    // Image should be stripped to text-only
    expect(getOutput(result[2])).toEqual({
      type: "text",
      value: "Chart rendered successfully.",
    });
  });

  it("includes warnings when stripping images on user-send", () => {
    const messages = [
      userMsg("chart"),
      toolCall("render_chart", "rc1"),
      toolResult("rc1", { image: "img", success: true, warnings: ["bad field", "wrong type"] }),
      assistantMsg("done"),
      userMsg("fix it"),
    ];
    const result = pruneContext(messages);

    expect(getOutput(result[2])).toEqual({
      type: "text",
      value: "Chart rendered successfully. Warnings: bad field; wrong type",
    });
  });

  it("includes warnings in multimodal injection on auto-send", () => {
    const messages = [
      userMsg("chart"),
      toolCall("render_chart", "rc1"),
      toolResult("rc1", { image: "img", success: true, warnings: ["bad field"] }),
    ];
    const result = pruneContext(messages);

    const output = getOutput(result[2]) as { type: string; value: { type: string; text?: string }[] };
    expect(output.type).toBe("content");
    expect(output.value[0].text).toContain("Vega-Lite warnings");
    expect(output.value[0].text).toContain("bad field");
  });

  it("converts render error to text", () => {
    const messages = [
      userMsg("chart"),
      toolCall("render_chart", "rc1"),
      toolResult("rc1", { success: false, error: "Invalid field name" }),
    ];
    const result = pruneContext(messages);

    expect(getOutput(result[2])).toEqual({
      type: "text",
      value: "Chart rendering failed with error: Invalid field name\nPlease fix the chart spec and try again.",
    });
  });

  it("prunes ALL lookup_docs results", () => {
    const messages = [
      userMsg("help"),
      toolCall("lookup_docs", "ld1"),
      toolResult("ld1", { documentation: "bar docs..." }),
      userMsg("now chart"),
      toolCall("lookup_docs", "ld2"),
      toolResult("ld2", { documentation: "line docs..." }),
    ];
    const result = pruneContext(messages);

    for (const idx of [2, 5]) {
      expect(getOutput(result[idx])).toEqual({
        type: "text",
        value: "(docs pruned — call lookup_docs again if needed)",
      });
    }
  });

  it("strips reasoning from older assistant messages but keeps latest", () => {
    const messages = [
      userMsg("q1"),
      assistantMsg("answer1", true),
      userMsg("q2"),
      assistantMsg("answer2", true),
    ];
    const result = pruneContext(messages);

    // Older assistant (index 1): reasoning stripped
    expect(hasPartType(result[1], "reasoning")).toBe(false);
    expect(hasPartType(result[1], "text")).toBe(true);

    // Latest assistant (index 3): reasoning kept
    expect(hasPartType(result[3], "reasoning")).toBe(true);
  });

  it("handles combined pruning: images + docs + reasoning", () => {
    const messages = [
      userMsg("first"),
      assistantMsg("thinking...", true),
      toolCall("lookup_docs", "ld1"),
      toolResult("ld1", { documentation: "docs" }),
      toolCall("render_chart", "rc1"),
      toolResult("rc1", { image: "img1", success: true }),
      userMsg("update"),
      assistantMsg("ok", true),
      toolCall("render_chart", "rc2"),
      toolResult("rc2", { image: "img2", success: true }),
    ];
    const result = pruneContext(messages);

    // Old reasoning stripped
    expect(hasPartType(result[1], "reasoning")).toBe(false);

    // Docs pruned
    expect(getOutput(result[3])).toEqual({
      type: "text",
      value: "(docs pruned — call lookup_docs again if needed)",
    });

    // Old chart image pruned
    expect(getOutput(result[5])).toEqual({
      type: "text",
      value: "Chart result pruned to save context.",
    });

    // Latest chart image injected as multimodal (last msg is tool result)
    const latestOutput = getOutput(result[9]) as { type: string; value: unknown[] };
    expect(latestOutput.type).toBe("content");
    expect(latestOutput.value).toHaveLength(2);

    // Reasoning at index 7 also stripped (index 8 is the last assistant msg — a tool-call)
    expect(hasPartType(result[7], "reasoning")).toBe(false);
  });
});
