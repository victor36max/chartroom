"use client";

import { type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface MessageListProps {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  onLoadSampleData?: () => void;
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


export function MessageList({ messages, status, onLoadSampleData }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-6 max-w-sm">
          <div>
            <p className="text-lg font-medium">Welcome to Chartroom</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload one or more CSVs and describe the chart you want.
            </p>
          </div>
          <div className="space-y-3 text-sm text-left">
            <div className="flex gap-3 items-start">
              <span className="text-base leading-5">💬</span>
              <div>
                <p className="font-medium">Natural language to charts</p>
                <p className="text-muted-foreground text-xs">Describe what you want in plain English — get publication-ready Vega-Lite charts.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-base leading-5">🔒</span>
              <div>
                <p className="font-medium">Your data stays in your browser</p>
                <p className="text-muted-foreground text-xs">CSV data never leaves your machine. Only column metadata is sent to the AI.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-base leading-5">🎨</span>
              <div>
                <p className="font-medium">Edit visually or with code</p>
                <p className="text-muted-foreground text-xs">Fine-tune charts with a visual editor, or drop into JSON for full control.</p>
              </div>
            </div>
          </div>
          {onLoadSampleData && <SampleDataButton onClick={onLoadSampleData} />}
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

function SampleDataButton({ onClick }: { onClick: () => void }) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        setLoading(true);
        onClick();
      }}
      disabled={loading}
      className="rounded-full text-muted-foreground hover:text-foreground hover:border-foreground/30"
    >
      {loading ? "Loading..." : "Try with sample data"}
    </Button>
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
        {textParts.map((part, i) =>
          part.type === "text" ? (
            isUser ? (
              <p key={i} className="whitespace-pre-wrap">{part.text}</p>
            ) : (
              <div key={i} className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2">
                <ReactMarkdown>{part.text}</ReactMarkdown>
              </div>
            )
          ) : null
        )}
      </div>
    </div>
  );
}
