"use client";

import { useState, useEffect, useCallback, type DragEvent, type ChangeEvent, useRef } from "react";
import { Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

const STORAGE_KEY = "chartroom-hide-tutorial";

interface TutorialStep {
  media: string;
  title: string;
  description: string;
}

const STEPS: TutorialStep[] = [
  {
    media: "/tutorial/step-1-upload.mp4",
    title: "Upload your data",
    description:
      'Drop a CSV file or click "Try with sample data" to get started instantly.',
  },
  {
    media: "/tutorial/step-2-prompt.mp4",
    title: "Describe your chart",
    description:
      "Tell the AI what you want in plain English — it generates a Vega-Lite chart for you.",
  },
  {
    media: "/tutorial/step-3-chart.mp4",
    title: "Get a publication-ready chart",
    description:
      "Your chart appears instantly. Iterate with follow-up prompts to refine it.",
  },
  {
    media: "/tutorial/step-4-edit.mp4",
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

const totalSlides = STEPS.length + 1; // tutorial steps + dropzone

export function TutorialCard({ onFilesSelected }: TutorialCardProps) {
  const [hidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [current, setCurrent] = useState(0);
  const [dontShow, setDontShow] = useState(hidden);
  const [api, setApi] = useState<CarouselApi>();
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const setVideoRef = useCallback((index: number, el: HTMLVideoElement | null) => {
    if (el) videoRefs.current.set(index, el);
    else videoRefs.current.delete(index);
  }, []);

  // Sync carousel selection to state + control video playback
  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const selected = api.selectedScrollSnap();
      setCurrent(selected);

      // Reset and play the active video, pause others
      videoRefs.current.forEach((video, index) => {
        if (index === selected) {
          video.currentTime = 0;
          video.play();
        } else {
          video.pause();
        }
      });
    };

    onSelect(); // sync on mount
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  if (hidden) {
    return <Dropzone onFilesSelected={onFilesSelected} />;
  }

  const isLastSlide = current === STEPS.length;

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
      <div className="max-w-xl w-full space-y-4">
        <Carousel setApi={setApi} opts={{ loop: false }}>
          <CarouselContent>
            {STEPS.map((s, i) => (
              <CarouselItem key={s.media}>
                <div className="relative aspect-4/3 w-full rounded-lg border bg-muted/30 overflow-hidden">
                  <video
                    ref={(el) => setVideoRef(i, el)}
                    src={s.media}
                    preload="auto"
                    autoPlay={i === 0}
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
            {/* Dropzone as last slide */}
            <CarouselItem>
              <div className="aspect-4/3 w-full rounded-lg border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                <Dropzone onFilesSelected={onFilesSelected} />
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious className="left-2 lg:-left-12" />
          <CarouselNext className="right-2 lg:-right-12" />
        </Carousel>

        {/* Text */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">
            {isLastSlide ? "Ready to start" : STEPS[current].title}
          </p>
          <p className="text-xs text-muted-foreground">
            {isLastSlide
              ? "Drop a CSV file here or use the chat panel to upload."
              : STEPS[current].description}
          </p>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current
                  ? "w-4 bg-foreground"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
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
