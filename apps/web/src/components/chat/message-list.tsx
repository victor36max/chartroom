"use client";

import { type UIMessage } from "ai";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
}

const toolThinkingLabels: Record<string, string> = {
  lookup_docs: "Looking up docs...",
  render_chart: "Rendering chart...",
};

function getStreamingToolLabel(messages: UIMessage[], fallback: string): string | null {
  // If the last message is from the user, the model hasn't started responding yet
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") return fallback;

  const lastAssistant = messages.findLast((m) => m.role === "assistant");
  if (!lastAssistant) return fallback;

  const hasText = lastAssistant.parts.some(
    (p) => p.type === "text" && p.text.trim().length > 0
  );
  if (hasText) return null;

  let lastToolName: string | null = null;
  for (const part of lastAssistant.parts) {
    if (part.type.startsWith("tool-")) {
      lastToolName = part.type.slice(5);
    }
  }
  return lastToolName ? (toolThinkingLabels[lastToolName] ?? fallback) : fallback;
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

  const isThinking = status === "submitted" || status === "streaming";
  const thinkingLabel = isThinking
    ? getStreamingToolLabel(messages, "Thinking...")
    : null;

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubbleGroup key={message.id} message={message} />
        ))}
        {thinkingLabel && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="animate-pulse">{thinkingLabel}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function MessageBubbleGroup({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const textParts = message.parts.filter((part) => part.type === "text");
  const hasText = textParts.some(
    (part) => part.type === "text" && part.text.trim().length > 0
  );

  if (!hasText) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {textParts.map((part, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {part.type === "text" ? part.text : null}
          </p>
        ))}
      </div>
    </div>
  );
}
