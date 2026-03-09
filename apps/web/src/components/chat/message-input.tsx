"use client";

import { useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTIONS = [
  "Surprise me with a chart",
  "What patterns do you see?",
  "Visualize the key trends",
  "Summarize this dataset",
];

interface MessageInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onStop: () => void;
  onClear: () => void;
  onSuggestionClick: (text: string) => void;
  isBusy: boolean;
  hasCSV: boolean;
  hasMessages: boolean;
}

export function MessageInput({
  input,
  onInputChange,
  onSubmit,
  onStop,
  onClear,
  onSuggestionClick,
  isBusy,
  hasCSV,
  hasMessages,
}: MessageInputProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit(e as unknown as FormEvent);
      }
    },
    [onSubmit]
  );

  const showSuggestions = hasCSV && !hasMessages && !isBusy;

  return (
    <div className="border-t p-3">
      {showSuggestions && (
        <div className="mb-2 flex flex-wrap gap-2 animate-in fade-in duration-300">
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onSuggestionClick(text)}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={onSubmit} className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasCSV
              ? "Describe the chart you want..."
              : "Upload a CSV to get started"
          }
          disabled={!hasCSV || isBusy}
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
        />
        {isBusy ? (
          <Button
            type="button"
            onClick={onStop}
            size="sm"
            variant="destructive"
            className="self-end"
          >
            ■ Stop
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!hasCSV || !input.trim()}
            size="sm"
            className="self-end"
          >
            Send
          </Button>
        )}
      </form>
      {hasCSV && hasMessages && !isBusy && (
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear chat
          </button>
        </div>
      )}
    </div>
  );
}
