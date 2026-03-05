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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkEditorCard } from "./mark-editor-card";
import { Plus } from "lucide-react";
import type { ChartSpec, ColumnMeta } from "@/types";

interface VisualSpecEditorProps {
  editorValue: string;
  onChange: (value: string) => void;
  columns: ColumnMeta[];
}

const COLOR_SCHEMES = [
  "tableau10",
  "observable10",
  "category10",
  "accent",
  "dark2",
  "paired",
  "pastel1",
  "pastel2",
  "set1",
  "set2",
  "set3",
];

export function VisualSpecEditor({
  editorValue,
  onChange,
  columns,
}: VisualSpecEditorProps) {
  const spec: ChartSpec | null = useMemo(() => {
    try {
      return JSON.parse(editorValue) as ChartSpec;
    } catch {
      return null;
    }
  }, [editorValue]);

  const updateSpec = useCallback(
    (updater: (s: ChartSpec) => void) => {
      if (!spec) return;
      const clone = structuredClone(spec) as ChartSpec;
      updater(clone);
      // Clean up empty objects for axes/color to keep JSON tidy
      for (const key of ["x", "y", "fx", "color"] as const) {
        const val = clone[key];
        if (val && typeof val === "object" && Object.keys(val).length === 0) {
          delete clone[key];
        }
      }
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

  return (
    <Accordion
      type="multiple"
      defaultValue={["general", "colors", "marks"]}
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
              value={spec.title ?? ""}
              placeholder="Chart title"
              onChange={(e) =>
                updateSpec((s) => {
                  if (e.target.value) s.title = e.target.value;
                  else delete s.title;
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subtitle</Label>
            <Input
              className="h-7 text-xs"
              value={spec.subtitle ?? ""}
              placeholder="Chart subtitle"
              onChange={(e) =>
                updateSpec((s) => {
                  if (e.target.value) s.subtitle = e.target.value;
                  else delete s.subtitle;
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
                value={spec.width ?? ""}
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
                value={spec.height ?? ""}
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

      {/* Colors */}
      <AccordionItem value="colors">
        <AccordionTrigger className="text-xs font-medium py-2">
          Colors
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-3">
          <div className="space-y-1">
            <Label className="text-xs">Color scheme</Label>
            <Select
              value={
                ((spec.color as Record<string, unknown>)?.scheme as string) ??
                "tableau10"
              }
              onValueChange={(v) =>
                updateSpec((s) => {
                  s.color = { ...(s.color as Record<string, unknown> ?? {}), scheme: v };
                })
              }
            >
              <SelectTrigger size="sm" className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_SCHEMES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="color-legend"
              checked={
                !!((spec.color as Record<string, unknown>)?.legend)
              }
              onChange={(e) =>
                updateSpec((s) => {
                  const color = { ...(s.color as Record<string, unknown> ?? {}) };
                  if (e.target.checked) color.legend = true;
                  else delete color.legend;
                  s.color = color;
                })
              }
              className="rounded border-input"
            />
            <Label htmlFor="color-legend" className="text-xs cursor-pointer">
              Show legend
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* X Axis */}
      <AccordionItem value="x-axis">
        <AccordionTrigger className="text-xs font-medium py-2">
          X Axis
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-3">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              className="h-7 text-xs"
              value={((spec.x as Record<string, unknown>)?.label as string) ?? ""}
              placeholder="Axis label"
              onChange={(e) =>
                updateSpec((s) => {
                  const x = { ...(s.x as Record<string, unknown> ?? {}) };
                  if (e.target.value) x.label = e.target.value;
                  else delete x.label;
                  s.x = x;
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tick format</Label>
            <Input
              className="h-7 text-xs font-mono"
              placeholder="e.g. ,.0f"
              value={
                ((spec.x as Record<string, unknown>)?.tickFormat as string) ?? ""
              }
              onChange={(e) =>
                updateSpec((s) => {
                  const x = { ...(s.x as Record<string, unknown> ?? {}) };
                  if (e.target.value) x.tickFormat = e.target.value;
                  else delete x.tickFormat;
                  s.x = x;
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tick rotation</Label>
            <Select
              value={String((spec.x as Record<string, unknown>)?.tickRotate ?? "0")}
              onValueChange={(v) =>
                updateSpec((s) => {
                  const x = { ...(s.x as Record<string, unknown> ?? {}) };
                  if (v === "0") delete x.tickRotate;
                  else x.tickRotate = Number(v);
                  s.x = x;
                })
              }
            >
              <SelectTrigger size="sm" className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["0", "-45", "-90", "45", "90"].map((deg) => (
                  <SelectItem key={deg} value={deg} className="text-xs">
                    {deg === "0" ? "None" : `${deg}\u00B0`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Y Axis */}
      <AccordionItem value="y-axis">
        <AccordionTrigger className="text-xs font-medium py-2">
          Y Axis
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-3">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              className="h-7 text-xs"
              value={((spec.y as Record<string, unknown>)?.label as string) ?? ""}
              placeholder="Axis label"
              onChange={(e) =>
                updateSpec((s) => {
                  const y = { ...(s.y as Record<string, unknown> ?? {}) };
                  if (e.target.value) y.label = e.target.value;
                  else delete y.label;
                  s.y = y;
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tick format</Label>
            <Input
              className="h-7 text-xs font-mono"
              placeholder="e.g. ,.0f"
              value={
                ((spec.y as Record<string, unknown>)?.tickFormat as string) ?? ""
              }
              onChange={(e) =>
                updateSpec((s) => {
                  const y = { ...(s.y as Record<string, unknown> ?? {}) };
                  if (e.target.value) y.tickFormat = e.target.value;
                  else delete y.tickFormat;
                  s.y = y;
                })
              }
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Facet X — only shown when fx is present */}
      {spec.fx && (
        <AccordionItem value="fx-axis">
          <AccordionTrigger className="text-xs font-medium py-2">
            Facet X
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                className="h-7 text-xs"
                value={((spec.fx as Record<string, unknown>)?.label as string) ?? ""}
                placeholder="Facet label"
                onChange={(e) =>
                  updateSpec((s) => {
                    const fx = { ...(s.fx as Record<string, unknown> ?? {}) };
                    if (e.target.value) fx.label = e.target.value;
                    else delete fx.label;
                    s.fx = fx;
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tick format</Label>
              <Input
                className="h-7 text-xs font-mono"
                placeholder="e.g. ,.0f"
                value={
                  ((spec.fx as Record<string, unknown>)?.tickFormat as string) ?? ""
                }
                onChange={(e) =>
                  updateSpec((s) => {
                    const fx = { ...(s.fx as Record<string, unknown> ?? {}) };
                    if (e.target.value) fx.tickFormat = e.target.value;
                    else delete fx.tickFormat;
                    s.fx = fx;
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tick rotation</Label>
              <Select
                value={String((spec.fx as Record<string, unknown>)?.tickRotate ?? "0")}
                onValueChange={(v) =>
                  updateSpec((s) => {
                    const fx = { ...(s.fx as Record<string, unknown> ?? {}) };
                    if (v === "0") delete fx.tickRotate;
                    else fx.tickRotate = Number(v);
                    s.fx = fx;
                  })
                }
              >
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["0", "-45", "-90", "45", "90"].map((deg) => (
                    <SelectItem key={deg} value={deg} className="text-xs">
                      {deg === "0" ? "None" : `${deg}\u00B0`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Marks */}
      <AccordionItem value="marks">
        <AccordionTrigger className="text-xs font-medium py-2">
          Marks
          {spec.marks.length > 0 && (
            <span className="ml-1 text-muted-foreground">
              ({spec.marks.length})
            </span>
          )}
        </AccordionTrigger>
        <AccordionContent className="space-y-2 pb-3">
          {spec.marks.map((mark, i) => (
            <MarkEditorCard
              key={i}
              mark={mark}
              index={i}
              columns={columns}
              onChange={(updated) =>
                updateSpec((s) => {
                  s.marks[i] = updated;
                })
              }
              onRemove={() =>
                updateSpec((s) => {
                  s.marks.splice(i, 1);
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
                s.marks.push({ type: "barY", data: "csv", options: {} });
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" /> Add mark
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
