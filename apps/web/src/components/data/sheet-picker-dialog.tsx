"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface SheetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetNames: string[];
  onSheetsSelected: (sheets: string[]) => void;
}

export function SheetPickerDialog({
  open,
  onOpenChange,
  sheetNames,
  onSheetsSelected,
}: SheetPickerDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(sheetNames)
  );

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleImport = () => {
    onSheetsSelected([...selected]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Select sheets to import</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {sheetNames.map((name) => (
            <label
              key={name}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.has(name)}
                onCheckedChange={() => toggle(name)}
              />
              {name}
            </label>
          ))}
        </div>
        <Button onClick={handleImport} disabled={selected.size === 0}>
          Import {selected.size} {selected.size === 1 ? "sheet" : "sheets"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
