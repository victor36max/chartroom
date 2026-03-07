"use client";

import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { parseCSV, metadataToContext } from "@/lib/csv/parser";
import { captureChart } from "@/components/chart/chart-capture";
import { validateSpec } from "@/lib/chart/validate-spec";
import type { ParsedCSV, ChartSpec } from "@/types";
import { MODEL_TIER_LABELS, type ModelTier } from "@/lib/agent/models";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Select as SelectPrimitive } from "radix-ui";

export interface ChatPanelHandle {
  sendSpecEdit: (spec: ChartSpec) => void;
}

interface ChatPanelProps {
  csvData: ParsedCSV | null;
  onCSVParsed: (data: ParsedCSV) => void;
  onChartSpec: (spec: ChartSpec) => void;
  tier: ModelTier;
  onTierChange: (tier: ModelTier) => void;
}

const MAX_CSV_ROWS = 5000;

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(function ChatPanel(
  { csvData, onCSVParsed, onChartSpec, tier, onTierChange },
  ref
) {
  const [input, setInput] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const csvDataRef = useRef(csvData);
  useEffect(() => {
    csvDataRef.current = csvData;
  }, [csvData]);

  const autoSendCountRef = useRef(0);
  const MAX_AUTO_SENDS = 5;

  const { messages, sendMessage, stop, setMessages, status, addToolOutput } = useChat({
    // eslint-disable-next-line react-hooks/refs -- body() is only called on send, not during render
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        tier,
        ...(csvDataRef.current
          ? {
              csvData: csvDataRef.current.data.slice(0, MAX_CSV_ROWS),
              dataContext: metadataToContext(csvDataRef.current.metadata),
            }
          : {}),
      }),
    }),
    sendAutomaticallyWhen: (messages) => {
      if (!lastAssistantMessageIsCompleteWithToolCalls(messages)) return false;
      autoSendCountRef.current++;
      return autoSendCountRef.current <= MAX_AUTO_SENDS;
    },
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "render_chart") {
        const spec = (toolCall as unknown as { input: unknown }).input as {
          spec: ChartSpec;
          title?: string;
          description?: string;
        };

        // Merge title into VL spec if provided separately
        const chartSpec: ChartSpec = spec.title
          ? { ...spec.spec, title: spec.title } as ChartSpec
          : spec.spec;

        // Validate via VL compile
        const validation = validateSpec(chartSpec as unknown as Record<string, unknown>, csvDataRef.current?.data ?? []);
        if (!validation.valid) {
          addToolOutput({
            tool: "render_chart",
            toolCallId: toolCall.toolCallId,
            output: JSON.stringify({
              success: false,
              error: validation.error,
            }),
          });
          return;
        }

        const warnings = validation.warnings;
        onChartSpec(chartSpec);

        // Wait for React to flush and the browser to paint before capturing
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 50)))
        );
        try {
          const png = await captureChart();
          addToolOutput({
            tool: "render_chart",
            toolCallId: toolCall.toolCallId,
            output: JSON.stringify({
              success: true,
              image: png,
              ...(warnings.length > 0 && { warnings }),
            }),
          });
        } catch {
          addToolOutput({
            tool: "render_chart",
            toolCallId: toolCall.toolCallId,
            output: JSON.stringify({
              success: false,
              message:
                "Chart rendered successfully but screenshot capture failed. The chart is visible to the user.",
            }),
          });
        }
      }
    },
  });

  useImperativeHandle(ref, () => ({
    sendSpecEdit(spec: ChartSpec) {
      autoSendCountRef.current = 0;
      sendMessage({
        text: `I manually updated the chart spec to:\n\`\`\`json\n${JSON.stringify(spec, null, 2)}\n\`\`\`\nPlease use this as the current chart going forward.`,
      });
    },
  }), [sendMessage]);

  const isBusy = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleClear = useCallback(() => {
    setMessages([]);
    autoSendCountRef.current = 0;
  }, [setMessages]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      autoSendCountRef.current = 0;
      sendMessage({ text: input });
      setInput("");
    },
    [input, sendMessage]
  );

  const handleFileSelected = useCallback(
    async (file: File) => {
      setCsvError(null);
      const result = await parseCSV(file);
      if (result.errors.length > 0 && result.data.length === 0) {
        setCsvError("Failed to parse CSV: " + result.errors[0]);
        return;
      }
      onCSVParsed(result);
    },
    [onCSVParsed]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <Select value={tier} onValueChange={(v) => onTierChange(v as ModelTier)}>
          <SelectTrigger size="sm" className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["fast", "mid", "power"] as const).map((t) => (
              <SelectPrimitive.Item
                key={t}
                value={t}
                className="relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground"
              >
                <SelectPrimitive.ItemText>{MODEL_TIER_LABELS[t].label}</SelectPrimitive.ItemText>
                <span className="text-muted-foreground text-xs">{MODEL_TIER_LABELS[t].subtitle}</span>
              </SelectPrimitive.Item>
            ))}
          </SelectContent>
        </Select>
        {csvData && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              CSV loaded
            </Badge>
            <span className="text-xs text-muted-foreground">
              {csvData.metadata.rowCount} rows,{" "}
              {csvData.metadata.columns.length} cols
            </span>
          </div>
        )}
      </div>
      <MessageList messages={messages} status={status} />
      {csvError && (
        <p className="px-3 py-1 text-xs text-destructive border-t">{csvError}</p>
      )}
      <MessageInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onStop={handleStop}
        onClear={handleClear}
        onFileSelected={handleFileSelected}
        isBusy={isBusy}
        hasCSV={csvData !== null}
        hasMessages={hasMessages}
      />
    </div>
  );
});
