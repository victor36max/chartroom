import * as vl from "vega-lite";
import type { LoggerInterface } from "vega";
import { injectData } from "./inject-data";

function createWarningLogger(warnings: string[]): LoggerInterface {
  let _level = 0;
  const self: LoggerInterface = {
    level(v?: number) {
      if (v !== undefined) { _level = v; return self; }
      return _level;
    },
    warn(...args: readonly unknown[]) { warnings.push(args.map(String).join(" ")); return self; },
    info() { return self; },
    debug() { return self; },
    error() { return self; },
  } as LoggerInterface;
  return self;
}

/** Collect sub-specs from composition operators (layer, concat, facet, repeat) */
function getSubSpecs(spec: Record<string, unknown>): Array<Record<string, unknown>> {
  const subs: Array<Record<string, unknown>> = [];
  for (const key of ["layer", "hconcat", "vconcat", "concat"] as const) {
    const arr = spec[key];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && typeof item === "object") subs.push(item as Record<string, unknown>);
      }
    }
  }
  // facet/repeat wrap a single inner spec
  const inner = spec.spec as Record<string, unknown> | undefined;
  if (inner && typeof inner === "object") subs.push(inner);
  return subs;
}

/** Collect all field references from encoding channels (including nested compositions) */
function collectEncodingFields(spec: Record<string, unknown>): string[] {
  const fields: string[] = [];
  const enc = spec.encoding as Record<string, Record<string, unknown>> | undefined;
  if (enc) {
    for (const ch of Object.values(enc)) {
      if (ch && typeof ch === "object" && typeof ch.field === "string") {
        fields.push(ch.field);
      }
    }
  }
  for (const sub of getSubSpecs(spec)) {
    fields.push(...collectEncodingFields(sub));
  }
  return fields;
}

/** Check for aggregate transforms missing "as" or encoding referencing original field instead of alias */
function lintTransforms(spec: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;

  if (Array.isArray(transforms)) {
    // Track aggregate aliases: original field → alias
    const aliasMap = new Map<string, string>();

    for (const t of transforms) {
      if (Array.isArray(t.aggregate)) {
        for (const agg of t.aggregate as Array<Record<string, unknown>>) {
          if (agg.field && !agg.as) {
            warnings.push(
              `Aggregate transform on "${agg.field}" is missing "as" alias. ` +
              `After aggregate, the field becomes "${agg.op}_${agg.field}" (not "${agg.field}"). ` +
              `Add "as": "total" (or similar) and use that alias in window sort and encoding.`
            );
          } else if (typeof agg.field === "string" && typeof agg.as === "string") {
            aliasMap.set(agg.field, agg.as);
          }
        }
      }
    }

    // Check if encoding references original field instead of the alias
    if (aliasMap.size > 0) {
      const encFields = collectEncodingFields(spec);
      for (const field of encFields) {
        const alias = aliasMap.get(field);
        if (alias) {
          warnings.push(
            `Encoding references "${field}" but an aggregate transform renamed it to "${alias}". ` +
            `After aggregate, the original column "${field}" no longer exists. ` +
            `Change the encoding field to "${alias}" and remove any inline "aggregate" on that channel.`
          );
        }
      }
    }
  }

  // Recurse into sub-specs
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintTransforms(sub));
  }

  return warnings;
}

/** Get the primary dataset key from a spec */
function getPrimaryDatasetKey(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string | null {
  const data = spec.data as Record<string, unknown> | undefined;
  if (data && typeof data.url === "string" && datasets[data.url]) {
    return data.url;
  }
  // Fallback: first dataset key (matches injectData behavior)
  const firstKey = Object.keys(datasets)[0];
  return firstKey ?? null;
}

/** Get column names from a dataset */
function getColumns(datasets: Record<string, Record<string, unknown>[]>, key: string): Set<string> {
  const rows = datasets[key];
  if (!rows || rows.length === 0) return new Set();
  return new Set(Object.keys(rows[0]));
}

/**
 * Build the set of fields available after walking transforms sequentially.
 * Aggregate is destructive — it replaces available fields with groupby + as aliases.
 */
function buildAvailableFields(
  baseColumns: Set<string>,
  transforms: Array<Record<string, unknown>> | undefined
): Set<string> {
  const available = new Set(baseColumns);
  if (!Array.isArray(transforms)) return available;

  for (const t of transforms) {
    // Aggregate: destructive — only groupby fields and as aliases survive
    if (Array.isArray(t.aggregate)) {
      const groupby = (t.groupby as string[]) ?? [];
      const survivors = new Set(groupby);
      for (const agg of t.aggregate as Array<Record<string, unknown>>) {
        if (typeof agg.as === "string") survivors.add(agg.as);
      }
      available.clear();
      for (const f of survivors) available.add(f);
    }

    // Lookup: adds from.fields
    if (t.lookup && t.from && typeof t.from === "object") {
      const from = t.from as Record<string, unknown>;
      const fields = from.fields as string[] | undefined;
      // Also check top-level fields (common mistake that injectData fixes)
      const topFields = t.fields as string[] | undefined;
      for (const f of fields ?? topFields ?? []) available.add(f);
    }

    // Calculate: adds as
    if (typeof t.calculate === "string" && typeof t.as === "string") {
      available.add(t.as);
    }

    // Fold: adds as values (defaults to ["key", "value"])
    if (Array.isArray(t.fold)) {
      const foldAs = (t.as as string[]) ?? ["key", "value"];
      for (const f of foldAs) available.add(f);
    }

    // Flatten: adds as values or the flattened field names
    if (Array.isArray(t.flatten)) {
      const flatAs = t.as as string[] | undefined;
      for (let i = 0; i < (t.flatten as string[]).length; i++) {
        available.add(flatAs?.[i] ?? (t.flatten as string[])[i]);
      }
    }

    // Window: adds as aliases
    if (Array.isArray(t.window)) {
      for (const w of t.window as Array<Record<string, unknown>>) {
        if (typeof w.as === "string") available.add(w.as);
      }
    }

    // Bin: adds as or bin_<field> variants
    if (t.bin !== undefined && typeof t.field === "string") {
      if (typeof t.as === "string") {
        available.add(t.as);
      } else if (Array.isArray(t.as)) {
        for (const a of t.as as string[]) available.add(a);
      }
    }

    // TimeUnit: adds as or <timeUnit>_<field>
    if (typeof t.timeUnit === "string" && typeof t.field === "string") {
      if (typeof t.as === "string") {
        available.add(t.as);
      } else {
        available.add(`${t.timeUnit}_${t.field}`);
      }
    }
  }

  return available;
}

/** Extract mark type from a mark spec (handles string and object forms) */
function getMarkType(mark: unknown): string | null {
  if (typeof mark === "string") return mark;
  if (mark && typeof mark === "object" && typeof (mark as Record<string, unknown>).type === "string") {
    return (mark as Record<string, unknown>).type as string;
  }
  return null;
}

/** Get encoding channel info: { field, type, aggregate, sort } */
function getChannelInfo(enc: Record<string, unknown>, channel: string): Record<string, unknown> | null {
  const ch = enc[channel];
  if (ch && typeof ch === "object") return ch as Record<string, unknown>;
  return null;
}

/** Collect encoding channels with their full info from a spec (including nested compositions) */
function collectTemporalChannels(spec: Record<string, unknown>): Array<{ field: string; hasTimeUnit: boolean }> {
  const results: Array<{ field: string; hasTimeUnit: boolean }> = [];
  const enc = spec.encoding as Record<string, Record<string, unknown>> | undefined;
  if (enc) {
    for (const ch of Object.values(enc)) {
      if (ch && typeof ch === "object" && ch.type === "temporal" && typeof ch.field === "string") {
        results.push({ field: ch.field, hasTimeUnit: typeof ch.timeUnit === "string" });
      }
    }
  }
  for (const sub of getSubSpecs(spec)) {
    results.push(...collectTemporalChannels(sub));
  }
  return results;
}

/** Check if a value looks like a plain number (not a date string) */
function isPlainNumber(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value === "string" && /^\d{1,4}$/.test(value.trim())) return true;
  return false;
}

/** Lint for numeric fields encoded as temporal (produces millisecond-epoch garbage) */
function lintTemporalNumeric(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string[] {
  const warnings: string[] = [];
  const temporalChannels = collectTemporalChannels(spec);
  if (temporalChannels.length === 0) return warnings;

  // Collect fields created by calculate transforms (likely datetime() conversions)
  const calculateFields = new Set<string>();
  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(transforms)) {
    for (const t of transforms) {
      if (typeof t.calculate === "string" && typeof t.as === "string") {
        calculateFields.add(t.as);
      }
    }
  }

  const primaryKey = getPrimaryDatasetKey(spec, datasets);
  const rows = primaryKey ? datasets[primaryKey] : undefined;
  if (!rows || rows.length === 0) return warnings;

  for (const { field, hasTimeUnit } of temporalChannels) {
    // Skip if timeUnit is set (user is handling the conversion)
    if (hasTimeUnit) continue;
    // Skip if field was created by a calculate transform
    if (calculateFields.has(field)) continue;

    // Sample up to 10 non-null values
    const samples: unknown[] = [];
    for (const row of rows) {
      const v = row[field];
      if (v != null && v !== "") {
        samples.push(v);
        if (samples.length >= 10) break;
      }
    }

    if (samples.length > 0 && samples.every(isPlainNumber)) {
      warnings.push(
        `Field "${field}" is encoded as temporal but contains plain numbers (e.g. ${samples[0]}). ` +
        `Vega-Lite interprets numbers as milliseconds since epoch, producing wrong axis labels. ` +
        `Use "type": "ordinal" for labels, or add a calculate transform: ` +
        `{"calculate": "datetime(datum.${field}, 0, 1)", "as": "${field}_date"}`
      );
    }
  }

  return warnings;
}

/** Lint for common spec patterns that produce silently wrong output */
function lintSpecPatterns(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string[] {
  const warnings: string[] = [];

  // --- Rule mark in layer with shared categorical encoding ---
  const layers = spec.layer as Array<Record<string, unknown>> | undefined;
  const topEnc = spec.encoding as Record<string, unknown> | undefined;
  if (Array.isArray(layers) && topEnc) {
    const hasRuleLayer = layers.some((l) => getMarkType(l.mark) === "rule");
    if (hasRuleLayer) {
      const xInfo = getChannelInfo(topEnc, "x");
      const yInfo = getChannelInfo(topEnc, "y");
      const xIsCategorical = xInfo && (xInfo.type === "nominal" || xInfo.type === "ordinal");
      const yIsCategorical = yInfo && (yInfo.type === "nominal" || yInfo.type === "ordinal");
      if (xIsCategorical || yIsCategorical) {
        warnings.push(
          `A rule mark in a layer inherits shared categorical encoding. ` +
          `This renders vertical/horizontal lines at each category instead of a single reference line. ` +
          `Move each layer's encoding inside the layer object instead of sharing at top level.`
        );
      }
    }
  }

  // --- Scatter (point) with inline aggregate but no transform groupby ---
  // Check top-level mark and marks inside layers
  const specsToCheck: Array<Record<string, unknown>> = [spec];
  if (Array.isArray(layers)) {
    for (const l of layers) {
      if (l && typeof l === "object") specsToCheck.push(l);
    }
  }
  for (const s of specsToCheck) {
    const sMarkType = getMarkType(s.mark);
    const sEnc = s.encoding as Record<string, Record<string, unknown>> | undefined;
    if (sMarkType === "point" && sEnc) {
      const hasInlineAggregate = Object.values(sEnc).some(
        (ch) => ch && typeof ch === "object" && typeof ch.aggregate === "string"
      );
      const transforms = (s.transform ?? spec.transform) as Array<Record<string, unknown>> | undefined;
      const hasTransformGroupby = Array.isArray(transforms) && transforms.some(
        (t) => Array.isArray(t.aggregate) && Array.isArray(t.groupby) && (t.groupby as string[]).length > 0
      );
      if (hasInlineAggregate && !hasTransformGroupby) {
        warnings.push(
          `Point/scatter mark with inline aggregate may collapse all data to a single point. ` +
          `Use a transform with explicit "groupby" instead of inline aggregate in encoding.`
        );
      }
    }
  }

  // --- High cardinality checks (axis, shape, color) ---
  const enc = spec.encoding as Record<string, Record<string, unknown>> | undefined;
  if (enc) {
    const primaryKey = getPrimaryDatasetKey(spec, datasets);
    const rows = primaryKey ? datasets[primaryKey] : undefined;

    for (const [channel, chSpec] of Object.entries(enc)) {
      if (!chSpec || typeof chSpec !== "object") continue;
      const chType = (chSpec as Record<string, unknown>).type;
      const chField = (chSpec as Record<string, unknown>).field;
      if (typeof chField !== "string") continue;

      // Count unique values for this field in the dataset
      let uniqueCount: number | null = null;
      if (rows && rows.length > 0) {
        const uniqueValues = new Set(rows.map((r) => r[chField]));
        uniqueCount = uniqueValues.size;
      }

      // High cardinality nominal axis (x/y)
      if ((channel === "x" || channel === "y") && chType === "nominal" && uniqueCount !== null && uniqueCount > 20) {
        warnings.push(
          `Field "${chField}" on ${channel}-axis has ${uniqueCount} unique values. ` +
          `Consider filtering to top/bottom N for readability.`
        );
      }

      // Shape channel: Vega-Lite only has 6 built-in shapes
      if (channel === "shape" && uniqueCount !== null && uniqueCount > 6) {
        warnings.push(
          `Field "${chField}" in shape encoding has ${uniqueCount} unique values, but Vega-Lite only supports 6 distinct shapes. ` +
          `Values beyond 6 will reuse shapes, making them indistinguishable. ` +
          `Consider using color instead, or filter to ≤6 categories.`
        );
      }

      // Color channel with nominal type: warn if too many categories for legend
      if (channel === "color" && chType === "nominal" && uniqueCount !== null && uniqueCount > 20) {
        warnings.push(
          `Field "${chField}" in color encoding has ${uniqueCount} unique values. ` +
          `The legend will be very long and colors hard to distinguish. ` +
          `Consider filtering to top/bottom N or grouping smaller categories.`
        );
      }
    }
  }

  // Recurse into sub-specs (hconcat, vconcat, concat, facet/repeat inner spec)
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintSpecPatterns(sub, datasets));
  }

  return warnings;
}

/** Find the groupby array from the first aggregate transform, if any */
function findAggregateGroupby(transforms: Array<Record<string, unknown>> | undefined): string[] | null {
  if (!Array.isArray(transforms)) return null;
  for (const t of transforms) {
    if (Array.isArray(t.aggregate)) {
      return (t.groupby as string[]) ?? [];
    }
  }
  return null;
}

/** Check that every encoding field is available in the primary dataset or created by transforms */
function lintFieldReferences(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string[] {
  const warnings: string[] = [];

  const primaryKey = getPrimaryDatasetKey(spec, datasets);
  if (!primaryKey) return warnings;

  const primaryColumns = getColumns(datasets, primaryKey);
  if (primaryColumns.size === 0) return warnings;

  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;
  const available = buildAvailableFields(primaryColumns, transforms);
  const aggregateGroupby = findAggregateGroupby(transforms);

  const encFields = collectEncodingFields(spec);

  for (const field of encFields) {
    if (available.has(field)) continue;

    // Check if the field exists in the original dataset but was dropped by aggregate
    if (aggregateGroupby !== null && primaryColumns.has(field)) {
      warnings.push(
        `Field "${field}" exists in the dataset but is not available after the aggregate transform. ` +
        `Add "${field}" to the aggregate's "groupby" array to preserve it.`
      );
      continue;
    }

    // Check if field exists in another dataset
    let foundIn: string | null = null;
    for (const [dsKey, rows] of Object.entries(datasets)) {
      if (dsKey === primaryKey || rows.length === 0) continue;
      if (Object.keys(rows[0]).includes(field)) {
        foundIn = dsKey;
        break;
      }
    }

    if (foundIn) {
      // Find shared join keys between primary and the dataset containing the field
      const otherColumns = getColumns(datasets, foundIn);
      const sharedKeys = [...primaryColumns].filter(c => otherColumns.has(c));
      const keyHint = sharedKeys.length > 0
        ? ` using shared key "${sharedKeys[0]}"`
        : "";
      warnings.push(
        `Field "${field}" is not in "${primaryKey}". ` +
        `It exists in "${foundIn}" — add a lookup transform${keyHint} to join it.`
      );
    } else {
      warnings.push(
        `Field "${field}" not found in any loaded dataset or transform alias.`
      );
    }
  }

  return warnings;
}

export function validateSpec(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): { valid: true; warnings: string[] } | { valid: false; error: string } {
  if (typeof spec.$schema === "string") {
    const schemaUrl = spec.$schema;
    if (!/^https:\/\/vega\.github\.io\/schema\/vega-lite\/v6\.json$/.test(schemaUrl)) {
      return {
        valid: false,
        error: `Invalid $schema: "${schemaUrl}". Must be a valid Vega-Lite v6 schema URL (https://vega.github.io/schema/vega-lite/v6.json), or omit $schema entirely.`,
      };
    }
  }

  try {
    const fullSpec = injectData(spec, datasets);
    const warnings: string[] = [];
    // Lint for common transform issues before compiling
    warnings.push(...lintTransforms(spec));
    warnings.push(...lintFieldReferences(spec, datasets));
    warnings.push(...lintTemporalNumeric(spec, datasets));
    warnings.push(...lintSpecPatterns(spec, datasets));
    vl.compile(fullSpec as unknown as vl.TopLevelSpec, {
      logger: createWarningLogger(warnings),
    });
    return { valid: true, warnings };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
