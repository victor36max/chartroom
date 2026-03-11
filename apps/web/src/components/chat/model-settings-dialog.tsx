"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { getDefaultModelId, type ModelTier } from "@/lib/agent/models";
import type { ModelOverrides } from "@/hooks/use-model-overrides";

const TIERS: { tier: ModelTier; label: string }[] = [
  { tier: "fast", label: "Fast" },
  { tier: "mid", label: "Standard" },
  { tier: "power", label: "Power" },
];

interface ModelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overrides: ModelOverrides;
  onSave: (overrides: ModelOverrides) => void;
}

function ModelSettingsForm({
  overrides,
  onSave,
  onClose,
}: {
  overrides: ModelOverrides;
  onSave: (overrides: ModelOverrides) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ModelOverrides>({ ...overrides });

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const handleReset = (tier: ModelTier) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[tier];
      return next;
    });
  };

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Override each tier with any OpenRouter model ID.
      </p>
      <div className="flex flex-col gap-4 py-2">
        {TIERS.map(({ tier, label }) => {
          const defaultId = getDefaultModelId(tier);
          return (
            <div key={tier} className="flex flex-col gap-1">
              <Label htmlFor={`model-${tier}`}>{label}</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id={`model-${tier}`}
                  value={draft[tier] ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [tier]: e.target.value }))
                  }
                  placeholder={defaultId}
                  className="text-sm"
                />
                {draft[tier] && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleReset(tier)}
                    aria-label={`Reset ${label} to default`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={() => setDraft({})}>
          Reset all
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </>
  );
}

export function ModelSettingsDialog({
  open,
  onOpenChange,
  overrides,
  onSave,
}: ModelSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Model Settings</DialogTitle>
        </DialogHeader>
        {open && (
          <ModelSettingsForm
            overrides={overrides}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
