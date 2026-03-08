import type { ColumnMeta } from "@/types";

type TransformObj = Record<string, unknown>;

export function getComputedFields(
  transforms: TransformObj[],
): ColumnMeta[] {
  const computed: ColumnMeta[] = [];

  for (const t of transforms) {
    if ("calculate" in t && "as" in t && typeof t.as === "string") {
      computed.push({ name: t.as, type: "number", sample: [], computed: true });
    }

    if ("fold" in t) {
      const as = (Array.isArray(t.as) ? t.as : ["key", "value"]) as string[];
      computed.push({ name: as[0] ?? "key", type: "string", sample: [], computed: true });
      computed.push({ name: as[1] ?? "value", type: "number", sample: [], computed: true });
    }

    if ("aggregate" in t && Array.isArray(t.aggregate)) {
      for (const agg of t.aggregate as Array<{ op: string; field?: string; as: string }>) {
        if (agg.as) {
          computed.push({ name: agg.as, type: "number", sample: [], computed: true });
        }
      }
    }

    if ("bin" in t && "as" in t && typeof t.as === "string") {
      computed.push({ name: t.as, type: "number", sample: [], computed: true });
      computed.push({ name: t.as + "_end", type: "number", sample: [], computed: true });
    }

    if ("window" in t && Array.isArray(t.window)) {
      for (const w of t.window as Array<{ op: string; field?: string; as: string }>) {
        if (w.as) {
          computed.push({ name: w.as, type: "number", sample: [], computed: true });
        }
      }
    }
  }

  return computed;
}
