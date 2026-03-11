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
            <Button
              key={text}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onSuggestionClick(text)}
              className="rounded-full text-muted-foreground hover:text-foreground hover:border-foreground/30"
            >
              {text}
            </Button>
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
              : "Upload a CSV or Excel file to get started"
          }
          disabled={!hasCSV || isBusy}
          className="min-h-[36px] max-h-[120px] resize-none"
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
        <div className="mt-1 flex justify-start">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear chat
          </Button>
        </div>
      )}
    </div>
  );
}
