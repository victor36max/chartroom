export type ModelTier = "fast" | "mid" | "power";

const MODEL_TIERS: Record<
  ModelTier,
  { label: string; modelId: string }
> = {
  fast: {
    label: "Fast",
    modelId: process.env.NEXT_PUBLIC_MODEL_FAST ?? "qwen/qwen3.5-35b-a3b",
  },
  mid: {
    label: "Standard",
    modelId: process.env.NEXT_PUBLIC_MODEL_MID ?? "qwen/qwen3.5-122b-a10b",
  },
  power: {
    label: "Power",
    modelId: process.env.NEXT_PUBLIC_MODEL_POWER ?? "qwen/qwen3.5-397b-a17b",
  },
};

export const getModelTierLabels = (): Record<ModelTier, { label: string; subtitle: string }> => ({
  fast: { label: "Fast", subtitle: resolveModelId("fast") },
  mid: { label: "Standard", subtitle: resolveModelId("mid") },
  power: { label: "Power", subtitle: resolveModelId("power") },
});

export const DEFAULT_TIER: ModelTier = "mid";

export function resolveModelId(tier: ModelTier): string {
  const config = MODEL_TIERS[tier];
  return config.modelId;
}

export function getDefaultModelId(tier: ModelTier): string {
  return MODEL_TIERS[tier].modelId;
}
