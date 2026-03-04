"use client";

import { useState, useCallback, useRef, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { parseCSV, metadataToContext } from "@/lib/csv/parser";
import { captureChart } from "@/components/chart/chart-capture";
import type { ParsedCSV, ChartSpec } from "@/types";
import { Badge } from "@/components/ui/badge";

interface ChatPanelProps {
  csvData: ParsedCSV | null;
  onCSVParsed: (data: ParsedCSV) => void;
  onChartSpec: (spec: ChartSpec) => void;
}

export function ChatPanel({ csvData, onCSVParsed, onChartSpec }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const csvDataRef = useRef(csvData);
  csvDataRef.current = csvData;

  const { messages, sendMessage, status, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () =>
        csvDataRef.current
          ? {
              csvData: csvDataRef.current.data,
              dataContext: metadataToContext(csvDataRef.current.metadata),
            }
          : {},
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "render_chart") {
        const spec = (toolCall as unknown as { input: unknown }).input as {
          spec: ChartSpec;
          title?: string;
          description?: string;
        };
        const chartSpec: ChartSpec = {
          ...spec.spec,
          title: spec.title ?? spec.spec.title,
        };
        onChartSpec(chartSpec);

        // Wait for render then capture
        await new Promise((r) => setTimeout(r, 500));
        try {
          const png = await captureChart();
          addToolOutput({
            tool: "render_chart",
            toolCallId: toolCall.toolCallId,
            output: JSON.stringify({
              success: true,
              image: png,
            }),
          });
        } catch {
          addToolOutput({
            tool: "render_chart",
            toolCallId: toolCall.toolCallId,
            output: JSON.stringify({
              success: true,
              message:
                "Chart rendered successfully but screenshot capture failed. The chart is visible to the user.",
            }),
          });
        }
      }
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      sendMessage({ text: input });
      setInput("");
    },
    [input, sendMessage]
  );

  const handleFileSelected = useCallback(
    async (file: File) => {
      const result = await parseCSV(file);
      if (result.errors.length > 0 && result.data.length === 0) {
        console.error("CSV parse errors:", result.errors);
        return;
      }
      onCSVParsed(result);
    },
    [onCSVParsed]
  );

  return (
    <div className="flex flex-col h-full">
      {csvData && (
        <div className="px-3 py-2 border-b flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            CSV loaded
          </Badge>
          <span className="text-xs text-muted-foreground">
            {csvData.metadata.rowCount} rows,{" "}
            {csvData.metadata.columns.length} cols
          </span>
        </div>
      )}
      <MessageList messages={messages} status={status} />
      <MessageInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onFileSelected={handleFileSelected}
        isBusy={isBusy}
        hasCSV={csvData !== null}
      />
    </div>
  );
}
