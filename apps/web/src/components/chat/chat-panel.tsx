"use client";

import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef, type FormEvent, type ChangeEvent } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { parseCSV, fileNameToDatasetName, datasetsToContext } from "@/lib/csv/parser";
import { captureChart } from "@/components/chart/chart-capture";
import { validateSpec } from "@/lib/chart/validate-spec";
import type { ParsedCSV, DatasetMap, ChartSpec } from "@/types";
import { MODEL_TIER_LABELS, type ModelTier } from "@/lib/agent/models";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Select as SelectPrimitive } from "radix-ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "lucide-react";

export interface ChatPanelHandle {
  sendSpecEdit: (spec: ChartSpec) => void;
}

interface ChatPanelProps {
  datasets: DatasetMap;
  onCSVParsed: (name: string, data: ParsedCSV) => void;
  onDatasetRemoved: (name: string) => void;
  onChartSpec: (spec: ChartSpec) => void;
  tier: ModelTier;
  onTierChange: (tier: ModelTier) => void;
}

const MAX_CSV_ROWS = 5000;

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(function ChatPanel(
  { datasets, onCSVParsed, onDatasetRemoved, onChartSpec, tier, onTierChange },
  ref
) {
  const [input, setInput] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const datasetsRef = useRef(datasets);
  useEffect(() => {
    datasetsRef.current = datasets;
  }, [datasets]);

  const datasetNames = Object.keys(datasets);
  const hasCSV = datasetNames.length > 0;

  const autoSendCountRef = useRef(0);
  const MAX_AUTO_SENDS = 5;

  const { messages, sendMessage, stop, setMessages, status, addToolOutput } = useChat({
    // eslint-disable-next-line react-hooks/refs -- body() is only called on send, not during render
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => {
        const ds = datasetsRef.current;
        const entries = Object.entries(ds);
        if (entries.length === 0) return { tier };
        return {
          tier,
          csvDatasets: Object.fromEntries(
            entries.map(([name, parsed]) => [name, parsed.data.slice(0, MAX_CSV_ROWS)])
          ),
          dataContext: datasetsToContext(ds),
        };
      },
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
        };

        const chartSpec: ChartSpec = spec.spec;

        // Build datasets rows map for validation
        const ds = datasetsRef.current;
        const datasetsRows = Object.fromEntries(
          Object.entries(ds).map(([name, parsed]) => [name, parsed.data])
        );

        // Validate via VL compile
        const validation = validateSpec(chartSpec as unknown as Record<string, unknown>, datasetsRows);
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

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setCsvError(null);
      for (const file of files) {
        const result = await parseCSV(file);
        if (result.errors.length > 0 && result.data.length === 0) {
          setCsvError("Failed to parse CSV: " + result.errors[0]);
          continue;
        }
        const name = fileNameToDatasetName(file.name);
        onCSVParsed(name, result);
      }
    },
    [onCSVParsed]
  );

  const totalRows = Object.values(datasets).reduce((sum, d) => sum + d.metadata.rowCount, 0);

  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const handleHeaderFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFilesSelected(Array.from(files));
        e.target.value = "";
      }
    },
    [handleFilesSelected]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <input
          ref={headerFileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={handleHeaderFileChange}
          className="hidden"
        />
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
        {hasCSV ? (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="cursor-pointer">
                  <Badge variant="secondary" className="text-xs hover:bg-secondary/80 transition-colors">
                    {datasetNames.length} dataset{datasetNames.length > 1 ? "s" : ""} ▾
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="space-y-1">
                  {datasetNames.map((name) => (
                    <div key={name} className="flex items-center justify-between px-2 py-1 rounded text-sm">
                      <span className="truncate">{name}</span>
                      <button
                        type="button"
                        onClick={() => onDatasetRemoved(name)}
                        className="text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => headerFileInputRef.current?.click()}
                    className="w-full text-left px-2 py-1 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    + Add CSV
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">
              {totalRows} rows
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => headerFileInputRef.current?.click()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add CSV
          </button>
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
        isBusy={isBusy}
        hasCSV={hasCSV}
        hasMessages={hasMessages}
      />
    </div>
  );
});
