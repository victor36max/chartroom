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
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkEditor } from "./mark-editor";
import { EncodingEditor } from "./encoding-editor";
import { LayerEditorCard } from "./layer-editor-card";
import { TransformEditor } from "./transform-editor";
import { getComputedFields } from "@/lib/chart/computed-fields";
import type { ColumnMeta, DatasetMap } from "@/types";

interface VisualSpecEditorProps {
  editorValue: string;
  onChange: (value: string) => void;
  columns: ColumnMeta[];
  datasets?: DatasetMap;
}

type SpecObj = Record<string, unknown>;

export function VisualSpecEditor({
  editorValue,
  onChange,
  columns,
  datasets,
}: VisualSpecEditorProps) {
  const spec: SpecObj | null = useMemo(() => {
    try {
      return JSON.parse(editorValue) as SpecObj;
    } catch {
      return null;
    }
  }, [editorValue]);

  // Compute fields produced by transforms (must be before early return)
  const computedFields = useMemo(
    () => spec ? getComputedFields(((spec.transform ?? []) as Record<string, unknown>[])) : [],
    [spec],
  );
  // Computed fields that don't shadow CSV columns (shown in "Computed" group)
  const newComputedFields = useMemo(() => {
    const csvNames = new Set(columns.map((c) => c.name));
    return computedFields.filter((c) => !csvNames.has(c.name));
  }, [columns, computedFields]);
  // CSV columns with overridden ones replaced by their computed version
  const effectiveColumns = useMemo(() => {
    const computedNames = new Map(computedFields.map((c) => [c.name, c]));
    return columns.map((c) => computedNames.get(c.name) ?? c);
  }, [columns, computedFields]);
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
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                className="h-7 text-xs"
                value={
                  typeof spec.title === "string"
                    ? spec.title
                    : typeof spec.title === "object" && spec.title !== null
                      ? ((spec.title as SpecObj).text as string) ?? ""
                      : ""
                }
                placeholder="Chart title"
                onChange={(e) =>
                  updateSpec((s) => {
                    const hasSubtitle =
                      typeof s.title === "object" && s.title !== null &&
                      !!(s.title as SpecObj).subtitle;
                    if (e.target.value) {
                      if (hasSubtitle) {
                        (s.title as SpecObj).text = e.target.value;
                      } else {
                        s.title = e.target.value;
                      }
                    } else {
                      if (hasSubtitle) {
                        delete (s.title as SpecObj).text;
                      } else {
                        delete s.title;
                      }
                    }
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Size</Label>
              <Input
                className="h-7 text-xs"
                type="number"
                placeholder="auto"
                value={
                  typeof spec.title === "object" && spec.title !== null
                    ? ((spec.title as SpecObj).fontSize as number) ?? ""
                    : ""
                }
                onChange={(e) =>
                  updateSpec((s) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    if (val !== undefined) {
                      if (typeof s.title === "string") {
                        s.title = { text: s.title, fontSize: val };
                      } else if (typeof s.title === "object" && s.title !== null) {
                        (s.title as SpecObj).fontSize = val;
                      } else {
                        s.title = { fontSize: val };
                      }
                    } else if (typeof s.title === "object" && s.title !== null) {
                      delete (s.title as SpecObj).fontSize;
                      const t = s.title as SpecObj;
                      const keys = Object.keys(t);
                      if (keys.length === 1 && keys[0] === "text") {
                        s.title = t.text as string;
                      } else if (keys.length === 0) {
                        delete s.title;
                      }
                    }
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Subtitle</Label>
              <Input
                className="h-7 text-xs"
                value={
                  typeof spec.title === "object" && spec.title !== null
                    ? ((spec.title as SpecObj).subtitle as string) ?? ""
                    : ""
                }
                placeholder="Chart subtitle"
                onChange={(e) =>
                  updateSpec((s) => {
                    if (e.target.value) {
                      if (typeof s.title === "string") {
                        s.title = { text: s.title, subtitle: e.target.value };
                      } else if (typeof s.title === "object" && s.title !== null) {
                        (s.title as SpecObj).subtitle = e.target.value;
                      } else {
                        s.title = { subtitle: e.target.value };
                      }
                    } else {
                      if (typeof s.title === "object" && s.title !== null) {
                        delete (s.title as SpecObj).subtitle;
                        const text = (s.title as SpecObj).text as string | undefined;
                        if (text) {
                          s.title = text;
                        } else {
                          delete s.title;
                        }
                      }
                    }
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Size</Label>
              <Input
                className="h-7 text-xs"
                type="number"
                placeholder="auto"
                value={
                  typeof spec.title === "object" && spec.title !== null
                    ? ((spec.title as SpecObj).subtitleFontSize as number) ?? ""
                    : ""
                }
                onChange={(e) =>
                  updateSpec((s) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    if (val !== undefined) {
                      if (typeof s.title === "string") {
                        s.title = { text: s.title, subtitleFontSize: val };
                      } else if (typeof s.title === "object" && s.title !== null) {
                        (s.title as SpecObj).subtitleFontSize = val;
                      } else {
                        s.title = { subtitleFontSize: val };
                      }
                    } else if (typeof s.title === "object" && s.title !== null) {
                      delete (s.title as SpecObj).subtitleFontSize;
                      const t = s.title as SpecObj;
                      const keys = Object.keys(t);
                      if (keys.length === 1 && keys[0] === "text") {
                        s.title = t.text as string;
                      } else if (keys.length === 0) {
                        delete s.title;
                      }
                    }
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Padding</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["top", "right", "bottom", "left"] as const).map((side) => (
                <Input
                  key={side}
                  className="h-7 text-xs"
                  type="number"
                  placeholder={side[0].toUpperCase() + side.slice(1)}
                  value={
                    typeof spec.padding === "object" && spec.padding !== null
                      ? ((spec.padding as Record<string, number>)[side] ?? "")
                      : typeof spec.padding === "number"
                        ? spec.padding
                        : ""
                  }
                  onChange={(e) =>
                    updateSpec((s) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      // Normalize current padding to object
                      const pad: Record<string, number> =
                        typeof s.padding === "number"
                          ? { top: s.padding, right: s.padding, bottom: s.padding, left: s.padding }
                          : typeof s.padding === "object" && s.padding !== null
                            ? { ...(s.padding as Record<string, number>) }
                            : {};
                      if (val !== undefined) {
                        pad[side] = val;
                      } else {
                        delete pad[side];
                      }
                      if (Object.keys(pad).length === 0) {
                        delete s.padding;
                      } else {
                        s.padding = pad;
                      }
                    })
                  }
                />
              ))}
            </div>
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
          {datasets && Object.keys(datasets).length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Select
                value={
                  (typeof spec.data === "object" && spec.data !== null
                    ? ((spec.data as Record<string, unknown>).url as string)
                    : "") || "__none__"
                }
                onValueChange={(v) =>
                  updateSpec((s) => {
                    if (v === "__none__") delete s.data;
                    else s.data = { url: v };
                  })
                }
              >
                <SelectTrigger size="sm" className="text-xs">
                  <SelectValue placeholder="dataset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs text-muted-foreground">— none —</SelectItem>
                  {Object.keys(datasets).map((name) => (
                    <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Mark — only for single-mark specs */}
      {!isLayered && (
        <AccordionItem value="mark">
          <AccordionTrigger className="text-xs font-medium py-2">
            Mark
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <MarkEditor spec={spec} onUpdate={updateSpec} />
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Transforms */}
      <AccordionItem value="transforms">
        <AccordionTrigger className="text-xs font-medium py-2">
          Transforms
          {Array.isArray(spec.transform) && (spec.transform as unknown[]).length > 0 && (
            <span className="ml-1 text-muted-foreground">
              ({(spec.transform as unknown[]).length})
            </span>
          )}
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <TransformEditor
            transforms={((spec.transform ?? []) as Record<string, unknown>[])}
            columns={columns}
            datasets={datasets}
            onChange={(transforms) =>
              updateSpec((s) => {
                if (transforms.length === 0) delete s.transform;
                else s.transform = transforms;
              })
            }
          />
        </AccordionContent>
      </AccordionItem>

      {/* Encoding — only for single-mark specs */}
      {!isLayered && (
        <AccordionItem value="encoding">
          <AccordionTrigger className="text-xs font-medium py-2">
            Encoding
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <EncodingEditor
              spec={spec}
              markType={
                typeof spec.mark === "string"
                  ? spec.mark
                  : typeof spec.mark === "object" && spec.mark !== null
                    ? ((spec.mark as SpecObj).type as string)
                    : undefined
              }
              columns={effectiveColumns}
              computedFields={newComputedFields}
              onUpdate={updateSpec}
            />
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
                computedFields={newComputedFields}
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
