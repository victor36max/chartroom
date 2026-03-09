"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SpecObj = Record<string, unknown>;

const MARK_TYPES = [
  "bar", "line", "area", "point", "rect", "rule",
  "text", "tick", "arc", "boxplot", "circle", "square", "trail",
];

interface MarkEditorProps {
  spec: SpecObj;
  onUpdate: (updater: (s: SpecObj) => void) => void;
}

export function MarkEditor({ spec, onUpdate }: MarkEditorProps) {
  const markType = typeof spec.mark === "string"
    ? spec.mark
    : typeof spec.mark === "object" && spec.mark !== null
      ? (spec.mark as SpecObj).type as string
      : "";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select
          value={markType}
          onValueChange={(v) =>
            onUpdate((s) => {
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
          id={`mark-tooltip-${markType}`}
          checked={
            typeof spec.mark === "object" && spec.mark !== null
              ? !!(spec.mark as SpecObj).tooltip
              : false
          }
          onChange={(e) =>
            onUpdate((s) => {
              if (typeof s.mark !== "object" || s.mark === null) {
                s.mark = { type: s.mark as string };
              }
              if (e.target.checked) {
                (s.mark as SpecObj).tooltip = true;
              } else {
                delete (s.mark as SpecObj).tooltip;
                const keys = Object.keys(s.mark as SpecObj);
                if (keys.length === 1 && keys[0] === "type") {
                  s.mark = (s.mark as SpecObj).type as string;
                }
              }
            })
          }
          className="rounded border-input"
        />
        <Label htmlFor={`mark-tooltip-${markType}`} className="text-xs">
          Enable tooltips
        </Label>
      </div>
    </div>
  );
}
