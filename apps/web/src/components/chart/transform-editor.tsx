"use client";

import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import type { ColumnMeta, DatasetMap } from "@/types";

type TransformObj = Record<string, unknown>;

const TRANSFORM_TYPES = [
  { value: "filter", label: "Filter" },
  { value: "calculate", label: "Calculate" },
  { value: "fold", label: "Fold" },
  { value: "aggregate", label: "Aggregate" },
  { value: "bin", label: "Bin" },
  { value: "window", label: "Window" },
  { value: "lookup", label: "Lookup" },
] as const;

const AGG_OPS = [
  "count", "sum", "mean", "median", "min", "max", "variance", "stdev", "q1", "q3",
];

const WINDOW_OPS = [
  "row_number", "rank", "dense_rank", "percent_rank", "cume_dist",
  "lag", "lead", "first_value", "last_value",
  "sum", "mean", "count", "min", "max",
];

const NONE_VALUE = "__none__";

interface TransformEditorProps {
  transforms: TransformObj[];
  columns: ColumnMeta[];
  datasets?: DatasetMap;
  onChange: (transforms: TransformObj[]) => void;
}

function getTransformType(t: TransformObj): string {
  if ("filter" in t) return "filter";
  if ("calculate" in t) return "calculate";
  if ("fold" in t) return "fold";
  if ("aggregate" in t) return "aggregate";
  if ("bin" in t) return "bin";
  if ("window" in t) return "window";
  if ("lookup" in t) return "lookup";
  return "unknown";
}

function CheckboxGrid({ columns, selected, onChange }: {
  columns: ColumnMeta[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      {columns.map((c) => {
        const checked = selected.includes(c.name);
        return (
          <Label key={c.name} className="flex items-center gap-0.5 text-[10px]">
            <Checkbox
              checked={checked}
              onCheckedChange={() => {
                if (checked) onChange(selected.filter((s) => s !== c.name));
                else onChange([...selected, c.name]);
              }}
              className="h-3 w-3"
            />
            {c.name}
          </Label>
        );
      })}
    </div>
  );
}

function FilterForm({ transform, onChange }: { transform: TransformObj; onChange: (t: TransformObj) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">Expression</Label>
      <Input
        className="h-7 text-xs font-mono"
        placeholder='datum.field > value'
        value={(typeof transform.filter === "string" ? transform.filter : "") as string}
        onChange={(e) => onChange({ ...transform, filter: e.target.value })}
      />
    </div>
  );
}

function CalculateForm({ transform, onChange }: { transform: TransformObj; onChange: (t: TransformObj) => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-1.5">
      <div className="space-y-0.5">
        <Label className="text-[10px] text-muted-foreground">Expression</Label>
        <Input
          className="h-7 text-xs font-mono"
          placeholder="datum.a + datum.b"
          value={(transform.calculate as string) ?? ""}
          onChange={(e) => onChange({ ...transform, calculate: e.target.value })}
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-[10px] text-muted-foreground">Output field</Label>
        <Input
          className="h-7 text-xs w-24"
          placeholder="new_field"
          value={(transform.as as string) ?? ""}
          onChange={(e) => onChange({ ...transform, as: e.target.value })}
        />
      </div>
    </div>
  );
}

function FoldForm({ transform, columns, onChange }: { transform: TransformObj; columns: ColumnMeta[]; onChange: (t: TransformObj) => void }) {
  const foldFields = (Array.isArray(transform.fold) ? transform.fold : []) as string[];
  const as = (Array.isArray(transform.as) ? transform.as : ["key", "value"]) as string[];

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label className="text-[10px] text-muted-foreground">Fields to fold</Label>
        <CheckboxGrid
          columns={columns}
          selected={foldFields}
          onChange={(selected) => onChange({ ...transform, fold: selected })}
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Key name</Label>
          <Input
            className="h-7 text-xs"
            placeholder="key"
            value={as[0] ?? "key"}
            onChange={(e) => onChange({ ...transform, as: [e.target.value, as[1] ?? "value"] })}
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Value name</Label>
          <Input
            className="h-7 text-xs"
            placeholder="value"
            value={as[1] ?? "value"}
            onChange={(e) => onChange({ ...transform, as: [as[0] ?? "key", e.target.value] })}
          />
        </div>
      </div>
    </div>
  );
}

function AggregateForm({ transform, columns, onChange }: { transform: TransformObj; columns: ColumnMeta[]; onChange: (t: TransformObj) => void }) {
  const groupby = (Array.isArray(transform.groupby) ? transform.groupby : []) as string[];
  const aggregations = (Array.isArray(transform.aggregate) ? transform.aggregate : []) as Array<{ op: string; field?: string; as: string }>;

  const updateAgg = (index: number, updates: Partial<{ op: string; field?: string; as: string }>) => {
    const newAggs = aggregations.map((a, i) => i === index ? { ...a, ...updates } : a);
    onChange({ ...transform, aggregate: newAggs });
  };

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label className="text-[10px] text-muted-foreground">Group by</Label>
        <CheckboxGrid
          columns={columns}
          selected={groupby}
          onChange={(selected) => onChange({ ...transform, groupby: selected })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Aggregations</Label>
        {aggregations.map((agg, i) => (
          <div key={i} className="flex gap-1 items-center">
            <Select value={agg.op} onValueChange={(v) => updateAgg(i, { op: v })}>
              <SelectTrigger size="sm" className="text-xs w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGG_OPS.map((op) => (
                  <SelectItem key={op} value={op} className="text-xs">{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agg.field ?? NONE_VALUE} onValueChange={(v) => updateAgg(i, { field: v === NONE_VALUE ? undefined : v })}>
              <SelectTrigger size="sm" className="text-xs flex-1">
                <SelectValue placeholder="field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">— none —</SelectItem>
                {columns.map((c) => (
                  <SelectItem key={c.name} value={c.name} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-7 text-xs w-20"
              placeholder="as"
              value={agg.as ?? ""}
              onChange={(e) => updateAgg(i, { as: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onChange({ ...transform, aggregate: aggregations.filter((_, j) => j !== i) })}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove aggregation"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => onChange({ ...transform, aggregate: [...aggregations, { op: "sum", field: undefined, as: "" }] })}
        >
          <Plus className="h-2.5 w-2.5 mr-0.5" /> Add agg
        </Button>
      </div>
    </div>
  );
}

function BinForm({ transform, columns, onChange }: { transform: TransformObj; columns: ColumnMeta[]; onChange: (t: TransformObj) => void }) {
  const maxbins = typeof transform.bin === "object" && transform.bin !== null
    ? (transform.bin as Record<string, unknown>).maxbins as number | undefined
    : undefined;

  return (
    <div className="grid grid-cols-3 gap-1.5">
      <div className="space-y-0.5">
        <Label className="text-[10px] text-muted-foreground">Field</Label>
        <Select
          value={(transform.field as string) ?? NONE_VALUE}
          onValueChange={(v) => {
            const updates: TransformObj = { ...transform, field: v === NONE_VALUE ? undefined : v };
            if (!transform.as && v !== NONE_VALUE) updates.as = `bin_${v}`;
            onChange(updates);
          }}
        >
          <SelectTrigger size="sm" className="text-xs">
            <SelectValue placeholder="field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">— none —</SelectItem>
            {columns.map((c) => (
              <SelectItem key={c.name} value={c.name} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-0.5">
        <Label className="text-[10px] text-muted-foreground">Output</Label>
        <Input
          className="h-7 text-xs"
          placeholder="bin_field"
          value={(transform.as as string) ?? ""}
          onChange={(e) => onChange({ ...transform, as: e.target.value })}
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-[10px] text-muted-foreground">Max bins</Label>
        <Input
          className="h-7 text-xs"
          type="number"
          placeholder="auto"
          value={maxbins ?? ""}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ ...transform, bin: { maxbins: Number(e.target.value) } });
            } else {
              onChange({ ...transform, bin: true });
            }
          }}
        />
      </div>
    </div>
  );
}

function WindowForm({ transform, columns, onChange }: { transform: TransformObj; columns: ColumnMeta[]; onChange: (t: TransformObj) => void }) {
  const windowOps = (Array.isArray(transform.window) ? transform.window : []) as Array<{ op: string; field?: string; as: string }>;
  const groupby = (Array.isArray(transform.groupby) ? transform.groupby : []) as string[];
  const sortArr = (Array.isArray(transform.sort) ? transform.sort : []) as Array<{ field: string; order?: string }>;
  const sortField = sortArr[0]?.field ?? "";
  const frame = (Array.isArray(transform.frame) ? transform.frame : [null, 0]) as Array<number | null>;

  const updateOp = (index: number, updates: Partial<{ op: string; field?: string; as: string }>) => {
    const newOps = windowOps.map((w, i) => i === index ? { ...w, ...updates } : w);
    onChange({ ...transform, window: newOps });
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Window ops</Label>
        {windowOps.map((w, i) => (
          <div key={i} className="flex gap-1 items-center">
            <Select value={w.op} onValueChange={(v) => updateOp(i, { op: v })}>
              <SelectTrigger size="sm" className="text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_OPS.map((op) => (
                  <SelectItem key={op} value={op} className="text-xs">{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={w.field ?? NONE_VALUE} onValueChange={(v) => updateOp(i, { field: v === NONE_VALUE ? undefined : v })}>
              <SelectTrigger size="sm" className="text-xs flex-1">
                <SelectValue placeholder="field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">— none —</SelectItem>
                {columns.map((c) => (
                  <SelectItem key={c.name} value={c.name} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-7 text-xs w-20"
              placeholder="as"
              value={w.as ?? ""}
              onChange={(e) => updateOp(i, { as: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onChange({ ...transform, window: windowOps.filter((_, j) => j !== i) })}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove window operation"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => onChange({ ...transform, window: [...windowOps, { op: "rank", as: "" }] })}
        >
          <Plus className="h-2.5 w-2.5 mr-0.5" /> Add op
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Sort by</Label>
          <Select
            value={sortField || NONE_VALUE}
            onValueChange={(v) => {
              if (v === NONE_VALUE) {
                const next = { ...transform };
                delete next.sort;
                onChange(next);
              } else {
                onChange({ ...transform, sort: [{ field: v, order: "descending" }] });
              }
            }}
          >
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue placeholder="field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">— none —</SelectItem>
              {columns.map((c) => (
                <SelectItem key={c.name} value={c.name} className="text-xs">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Frame</Label>
          <div className="flex gap-1">
            <Input
              className="h-7 text-xs"
              type="number"
              placeholder="unbounded"
              value={frame[0] ?? ""}
              onChange={(e) => {
                const lower = e.target.value ? Number(e.target.value) : null;
                onChange({ ...transform, frame: [lower, frame[1]] });
              }}
            />
            <Input
              className="h-7 text-xs"
              type="number"
              placeholder="0"
              value={frame[1] ?? ""}
              onChange={(e) => {
                const upper = e.target.value ? Number(e.target.value) : null;
                onChange({ ...transform, frame: [frame[0], upper] });
              }}
            />
          </div>
        </div>
      </div>
      {columns.length > 0 && (
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Group by</Label>
          <CheckboxGrid
            columns={columns}
            selected={groupby}
            onChange={(selected) => {
              if (selected.length === 0) {
                const next = { ...transform };
                delete next.groupby;
                onChange(next);
              } else {
                onChange({ ...transform, groupby: selected });
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

function LookupForm({ transform, columns, datasets, onChange }: { transform: TransformObj; columns: ColumnMeta[]; datasets?: DatasetMap; onChange: (t: TransformObj) => void }) {
  const from = (transform.from ?? {}) as Record<string, unknown>;
  const fromData = (from.data ?? {}) as Record<string, unknown>;
  const fromFields = (Array.isArray(from.fields) ? from.fields : []) as string[];
  const sourceUrl = (fromData.url as string) ?? "";
  const datasetNames = datasets ? Object.keys(datasets) : [];
  const sourceColumns = datasets && sourceUrl && datasets[sourceUrl]
    ? datasets[sourceUrl].metadata.columns
    : [];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Lookup field</Label>
          <Select
            value={(transform.lookup as string) || NONE_VALUE}
            onValueChange={(v) => onChange({ ...transform, lookup: v === NONE_VALUE ? "" : v })}
          >
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue placeholder="field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">— select —</SelectItem>
              {columns.map((c) => (
                <SelectItem key={c.name} value={c.name} className="text-xs">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Source dataset</Label>
          {datasetNames.length > 0 ? (
            <Select
              value={sourceUrl || NONE_VALUE}
              onValueChange={(v) => {
                const newUrl = v === NONE_VALUE ? "" : v;
                onChange({ ...transform, from: { ...from, data: { ...fromData, url: newUrl }, key: "", fields: [] } });
              }}
            >
              <SelectTrigger size="sm" className="text-xs">
                <SelectValue placeholder="dataset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">— select —</SelectItem>
                {datasetNames.map((name) => (
                  <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-7 text-xs font-mono"
              placeholder="data.csv"
              value={sourceUrl}
              onChange={(e) => onChange({ ...transform, from: { ...from, data: { ...fromData, url: e.target.value } } })}
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Foreign key</Label>
          {sourceColumns.length > 0 ? (
            <Select
              value={(from.key as string) || NONE_VALUE}
              onValueChange={(v) => onChange({ ...transform, from: { ...from, key: v === NONE_VALUE ? "" : v } })}
            >
              <SelectTrigger size="sm" className="text-xs">
                <SelectValue placeholder="key" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">— select —</SelectItem>
                {sourceColumns.map((c) => (
                  <SelectItem key={c.name} value={c.name} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-7 text-xs"
              placeholder="key in source"
              value={(from.key as string) ?? ""}
              onChange={(e) => onChange({ ...transform, from: { ...from, key: e.target.value } })}
            />
          )}
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Fields to import</Label>
          {sourceColumns.length > 0 ? (
            <CheckboxGrid
              columns={sourceColumns}
              selected={fromFields}
              onChange={(fields) => onChange({ ...transform, from: { ...from, fields } })}
            />
          ) : (
            <Input
              className="h-7 text-xs"
              placeholder="field1, field2"
              value={fromFields.join(", ")}
              onChange={(e) => {
                const fields = e.target.value.split(",").map((f) => f.trim()).filter(Boolean);
                onChange({ ...transform, from: { ...from, fields } });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TransformCard({ transform, index, total, columns, datasets, onChange, onRemove, onMove }: {
  transform: TransformObj;
  index: number;
  total: number;
  columns: ColumnMeta[];
  datasets?: DatasetMap;
  onChange: (t: TransformObj) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const type = getTransformType(transform);

  return (
    <div className="border rounded-md p-2 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded">{type}</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Move transform up"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Move transform down"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Remove transform"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {type === "filter" && <FilterForm transform={transform} onChange={onChange} />}
      {type === "calculate" && <CalculateForm transform={transform} onChange={onChange} />}
      {type === "fold" && <FoldForm transform={transform} columns={columns} onChange={onChange} />}
      {type === "aggregate" && <AggregateForm transform={transform} columns={columns} onChange={onChange} />}
      {type === "bin" && <BinForm transform={transform} columns={columns} onChange={onChange} />}
      {type === "window" && <WindowForm transform={transform} columns={columns} onChange={onChange} />}
      {type === "lookup" && <LookupForm transform={transform} columns={columns} datasets={datasets} onChange={onChange} />}
    </div>
  );
}

const NONE_TRANSFORM = "__none__";

export function TransformEditor({ transforms, columns, datasets, onChange }: TransformEditorProps) {
  const updateTransform = useCallback((index: number, updated: TransformObj) => {
    const newTransforms = transforms.map((t, i) => i === index ? updated : t);
    onChange(newTransforms);
  }, [transforms, onChange]);

  const removeTransform = useCallback((index: number) => {
    onChange(transforms.filter((_, i) => i !== index));
  }, [transforms, onChange]);

  const moveTransform = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= transforms.length) return;
    const newTransforms = [...transforms];
    [newTransforms[index], newTransforms[newIndex]] = [newTransforms[newIndex], newTransforms[index]];
    onChange(newTransforms);
  }, [transforms, onChange]);

  const addTransform = useCallback((type: string) => {
    const defaults: Record<string, TransformObj> = {
      filter: { filter: "" },
      calculate: { calculate: "", as: "" },
      fold: { fold: [], as: ["key", "value"] },
      aggregate: { aggregate: [], groupby: [] },
      bin: { bin: true, field: "", as: "" },
      window: { window: [], sort: [] },
      lookup: { lookup: "", from: { data: { url: "" }, key: "", fields: [] } },
    };
    onChange([...transforms, defaults[type] ?? { filter: "" }]);
  }, [transforms, onChange]);

  return (
    <div className="space-y-2">
      {transforms.map((t, i) => (
        <TransformCard
          key={i}
          transform={t}
          index={i}
          total={transforms.length}
          columns={columns}
          datasets={datasets}
          onChange={(updated) => updateTransform(i, updated)}
          onRemove={() => removeTransform(i)}
          onMove={(dir) => moveTransform(i, dir)}
        />
      ))}
      <Select
        value={NONE_TRANSFORM}
        onValueChange={(v) => {
          if (v !== NONE_TRANSFORM) addTransform(v);
        }}
      >
        <SelectTrigger size="sm" className="w-full h-7 text-xs">
          <div className="flex items-center gap-1">
            <Plus className="h-3 w-3" />
            <span>Add transform</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_TRANSFORM} className="text-xs text-muted-foreground hidden">
            Add transform
          </SelectItem>
          {TRANSFORM_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
