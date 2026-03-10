"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { MarkEditor } from "./mark-editor";
import { EncodingEditor } from "./encoding-editor";
import type { ColumnMeta } from "@/types";

type SpecObj = Record<string, unknown>;

interface LayerEditorCardProps {
  layer: SpecObj;
  index: number;
  columns: ColumnMeta[];
  computedFields?: ColumnMeta[];
  onChange: (layer: SpecObj) => void;
  onRemove: () => void;
}

export function LayerEditorCard({ layer, index, columns, computedFields = [], onChange, onRemove }: LayerEditorCardProps) {
  function onUpdate(updater: (l: SpecObj) => void) {
    const clone = structuredClone(layer);
    updater(clone);
    onChange(clone);
  }

  return (
    <div className="border rounded-md bg-muted/20">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-xs font-medium text-muted-foreground">
          Layer {index + 1}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Remove layer"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["mark", "encoding"]}
        className="px-3 pb-2"
      >
        <AccordionItem value="mark">
          <AccordionTrigger className="text-xs font-medium py-2">
            Mark
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <MarkEditor spec={layer} onUpdate={onUpdate} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="encoding">
          <AccordionTrigger className="text-xs font-medium py-2">
            Encoding
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <EncodingEditor
              spec={layer}
              markType={
                typeof layer.mark === "string"
                  ? layer.mark
                  : typeof layer.mark === "object" && layer.mark !== null
                    ? ((layer.mark as SpecObj).type as string)
                    : undefined
              }
              columns={columns}
              computedFields={computedFields}
              onUpdate={onUpdate}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
