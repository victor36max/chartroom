"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { ColumnMeta } from "@/types";

type SpecObj = Record<string, unknown>;

const MARK_TYPES = [
  "bar", "line", "area", "point", "rect", "rule",
  "text", "tick", "arc", "boxplot", "circle", "square", "trail",
];

const ENCODING_TYPES = [
  { value: "quantitative", label: "Q" },
  { value: "nominal", label: "N" },
  { value: "ordinal", label: "O" },
  { value: "temporal", label: "T" },
];

const AGGREGATE_OPTIONS = [
  { value: "__none__", label: "—" },
  { value: "sum", label: "sum" },
  { value: "mean", label: "mean" },
  { value: "count", label: "count" },
  { value: "min", label: "min" },
  { value: "max", label: "max" },
];

const CHANNELS = ["x", "y", "color", "opacity", "size", "text"] as const;

const NONE_VALUE = "__none__";

interface LayerEditorCardProps {
  layer: SpecObj;
  index: number;
  columns: ColumnMeta[];
  onChange: (layer: SpecObj) => void;
  onRemove: () => void;
}

export function LayerEditorCard({ layer, index, columns, onChange, onRemove }: LayerEditorCardProps) {
  const markType = typeof layer.mark === "string"
    ? layer.mark
    : typeof layer.mark === "object" && layer.mark !== null
      ? (layer.mark as SpecObj).type as string
      : "";

  const encoding = (layer.encoding ?? {}) as SpecObj;

  function update(updater: (l: SpecObj) => void) {
    const clone = structuredClone(layer);
    updater(clone);
    onChange(clone);
  }

  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Layer {index + 1}
        </span>
        <button
          onClick={onRemove}
          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Remove layer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Mark type */}
      <div className="space-y-1">
        <Label className="text-xs">Mark</Label>
        <Select
          value={markType}
          onValueChange={(v) =>
            update((l) => {
              if (typeof l.mark === "object" && l.mark !== null) {
                (l.mark as SpecObj).type = v;
              } else {
                l.mark = v;
              }
            })
          }
        >
          <SelectTrigger size="sm" className="w-full text-xs font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MARK_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-xs font-mono">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Encoding channels */}
      {CHANNELS.map((channel) => {
        const channelSpec = encoding[channel] as SpecObj | undefined;
        const field = channelSpec?.field as string | undefined;
        const type = channelSpec?.type as string | undefined;
        const aggregate = channelSpec?.aggregate as string | undefined;

        return (
          <div key={channel} className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">{channel}</Label>
            <div className="grid grid-cols-3 gap-1">
              <Select
                value={field ?? NONE_VALUE}
                onValueChange={(v) =>
                  update((l) => {
                    const enc = (l.encoding ?? {}) as SpecObj;
                    if (v === NONE_VALUE) {
                      delete enc[channel];
                    } else {
                      const existing = (enc[channel] ?? {}) as SpecObj;
                      existing.field = v;
                      if (!existing.type) {
                        const col = columns.find((c) => c.name === v);
                        if (col) {
                          existing.type =
                            col.type === "number" ? "quantitative" :
                            col.type === "date" ? "temporal" : "nominal";
                        }
                      }
                      enc[channel] = existing;
                    }
                    l.encoding = enc;
                  })
                }
              >
                <SelectTrigger size="sm" className="text-xs h-6">
                  <SelectValue placeholder="field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">—</SelectItem>
                  {columns.map((c) => (
                    <SelectItem key={c.name} value={c.name} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={type ?? NONE_VALUE}
                onValueChange={(v) =>
                  update((l) => {
                    const enc = (l.encoding ?? {}) as SpecObj;
                    const existing = (enc[channel] ?? {}) as SpecObj;
                    if (v === NONE_VALUE) delete existing.type;
                    else existing.type = v;
                    enc[channel] = existing;
                    l.encoding = enc;
                  })
                }
              >
                <SelectTrigger size="sm" className="text-xs h-6">
                  <SelectValue placeholder="type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">auto</SelectItem>
                  {ENCODING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={aggregate ?? NONE_VALUE}
                onValueChange={(v) =>
                  update((l) => {
                    const enc = (l.encoding ?? {}) as SpecObj;
                    const existing = (enc[channel] ?? {}) as SpecObj;
                    if (v === NONE_VALUE) delete existing.aggregate;
                    else existing.aggregate = v;
                    enc[channel] = existing;
                    l.encoding = enc;
                  })
                }
              >
                <SelectTrigger size="sm" className="text-xs h-6">
                  <SelectValue placeholder="agg" />
                </SelectTrigger>
                <SelectContent>
                  {AGGREGATE_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
