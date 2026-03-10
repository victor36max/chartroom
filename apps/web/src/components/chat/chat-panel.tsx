"use client";

import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef, type FormEvent, type ChangeEvent } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { toast } from "sonner";
import { parseCSV, datasetsToContext } from "@/lib/csv/parser";
import { captureChart } from "@/components/chart/chart-capture";
import { validateSpec } from "@/lib/chart/validate-spec";
import type { ParsedCSV, DatasetMap, ChartSpec } from "@/types";
import { getModelTierLabels, type ModelTier } from "@/lib/agent/models";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Select as SelectPrimitive } from "radix-ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAuthEnabled } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";

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
  onStatusChange?: (status: string) => void;
  onLoadSampleData?: () => void;
}

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(function ChatPanel(
  { datasets, onCSVParsed, onDatasetRemoved, onChartSpec, tier, onTierChange, onStatusChange, onLoadSampleData },
  ref
) {
  const { user, balance, openLogin, refreshBalance } = useAuth();
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
    onError(error) {
      if (error.message?.includes("402")) {
        toast.error("No credits remaining. Add credits to continue.");
      } else {
        toast.error("Something went wrong — please try again.");
      }
    },
    // eslint-disable-next-line react-hooks/refs -- body() is only called on send, not during render
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => {
        const ds = datasetsRef.current;
        const dataContext = datasetsToContext(ds);
        if (!dataContext) return { tier };
        return { tier, dataContext };
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

  useEffect(() => {
    onStatusChange?.(status);
    // Refresh balance after assistant chat response completes
    if (status === "ready" && user && messages.length > 0 && messages[messages.length - 1].role === "assistant") {
      refreshBalance();
    }
  }, [status, onStatusChange, user, refreshBalance]);

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
      if (isAuthEnabled() && balance !== null && balance <= 0) return;
      autoSendCountRef.current = 0;
      sendMessage({ text: input });
      setInput("");
    },
    [input, sendMessage, balance]
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (isAuthEnabled() && !user) {
        openLogin();
        return;
      }
      setCsvError(null);
      for (const file of files) {
        const result = await parseCSV(file);
        if (result.errors.length > 0 && result.data.length === 0) {
          setCsvError("Failed to parse CSV: " + result.errors[0]);
          continue;
        }
        const name = file.name;
        onCSVParsed(name, result);
      }
    },
    [onCSVParsed, user, openLogin]
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

  const modelTierLabels = getModelTierLabels();

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
                <SelectPrimitive.ItemText>{modelTierLabels[t].label}</SelectPrimitive.ItemText>
                <span className="text-muted-foreground text-xs">{modelTierLabels[t].subtitle}</span>
              </SelectPrimitive.Item>
            ))}
          </SelectContent>
        </Select>
        {hasCSV ? (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto px-0 hover:bg-transparent">
                  <Badge variant="secondary" className="text-xs hover:bg-secondary/80 transition-colors">
                    {datasetNames.length} dataset{datasetNames.length > 1 ? "s" : ""} ▾
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="space-y-1">
                  {datasetNames.map((name) => (
                    <div key={name} className="flex items-center justify-between px-2 py-1 rounded text-sm">
                      <span className="truncate">{name}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onDatasetRemoved(name)}
                        className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => headerFileInputRef.current?.click()}
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add CSV
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">
              {totalRows} rows
            </span>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => headerFileInputRef.current?.click()}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add CSV
          </Button>
        )}
      </div>
      <MessageList messages={messages} status={status} onLoadSampleData={!hasCSV ? onLoadSampleData : undefined} />
      {csvError && (
        <p className="px-3 py-1 text-xs text-destructive border-t">{csvError}</p>
      )}
      {isAuthEnabled() && user && balance !== null && balance <= 0 && (
        <p className="px-3 py-1 text-xs text-muted-foreground border-t">
          No credits remaining. Add credits to continue.
        </p>
      )}
      <MessageInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onStop={handleStop}
        onClear={handleClear}
        onSuggestionClick={(text) => {
          if (isAuthEnabled() && balance !== null && balance <= 0) return;
          autoSendCountRef.current = 0;
          sendMessage({ text });
        }}
        isBusy={isBusy}
        hasCSV={hasCSV}
        hasMessages={hasMessages}
      />
    </div>
  );
});
