"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import type { ColumnMeta } from "@/types";

type SpecObj = Record<string, unknown>;

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

type EncodingChannel = (typeof ENCODING_CHANNELS)[number];

const CHANNELS_BY_MARK: Record<string, readonly EncodingChannel[]> = {
  bar:     ["x", "y", "color", "opacity", "detail", "order"],
  line:    ["x", "y", "color", "opacity", "detail", "order"],
  area:    ["x", "y", "color", "opacity", "detail", "order"],
  point:   ["x", "y", "color", "size", "shape", "opacity", "detail", "order"],
  rect:    ["x", "y", "color", "opacity"],
  rule:    ["x", "y", "color", "opacity"],
  text:    ["x", "y", "color", "size", "opacity", "text", "detail", "order"],
  tick:    ["x", "y", "color", "opacity", "detail"],
  arc:     ["theta", "radius", "color", "opacity", "detail", "order"],
  boxplot: ["x", "y", "color", "size", "opacity"],
  circle:  ["x", "y", "color", "size", "opacity", "detail", "order"],
  square:  ["x", "y", "color", "size", "opacity", "detail", "order"],
  trail:   ["x", "y", "color", "size", "opacity", "detail", "order"],
};

const AXIS_CHANNELS = new Set(["x", "y"]);
const LEGEND_CHANNELS = new Set(["color", "size", "shape", "opacity"]);

const NONE_VALUE = "__none__";

interface EncodingEditorProps {
  spec: SpecObj;
  markType?: string;
  columns: ColumnMeta[];
  computedFields?: ColumnMeta[];
  onUpdate: (updater: (s: SpecObj) => void) => void;
}

export function EncodingEditor({ spec, markType, columns, computedFields = [], onUpdate }: EncodingEditorProps) {
  const allColumns = [...columns, ...computedFields];
  const encoding = (spec.encoding ?? {}) as SpecObj;
  const [expandedCustomize, setExpandedCustomize] = useState<Set<string>>(new Set());

  const supportedChannels = markType && CHANNELS_BY_MARK[markType]
    ? CHANNELS_BY_MARK[markType]
    : ENCODING_CHANNELS;
  const supportedSet = new Set<string>(supportedChannels);
  // Show supported channels + any that already have data (prevent hidden data loss)
  const visibleChannels = ENCODING_CHANNELS.filter(
    (ch) => supportedSet.has(ch) || encoding[ch] != null,
  );

  // Split into assigned and unassigned channels
  const assignedChannels = visibleChannels.filter((ch) => encoding[ch] != null);
  const unassignedChannels = visibleChannels.filter((ch) => encoding[ch] == null);

  const toggleCustomize = (channel: string) => {
    setExpandedCustomize((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
  };

  const renderFieldSelect = (channel: EncodingChannel, field: string | undefined) => (
    <Select
      value={field ?? NONE_VALUE}
      onValueChange={(v) =>
        onUpdate((s) => {
          const enc = (s.encoding ?? {}) as SpecObj;
          if (v === NONE_VALUE) {
            delete enc[channel];
          } else {
            const existing = (enc[channel] ?? {}) as SpecObj;
            existing.field = v;
            if (!existing.type) {
              const col = allColumns.find((c) => c.name === v);
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
        {computedFields.length > 0 ? (
          <>
            <SelectGroup>
              <SelectLabel className="text-[10px]">CSV columns</SelectLabel>
              {columns.map((c) => (
                <SelectItem key={c.name} value={c.name} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-[10px]">Computed</SelectLabel>
              {computedFields.map((c) => (
                <SelectItem key={c.name} value={c.name} className="text-xs italic">
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        ) : (
          columns.map((c) => (
            <SelectItem key={c.name} value={c.name} className="text-xs">
              {c.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );

  const renderChannelRow = (channel: EncodingChannel) => {
    const channelSpec = encoding[channel] as SpecObj | undefined;
    const field = channelSpec?.field as string | undefined;
    const type = channelSpec?.type as string | undefined;
    const aggregate = channelSpec?.aggregate as string | undefined;
    const isCustomizeOpen = expandedCustomize.has(channel);

    return (
      <div key={channel} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{channel}</Label>
          {channelSpec && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                onUpdate((s) => {
                  const enc = (s.encoding ?? {}) as SpecObj;
                  delete enc[channel];
                  s.encoding = enc;
                })
              }
              className="text-[10px] h-auto p-0 text-muted-foreground hover:text-destructive hover:bg-transparent"
            >
              remove
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {renderFieldSelect(channel, field)}
          <Select
            value={type ?? NONE_VALUE}
            onValueChange={(v) =>
              onUpdate((s) => {
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
          <Select
            value={aggregate ?? NONE_VALUE}
            onValueChange={(v) =>
              onUpdate((s) => {
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
        {/* Customize toggle — shown when channel has a field */}
        {channelSpec && field && (() => {
          const hasAxisOrLegend = AXIS_CHANNELS.has(channel) || LEGEND_CHANNELS.has(channel);
          if (!hasAxisOrLegend) {
            return (
              <div className="grid grid-cols-1 gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Title</Label>
                  <Input
                    className="h-6 text-xs"
                    placeholder="auto"
                    value={(channelSpec?.title as string) ?? ""}
                    onChange={(e) =>
                      onUpdate((s) => {
                        const enc = (s.encoding ?? {}) as SpecObj;
                        const existing = (enc[channel] ?? {}) as SpecObj;
                        if (e.target.value) existing.title = e.target.value;
                        else delete existing.title;
                        enc[channel] = existing;
                        s.encoding = enc;
                      })
                    }
                  />
                </div>
              </div>
            );
          }

          const subKey = AXIS_CHANNELS.has(channel) ? "axis" : "legend";
          const sub = (channelSpec?.[subKey] ?? {}) as SpecObj;

          return (
            <div className="space-y-1">
              <button
                onClick={() => toggleCustomize(channel)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${isCustomizeOpen ? "" : "-rotate-90"}`} />
                Customize
              </button>
              {isCustomizeOpen && (
                <div className="grid gap-1.5 grid-cols-[2fr_1fr_1fr_1fr]">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Title</Label>
                    <Input
                      className="h-6 text-xs"
                      placeholder="auto"
                      value={(channelSpec?.title as string) ?? ""}
                      onChange={(e) =>
                        onUpdate((s) => {
                          const enc = (s.encoding ?? {}) as SpecObj;
                          const existing = (enc[channel] ?? {}) as SpecObj;
                          if (e.target.value) existing.title = e.target.value;
                          else delete existing.title;
                          enc[channel] = existing;
                          s.encoding = enc;
                        })
                      }
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Title size</Label>
                    <Input
                      className="h-6 text-xs"
                      type="number"
                      placeholder="auto"
                      value={(sub.titleFontSize as number) ?? ""}
                      onChange={(e) =>
                        onUpdate((s) => {
                          const enc = (s.encoding ?? {}) as SpecObj;
                          const existing = (enc[channel] ?? {}) as SpecObj;
                          const axisOrLegend = (existing[subKey] ?? {}) as SpecObj;
                          if (e.target.value) axisOrLegend.titleFontSize = Number(e.target.value);
                          else delete axisOrLegend.titleFontSize;
                          if (Object.keys(axisOrLegend).length > 0) existing[subKey] = axisOrLegend;
                          else delete existing[subKey];
                          enc[channel] = existing;
                          s.encoding = enc;
                        })
                      }
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Label size</Label>
                    <Input
                      className="h-6 text-xs"
                      type="number"
                      placeholder="auto"
                      value={(sub.labelFontSize as number) ?? ""}
                      onChange={(e) =>
                        onUpdate((s) => {
                          const enc = (s.encoding ?? {}) as SpecObj;
                          const existing = (enc[channel] ?? {}) as SpecObj;
                          const axisOrLegend = (existing[subKey] ?? {}) as SpecObj;
                          if (e.target.value) axisOrLegend.labelFontSize = Number(e.target.value);
                          else delete axisOrLegend.labelFontSize;
                          if (Object.keys(axisOrLegend).length > 0) existing[subKey] = axisOrLegend;
                          else delete existing[subKey];
                          enc[channel] = existing;
                          s.encoding = enc;
                        })
                      }
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Label angle</Label>
                    <Input
                      className="h-6 text-xs"
                      type="number"
                      placeholder="auto"
                      value={(sub.labelAngle as number) ?? ""}
                      onChange={(e) =>
                        onUpdate((s) => {
                          const enc = (s.encoding ?? {}) as SpecObj;
                          const existing = (enc[channel] ?? {}) as SpecObj;
                          const axisOrLegend = (existing[subKey] ?? {}) as SpecObj;
                          if (e.target.value) axisOrLegend.labelAngle = Number(e.target.value);
                          else delete axisOrLegend.labelAngle;
                          if (Object.keys(axisOrLegend).length > 0) existing[subKey] = axisOrLegend;
                          else delete existing[subKey];
                          enc[channel] = existing;
                          s.encoding = enc;
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Assigned channels — full editor */}
      {assignedChannels.map(renderChannelRow)}

      {/* Divider between assigned and unassigned */}
      {assignedChannels.length > 0 && unassignedChannels.length > 0 && (
        <div className="border-t pt-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Available channels</span>
        </div>
      )}

      {/* Unassigned channels — compact, just field dropdown */}
      {unassignedChannels.map((channel) => (
        <div key={channel} className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-12 shrink-0">{channel}</Label>
          <div className="flex-1">
            {renderFieldSelect(channel, undefined)}
          </div>
        </div>
      ))}
    </div>
  );
}
