"use client";

import { useMemo, useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LayerEditorCard } from "./layer-editor-card";
import type { ColumnMeta } from "@/types";

interface VisualSpecEditorProps {
  editorValue: string;
  onChange: (value: string) => void;
  columns: ColumnMeta[];
}

type SpecObj = Record<string, unknown>;

const MARK_TYPES = [
  "bar", "line", "area", "point", "rect", "rule",
  "text", "tick", "arc", "boxplot", "circle", "square", "trail",
];

const ENCODING_TYPES = [
  { value: "quantitative", label: "Quantitative" },
  { value: "nominal", label: "Nominal" },
  { value: "ordinal", label: "Ordinal" },
  { value: "temporal", label: "Temporal" },
];

const AGGREGATE_OPTIONS = [
  { value: "__none__", label: "None" },
  { value: "sum", label: "Sum" },
  { value: "mean", label: "Mean" },
  { value: "count", label: "Count" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "median", label: "Median" },
];

const ENCODING_CHANNELS = ["x", "y", "color", "size", "shape", "opacity", "theta", "radius", "text", "detail", "order"] as const;

const NONE_VALUE = "__none__";

export function VisualSpecEditor({
  editorValue,
  onChange,
  columns,
}: VisualSpecEditorProps) {
  const spec: SpecObj | null = useMemo(() => {
    try {
      return JSON.parse(editorValue) as SpecObj;
    } catch {
      return null;
    }
  }, [editorValue]);

  const updateSpec = useCallback(
    (updater: (s: SpecObj) => void) => {
      if (!spec) return;
      const clone = structuredClone(spec);
      updater(clone);
      onChange(JSON.stringify(clone, null, 2));
    },
    [spec, onChange],
  );

  if (!spec) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        JSON is invalid — fix it in the JSON tab to edit visually.
      </div>
    );
  }

  // Determine if this is a layered spec
  const isLayered = Array.isArray(spec.layer);

  // Get mark type from spec
  const markType = typeof spec.mark === "string"
    ? spec.mark
    : typeof spec.mark === "object" && spec.mark !== null
      ? (spec.mark as SpecObj).type as string
      : "";

  // Get encoding object
  const encoding = (spec.encoding ?? {}) as SpecObj;

  return (
    <Accordion
      type="multiple"
      defaultValue={["general", "mark", "encoding"]}
      className="px-3 py-2"
    >
      {/* General */}
      <AccordionItem value="general">
        <AccordionTrigger className="text-xs font-medium py-2">
          General
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-3">
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input
              className="h-7 text-xs"
              value={(spec.title as string) ?? ""}
              placeholder="Chart title"
              onChange={(e) =>
                updateSpec((s) => {
                  if (e.target.value) s.title = e.target.value;
                  else delete s.title;
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Width</Label>
              <Input
                className="h-7 text-xs"
                type="number"
                placeholder="auto"
                value={(spec.width as number) ?? ""}
                onChange={(e) =>
                  updateSpec((s) => {
                    if (e.target.value) s.width = Number(e.target.value);
                    else delete s.width;
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Height</Label>
              <Input
                className="h-7 text-xs"
                type="number"
                placeholder="auto"
                value={(spec.height as number) ?? ""}
                onChange={(e) =>
                  updateSpec((s) => {
                    if (e.target.value) s.height = Number(e.target.value);
                    else delete s.height;
                  })
                }
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Mark — only for single-mark specs */}
      {!isLayered && (
        <AccordionItem value="mark">
          <AccordionTrigger className="text-xs font-medium py-2">
            Mark
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={markType}
                onValueChange={(v) =>
                  updateSpec((s) => {
                    if (typeof s.mark === "object" && s.mark !== null) {
                      (s.mark as SpecObj).type = v;
                    } else {
                      s.mark = v;
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mark-tooltip"
                checked={
                  typeof spec.mark === "object" && spec.mark !== null
                    ? !!(spec.mark as SpecObj).tooltip
                    : false
                }
                onChange={(e) =>
                  updateSpec((s) => {
                    if (typeof s.mark !== "object" || s.mark === null) {
                      s.mark = { type: s.mark as string };
                    }
                    if (e.target.checked) {
                      (s.mark as SpecObj).tooltip = true;
                    } else {
                      delete (s.mark as SpecObj).tooltip;
                      // Simplify back to string if only type remains
                      const keys = Object.keys(s.mark as SpecObj);
                      if (keys.length === 1 && keys[0] === "type") {
                        s.mark = (s.mark as SpecObj).type as string;
                      }
                    }
                  })
                }
                className="rounded border-input"
              />
              <Label htmlFor="mark-tooltip" className="text-xs cursor-pointer">
                Enable tooltips
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Encoding — only for single-mark specs */}
      {!isLayered && (
        <AccordionItem value="encoding">
          <AccordionTrigger className="text-xs font-medium py-2">
            Encoding
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            {ENCODING_CHANNELS.map((channel) => {
              const channelSpec = encoding[channel] as SpecObj | undefined;
              const field = channelSpec?.field as string | undefined;
              const type = channelSpec?.type as string | undefined;
              const aggregate = channelSpec?.aggregate as string | undefined;

              return (
                <div key={channel} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">{channel}</Label>
                    {channelSpec && (
                      <button
                        onClick={() =>
                          updateSpec((s) => {
                            const enc = (s.encoding ?? {}) as SpecObj;
                            delete enc[channel];
                            s.encoding = enc;
                          })
                        }
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Field */}
                    <Select
                      value={field ?? NONE_VALUE}
                      onValueChange={(v) =>
                        updateSpec((s) => {
                          const enc = (s.encoding ?? {}) as SpecObj;
                          if (v === NONE_VALUE) {
                            delete enc[channel];
                          } else {
                            const existing = (enc[channel] ?? {}) as SpecObj;
                            existing.field = v;
                            // Auto-detect type from column metadata
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
                          s.encoding = enc;
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="text-xs">
                        <SelectValue placeholder="field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">
                          — none —
                        </SelectItem>
                        {columns.map((c) => (
                          <SelectItem key={c.name} value={c.name} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Type */}
                    <Select
                      value={type ?? NONE_VALUE}
                      onValueChange={(v) =>
                        updateSpec((s) => {
                          const enc = (s.encoding ?? {}) as SpecObj;
                          const existing = (enc[channel] ?? {}) as SpecObj;
                          if (v === NONE_VALUE) delete existing.type;
                          else existing.type = v;
                          enc[channel] = existing;
                          s.encoding = enc;
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="text-xs">
                        <SelectValue placeholder="type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">
                          auto
                        </SelectItem>
                        {ENCODING_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Aggregate */}
                    <Select
                      value={aggregate ?? NONE_VALUE}
                      onValueChange={(v) =>
                        updateSpec((s) => {
                          const enc = (s.encoding ?? {}) as SpecObj;
                          const existing = (enc[channel] ?? {}) as SpecObj;
                          if (v === NONE_VALUE) delete existing.aggregate;
                          else existing.aggregate = v;
                          enc[channel] = existing;
                          s.encoding = enc;
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="text-xs">
                        <SelectValue placeholder="agg" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGGREGATE_OPTIONS.map((a) => (
                          <SelectItem key={a.value} value={a.value} className="text-xs">
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Layers — shown for layered specs */}
      {isLayered && (
        <AccordionItem value="layers">
          <AccordionTrigger className="text-xs font-medium py-2">
            Layers
            <span className="ml-1 text-muted-foreground">
              ({(spec.layer as SpecObj[]).length})
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pb-3">
            {(spec.layer as SpecObj[]).map((layer, i) => (
              <LayerEditorCard
                key={i}
                layer={layer}
                index={i}
                columns={columns}
                onChange={(updated) =>
                  updateSpec((s) => {
                    (s.layer as SpecObj[])[i] = updated;
                  })
                }
                onRemove={() =>
                  updateSpec((s) => {
                    const layers = s.layer as SpecObj[];
                    layers.splice(i, 1);
                    // Convert back to single spec if only 1 layer remains
                    if (layers.length === 1) {
                      const single = layers[0];
                      delete s.layer;
                      Object.assign(s, single);
                    }
                  })
                }
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() =>
                updateSpec((s) => {
                  (s.layer as SpecObj[]).push({ mark: "point", encoding: {} });
                })
              }
            >
              <Plus className="h-3 w-3 mr-1" /> Add layer
            </Button>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
