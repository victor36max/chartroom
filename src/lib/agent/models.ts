export type ModelTier = "fast" | "mid" | "power";

export const MODEL_TIERS: Record<
  ModelTier,
  { label: string; envKey: string; default: string }
> = {
  fast: {
    label: "Fast",
    envKey: "MODEL_FAST",
    default: "qwen/qwen3.5-35b-a3b",
  },
  mid: {
    label: "Standard",
    envKey: "MODEL_MID",
    default: "qwen/qwen3.5-122b-a10b",
  },
  power: {
    label: "Power",
    envKey: "MODEL_POWER",
    default: "qwen/qwen3.5-397b-a17b",
  },
};

export const MODEL_TIER_LABELS: Record<
  ModelTier,
  { label: string; subtitle: string }
> = {
  fast: { label: "Fast", subtitle: "qwen3.5-35b" },
  mid: { label: "Standard", subtitle: "qwen3.5-122b" },
  power: { label: "Power", subtitle: "qwen3.5-397b" },
};

export const DEFAULT_TIER: ModelTier = "mid";

export function resolveModelId(tier: ModelTier): string {
  const config = MODEL_TIERS[tier];
  return process.env[config.envKey] ?? config.default;
}
