"use client";

import { type UIMessage } from "ai";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
}

export function MessageList({ messages, status }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">Welcome to Firechart</p>
          <p className="text-sm mt-1">
            Upload a CSV file and describe the chart you want to create.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <p key={i} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }
          if (part.type.startsWith("tool-")) {
            const toolName = part.type.slice(5);
            const state = (part as unknown as { state: string }).state;
            return (
              <ToolCallStatus
                key={i}
                toolName={toolName}
                state={state}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function ToolCallStatus({
  toolName,
  state,
}: {
  toolName: string;
  state: string;
}) {
  const labels: Record<string, string> = {
    render_chart: "Chart",
    analyze_data: "Analysis",
  };

  const stateLabels: Record<string, string> = {
    call: "Running...",
    "partial-call": "Preparing...",
    result: "Done",
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <Badge variant="secondary" className="text-xs">
        {labels[toolName] ?? toolName}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {state === "call" && (
          <span className="animate-pulse">{stateLabels[state]}</span>
        )}
        {state === "result" && stateLabels[state]}
        {state === "partial-call" && (
          <span className="animate-pulse">{stateLabels[state]}</span>
        )}
      </span>
    </div>
  );
}
