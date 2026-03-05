"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import type { MarkSpec, ColumnMeta } from "@/types";

const MARK_TYPES = [
  "barY",
  "barX",
  "dot",
  "line",
  "lineY",
  "lineX",
  "areaY",
  "areaX",
  "cell",
  "rect",
  "rectX",
  "rectY",
  "text",
  "tickX",
  "tickY",
  "ruleX",
  "ruleY",
  "arc",
];

const NAMED_COLORS = [
  "steelblue",
  "tomato",
  "orange",
  "seagreen",
  "slateblue",
  "gray",
  "black",
];

const REDUCERS = [
  "count",
  "sum",
  "mean",
  "median",
  "min",
  "max",
  "mode",
  "first",
  "last",
];

const AGGREGATE_KEYS = ["groupX", "groupY", "groupZ"];
const BIN_KEYS = ["binX", "binY"];
const STACK_KEYS = ["stackY", "stackX"];

// Sentinel value for "no selection" since Radix Select doesn't support empty string values
const NONE_VALUE = "__none__";

interface MarkEditorCardProps {
  mark: MarkSpec;
  index: number;
  columns: ColumnMeta[];
  onChange: (mark: MarkSpec) => void;
  onRemove: () => void;
}

// ---------------------------------------------------------------------------
// Transform helpers — read/write transform config from mark options
// ---------------------------------------------------------------------------

type Opts = Record<string, unknown>;

function getAggregateInfo(opts: Opts): { axis: "X" | "Y"; reducer: string } | null {
  for (const key of AGGREGATE_KEYS) {
    if (opts[key] && typeof opts[key] === "object") {
      const spec = opts[key] as Record<string, unknown>;
      const outputs = (spec.outputs ?? spec) as Record<string, string>;
      const rawAxis = key.replace("group", "");
      const axis: "X" | "Y" = rawAxis === "X" || rawAxis === "Y" ? rawAxis : "X";
      const reducer = Object.values(outputs)[0] ?? "count";
      return { axis, reducer };
    }
  }
  return null;
}

function getBinInfo(opts: Opts): { axis: "X" | "Y"; reducer: string } | null {
  for (const key of BIN_KEYS) {
    if (opts[key] && typeof opts[key] === "object") {
      const spec = opts[key] as Record<string, unknown>;
      const outputs = (spec.outputs ?? spec) as Record<string, string>;
      const axis = key.replace("bin", "") as "X" | "Y";
      const reducer = Object.values(outputs)[0] ?? "count";
      return { axis, reducer };
    }
  }
  return null;
}

function getStackInfo(opts: Opts): { axis: "Y" | "X" } | null {
  if (opts.stackY) return { axis: "Y" };
  if (opts.stackX) return { axis: "X" };
  return null;
}

function getMeltInfo(opts: Opts): { columns: string[]; key: string; value: string } | null {
  if (!opts.melt || typeof opts.melt !== "object") return null;
  const m = opts.melt as Record<string, unknown>;
  return {
    columns: (m.columns as string[]) ?? [],
    key: (m.key as string) ?? "variable",
    value: (m.value as string) ?? "value",
  };
}

function getFilterInfo(opts: Opts): Record<string, string> | null {
  if (!opts.filter || typeof opts.filter !== "object") return null;
  return opts.filter as Record<string, string>;
}

function removeKeys(opts: Opts, keys: string[]): Opts {
  const next = { ...opts };
  for (const k of keys) delete next[k];
  return next;
}

function setAggregate(opts: Opts, axis: "X" | "Y", reducer: string): Opts {
  const next = removeKeys(opts, [...AGGREGATE_KEYS, ...BIN_KEYS]);
  const outputChannel = axis === "X" ? "y" : "x";
  next[`group${axis}`] = { outputs: { [outputChannel]: reducer } };
  return next;
}

function setBin(opts: Opts, axis: "X" | "Y", reducer: string): Opts {
  const next = removeKeys(opts, [...AGGREGATE_KEYS, ...BIN_KEYS]);
  const outputChannel = axis === "X" ? "y" : "x";
  next[`bin${axis}`] = { outputs: { [outputChannel]: reducer } };
  return next;
}

function setStack(opts: Opts, axis: "Y" | "X"): Opts {
  const next = removeKeys(opts, STACK_KEYS);
  next[`stack${axis}`] = {};
  return next;
}

function setMelt(opts: Opts, melt: { columns: string[]; key: string; value: string }): Opts {
  return { ...opts, melt };
}

function setFilter(opts: Opts, filter: Record<string, string>): Opts {
  if (Object.keys(filter).length === 0) {
    const next = { ...opts };
    delete next.filter;
    return next;
  }
  return { ...opts, filter };
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function ColumnSelect({
  label,
  value,
  columns,
  onChange,
  id,
}: {
  label: string;
  value: string | undefined;
  columns: ColumnMeta[];
  onChange: (value: string | undefined) => void;
  id: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs" htmlFor={id}>
        {label}
      </Label>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? undefined : v)}
      >
        <SelectTrigger size="sm" className="w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">
            — none —
          </SelectItem>
          {columns.map((c) => (
            <SelectItem key={c.name} value={c.name} className="text-xs">
              {c.name}{" "}
              <span className="text-muted-foreground">({c.type})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ColumnOrColorSelect({
  label,
  value,
  columns,
  onChange,
  id,
}: {
  label: string;
  value: string | undefined;
  columns: ColumnMeta[];
  onChange: (value: string | undefined) => void;
  id: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs" htmlFor={id}>
        {label}
      </Label>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? undefined : v)}
      >
        <SelectTrigger size="sm" className="w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">
            — none —
          </SelectItem>
          <SelectGroup>
            <SelectLabel>Columns</SelectLabel>
            {columns.map((c) => (
              <SelectItem key={c.name} value={c.name} className="text-xs">
                {c.name}{" "}
                <span className="text-muted-foreground">({c.type})</span>
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Colors</SelectLabel>
            {NAMED_COLORS.map((color) => (
              <SelectItem key={color} value={color} className="text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {color}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transform section sub-components
// ---------------------------------------------------------------------------

function TransformSwitch({
  label,
  checked,
  onCheckedChange,
  id,
  summary,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id: string;
  summary?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Switch size="sm" id={id} checked={checked} onCheckedChange={onCheckedChange} />
        <Label htmlFor={id} className="text-xs cursor-pointer">
          {label}
        </Label>
      </div>
      {summary && (
        <span className="text-[10px] text-muted-foreground font-mono">{summary}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MarkEditorCard({
  mark,
  index,
  columns,
  onChange,
  onRemove,
}: MarkEditorCardProps) {
  const opts = mark.options ?? {};
  const isArc = mark.type === "arc";

  // Read current transform state from options
  const aggInfo = getAggregateInfo(opts);
  const binInfo = getBinInfo(opts);
  const stackInfo = getStackInfo(opts);
  const meltInfo = getMeltInfo(opts);
  const filterInfo = getFilterInfo(opts);

  function setOption(key: string, value: unknown) {
    const newOpts = { ...opts };
    if (value === undefined || value === "") {
      delete newOpts[key];
    } else {
      newOpts[key] = value;
    }
    onChange({ ...mark, options: newOpts });
  }

  function setOpts(newOpts: Opts) {
    onChange({ ...mark, options: newOpts });
  }

  // Smart defaults for aggregate axis based on mark type
  const defaultAggAxis: "X" | "Y" = mark.type.endsWith("X") ? "Y" : "X";
  const defaultStackAxis: "Y" | "X" = mark.type.endsWith("X") ? "X" : "Y";

  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Mark {index + 1}
        </span>
        <button
          onClick={onRemove}
          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Remove mark"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select
          value={mark.type}
          onValueChange={(v) => onChange({ ...mark, type: v })}
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

      {isArc ? (
        <>
          <ColumnSelect
            label="Label column"
            value={opts.label as string | undefined}
            columns={columns}
            onChange={(v) => setOption("label", v)}
            id={`mark-${index}-label`}
          />
          <ColumnSelect
            label="Value column"
            value={opts.value as string | undefined}
            columns={columns}
            onChange={(v) => setOption("value", v)}
            id={`mark-${index}-value`}
          />
        </>
      ) : (
        <>
          <ColumnSelect
            label="X"
            value={opts.x as string | undefined}
            columns={columns}
            onChange={(v) => setOption("x", v)}
            id={`mark-${index}-x`}
          />
          <ColumnSelect
            label="Y"
            value={opts.y as string | undefined}
            columns={columns}
            onChange={(v) => setOption("y", v)}
            id={`mark-${index}-y`}
          />
          <ColumnOrColorSelect
            label="Fill"
            value={opts.fill as string | undefined}
            columns={columns}
            onChange={(v) => setOption("fill", v)}
            id={`mark-${index}-fill`}
          />
          <ColumnOrColorSelect
            label="Stroke"
            value={opts.stroke as string | undefined}
            columns={columns}
            onChange={(v) => setOption("stroke", v)}
            id={`mark-${index}-stroke`}
          />
        </>
      )}

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id={`tip-${index}`}
          checked={!!opts.tip}
          onChange={(e) => setOption("tip", e.target.checked || undefined)}
          className="rounded border-input"
        />
        <Label htmlFor={`tip-${index}`} className="text-xs cursor-pointer">
          Enable tooltips
        </Label>
      </div>

      {/* ── Transforms ─────────────────────────────────────────── */}
      {!isArc && (
        <div className="space-y-2 pt-1 border-t">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Transforms
          </span>

          {/* Aggregate (groupX / groupY) */}
          <div className="space-y-1.5">
            <TransformSwitch
              label="Aggregate"
              id={`agg-${index}`}
              checked={!!aggInfo}
              summary={aggInfo ? `group${aggInfo.axis}: ${aggInfo.reducer}` : undefined}
              onCheckedChange={(on) => {
                if (on) {
                  setOpts(setAggregate(opts, defaultAggAxis, "count"));
                } else {
                  setOpts(removeKeys(opts, AGGREGATE_KEYS));
                }
              }}
            />
            {aggInfo && (
              <div className="grid grid-cols-2 gap-1.5 pl-6">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Axis</Label>
                  <Select
                    value={aggInfo.axis}
                    onValueChange={(v) =>
                      setOpts(setAggregate(opts, v as "X" | "Y", aggInfo.reducer))
                    }
                  >
                    <SelectTrigger size="sm" className="h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="X" className="text-xs">X</SelectItem>
                      <SelectItem value="Y" className="text-xs">Y</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Reducer</Label>
                  <Select
                    value={aggInfo.reducer}
                    onValueChange={(v) =>
                      setOpts(setAggregate(opts, aggInfo.axis, v))
                    }
                  >
                    <SelectTrigger size="sm" className="h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REDUCERS.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Bin (binX / binY) — mutually exclusive with aggregate */}
          <div className="space-y-1.5">
            <TransformSwitch
              label="Bin"
              id={`bin-${index}`}
              checked={!!binInfo}
              summary={binInfo ? `bin${binInfo.axis}: ${binInfo.reducer}` : undefined}
              onCheckedChange={(on) => {
                if (on) {
                  setOpts(setBin(opts, defaultAggAxis, "count"));
                } else {
                  setOpts(removeKeys(opts, BIN_KEYS));
                }
              }}
            />
            {binInfo && (
              <div className="grid grid-cols-2 gap-1.5 pl-6">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Axis</Label>
                  <Select
                    value={binInfo.axis}
                    onValueChange={(v) =>
                      setOpts(setBin(opts, v as "X" | "Y", binInfo.reducer))
                    }
                  >
                    <SelectTrigger size="sm" className="h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="X" className="text-xs">X</SelectItem>
                      <SelectItem value="Y" className="text-xs">Y</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Reducer</Label>
                  <Select
                    value={binInfo.reducer}
                    onValueChange={(v) =>
                      setOpts(setBin(opts, binInfo.axis, v))
                    }
                  >
                    <SelectTrigger size="sm" className="h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REDUCERS.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Stack (stackY / stackX) */}
          <div className="space-y-1.5">
            <TransformSwitch
              label="Stack"
              id={`stack-${index}`}
              checked={!!stackInfo}
              summary={stackInfo ? `stack${stackInfo.axis}` : undefined}
              onCheckedChange={(on) => {
                if (on) {
                  setOpts(setStack(opts, defaultStackAxis));
                } else {
                  setOpts(removeKeys(opts, STACK_KEYS));
                }
              }}
            />
            {stackInfo && (
              <div className="pl-6">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Axis</Label>
                  <Select
                    value={stackInfo.axis}
                    onValueChange={(v) => setOpts(setStack(opts, v as "Y" | "X"))}
                  >
                    <SelectTrigger size="sm" className="h-6 text-xs w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Y" className="text-xs">Y</SelectItem>
                      <SelectItem value="X" className="text-xs">X</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Melt (wide-to-long reshape) */}
          <div className="space-y-1.5">
            <TransformSwitch
              label="Reshape (melt)"
              id={`melt-${index}`}
              checked={!!meltInfo}
              summary={meltInfo ? `${meltInfo.columns.length} cols` : undefined}
              onCheckedChange={(on) => {
                if (on) {
                  setOpts(setMelt(opts, { columns: [], key: "variable", value: "value" }));
                } else {
                  const next = { ...opts };
                  delete next.melt;
                  setOpts(next);
                }
              }}
            />
            {meltInfo && (
              <div className="space-y-1.5 pl-6">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">
                    Columns to reshape
                  </Label>
                  <div className="space-y-0.5 max-h-28 overflow-y-auto">
                    {columns.map((col) => (
                      <label
                        key={col.name}
                        className="flex items-center gap-1.5 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          checked={meltInfo.columns.includes(col.name)}
                          onChange={(e) => {
                            const cols = e.target.checked
                              ? [...meltInfo.columns, col.name]
                              : meltInfo.columns.filter((c) => c !== col.name);
                            setOpts(setMelt(opts, { ...meltInfo, columns: cols }));
                          }}
                        />
                        {col.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Key name</Label>
                    <Input
                      className="h-6 text-xs"
                      value={meltInfo.key}
                      onChange={(e) =>
                        setOpts(setMelt(opts, { ...meltInfo, key: e.target.value || "variable" }))
                      }
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Value name</Label>
                    <Input
                      className="h-6 text-xs"
                      value={meltInfo.value}
                      onChange={(e) =>
                        setOpts(setMelt(opts, { ...meltInfo, value: e.target.value || "value" }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filter (column-value pairs) */}
          <div className="space-y-1.5">
            <TransformSwitch
              label="Filter"
              id={`filter-${index}`}
              checked={!!filterInfo}
              summary={
                filterInfo ? `${Object.keys(filterInfo).length} rule${Object.keys(filterInfo).length !== 1 ? "s" : ""}` : undefined
              }
              onCheckedChange={(on) => {
                if (on) {
                  const firstCol = columns[0]?.name ?? "";
                  setOpts(setFilter(opts, { [firstCol]: "" }));
                } else {
                  const next = { ...opts };
                  delete next.filter;
                  setOpts(next);
                }
              }}
            />
            {filterInfo && (
              <div className="space-y-1 pl-6">
                {Object.entries(filterInfo).map(([col, val], fi) => (
                  <div key={fi} className="flex items-end gap-1">
                    <div className="flex-1 space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Column</Label>
                      <Select
                        value={col || NONE_VALUE}
                        onValueChange={(newCol) => {
                          const entries = Object.entries(filterInfo);
                          entries[fi] = [newCol === NONE_VALUE ? "" : newCol, val];
                          setOpts(setFilter(opts, Object.fromEntries(entries)));
                        }}
                      >
                        <SelectTrigger size="sm" className="h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((c) => (
                            <SelectItem key={c.name} value={c.name} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Value</Label>
                      <Input
                        className="h-6 text-xs"
                        value={val}
                        placeholder="value"
                        onChange={(e) => {
                          const entries = Object.entries(filterInfo);
                          entries[fi] = [col, e.target.value];
                          setOpts(setFilter(opts, Object.fromEntries(entries)));
                        }}
                      />
                    </div>
                    <button
                      className="p-1 rounded text-muted-foreground hover:text-destructive"
                      title="Remove filter"
                      onClick={() => {
                        const next = { ...filterInfo };
                        delete next[col];
                        setOpts(setFilter(opts, next));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] px-1"
                  onClick={() => {
                    const firstCol = columns[0]?.name ?? "";
                    setOpts(setFilter(opts, { ...filterInfo, [firstCol]: "" }));
                  }}
                >
                  <Plus className="h-2.5 w-2.5 mr-0.5" /> Add rule
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
