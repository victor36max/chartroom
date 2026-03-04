"use client";

import { useRef, useCallback, type FormEvent, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onStop: () => void;
  onClear: () => void;
  onFileSelected: (file: File) => void;
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
  onFileSelected,
  isBusy,
  hasCSV,
  hasMessages,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit(e as unknown as FormEvent);
      }
    },
    [onSubmit]
  );

  return (
    <div
      className="border-t p-3"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {!hasCSV && (
        <div className="mb-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-md border-2 border-dashed border-muted-foreground/25 p-3 text-sm text-muted-foreground hover:border-muted-foreground/50 transition-colors"
          >
            Drop a CSV file here or click to upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
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
      {hasCSV && (
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => replaceFileInputRef.current?.click()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Replace CSV
            <input
              ref={replaceFileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </button>
          {hasMessages && !isBusy && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
      )}
    </div>
  );
}
