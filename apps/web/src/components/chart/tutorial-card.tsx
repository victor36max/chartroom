"use client";

import { useState, type DragEvent, type ChangeEvent, useRef } from "react";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "chartroom-hide-tutorial";

interface TutorialStep {
  image: string;
  title: string;
  description: string;
}

const STEPS: TutorialStep[] = [
  {
    image: "/tutorial/step-1-upload.gif",
    title: "Upload your data",
    description:
      'Drop a CSV file or click "Try with sample data" to get started instantly.',
  },
  {
    image: "/tutorial/step-2-prompt.gif",
    title: "Describe your chart",
    description:
      "Tell the AI what you want in plain English — it generates a Vega-Lite chart for you.",
  },
  {
    image: "/tutorial/step-3-chart.gif",
    title: "Get a publication-ready chart",
    description:
      "Your chart appears instantly. Iterate with follow-up prompts to refine it.",
  },
  {
    image: "/tutorial/step-4-edit.gif",
    title: "Fine-tune and export",
    description:
      "Use the visual editor, switch themes, or export as PNG/SVG.",
  },
];

interface TutorialCardProps {
  onFilesSelected?: (files: File[]) => void;
}

function Dropzone({ onFilesSelected }: { onFilesSelected?: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      className="flex flex-col items-center justify-center h-full w-full gap-2 cursor-pointer"
      onClick={() => inputRef.current?.click()}
      onDrop={(e: DragEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const csvFiles = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".csv"));
        if (csvFiles.length > 0) onFilesSelected?.(csvFiles);
      }}
      onDragOver={(e: DragEvent<HTMLButtonElement>) => e.preventDefault()}
    >
      <Upload className="h-8 w-8 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">Drop CSV files here or click to upload</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Your data stays in your browser</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        multiple
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            onFilesSelected?.(Array.from(files));
            e.target.value = "";
          }
        }}
        className="hidden"
      />
    </button>
  );
}

const TUTORIAL_ENABLED = process.env.NEXT_PUBLIC_TUTORIAL_ENABLED === "true";

export function TutorialCard({ onFilesSelected }: TutorialCardProps) {
  const [hidden] = useState(() => {
    if (!TUTORIAL_ENABLED) return true;
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(hidden);

  // If user checked "don't show again", show only the dropzone
  if (hidden) {
    return <Dropzone onFilesSelected={onFilesSelected} />;
  }

  const isLastStep = step === STEPS.length;
  const totalSteps = STEPS.length + 1; // tutorial steps + dropzone

  const handleDontShowChange = (checked: boolean) => {
    setDontShow(checked);
    if (checked) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8">
      <div className="max-w-md w-full space-y-4">
        {isLastStep ? (
          /* Dropzone as last step */
          <div className="aspect-video w-full rounded-lg border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
            <Dropzone onFilesSelected={onFilesSelected} />
          </div>
        ) : (
          /* Tutorial image step */
          <div className="relative aspect-video w-full rounded-lg border bg-muted/30 overflow-hidden">
            <Image
              src={STEPS[step].image}
              alt={STEPS[step].title}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        {/* Text */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">
            {isLastStep ? "Ready to start" : STEPS[step].title}
          </p>
          <p className="text-xs text-muted-foreground">
            {isLastStep
              ? "Drop a CSV file here or use the chat panel to upload."
              : STEPS[step].description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-4 bg-foreground"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
            disabled={isLastStep}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Don't show again */}
        <div className="flex items-center justify-center">
          <Label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={dontShow}
              onCheckedChange={(checked) => handleDontShowChange(checked === true)}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-muted-foreground">Don&apos;t show this again</span>
          </Label>
        </div>
      </div>
    </div>
  );
}
