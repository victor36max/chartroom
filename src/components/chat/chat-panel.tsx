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
import { specToPlot } from "@/lib/chart/spec-to-plot";
import type { ParsedCSV, ChartSpec } from "@/types";
import { Badge } from "@/components/ui/badge";

export interface ChatPanelHandle {
  sendSpecEdit: (spec: ChartSpec) => void;
}

interface ChatPanelProps {
  csvData: ParsedCSV | null;
  onCSVParsed: (data: ParsedCSV) => void;
  onChartSpec: (spec: ChartSpec) => void;
}

const MAX_CSV_ROWS = 5000;

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(function ChatPanel(
  { csvData, onCSVParsed, onChartSpec },
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
      body: () =>
        csvDataRef.current
          ? {
              csvData: csvDataRef.current.data.slice(0, MAX_CSV_ROWS),
              dataContext: metadataToContext(csvDataRef.current.metadata),
            }
          : {},
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
        const chartSpec: ChartSpec = {
          ...spec.spec,
          title: spec.title ?? spec.spec.title,
        };
        // Pre-validate the spec so rendering errors are fed back to the AI
        try {
          specToPlot(chartSpec, csvDataRef.current?.data ?? []);
        } catch (err) {
          addToolOutput({
            tool: "render_chart",
            toolCallId: toolCall.toolCallId,
            output: JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : String(err),
            }),
          });
          return;
        }

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
