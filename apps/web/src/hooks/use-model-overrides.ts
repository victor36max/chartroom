"use client";

import { useState, useCallback } from "react";
import type { ModelTier } from "@/lib/agent/models";

export type ModelOverrides = Partial<Record<ModelTier, string>>;

const STORAGE_KEY = "chartroom:model-overrides";

function readOverrides(): ModelOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ModelOverrides;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: ModelOverrides) {
  const cleaned = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v && v.trim() !== "")
  );
  if (Object.keys(cleaned).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  }
}

export function useModelOverrides() {
  const [overrides, setOverrides] = useState<ModelOverrides>(readOverrides);

  const setOverride = useCallback((tier: ModelTier, modelId: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (modelId.trim() === "") {
        delete next[tier];
      } else {
        next[tier] = modelId.trim();
      }
      writeOverrides(next);
      return next;
    });
  }, []);

  const clearOverride = useCallback((tier: ModelTier) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[tier];
      writeOverrides(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setOverrides({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { overrides, setOverride, clearOverride, clearAll };
}
