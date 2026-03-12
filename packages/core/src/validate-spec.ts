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

/** Collect field references from this spec's own encoding channels only (no recursion) */
function getOwnEncodingFields(spec: Record<string, unknown>): string[] {
  const fields: string[] = [];
  const enc = spec.encoding as Record<string, Record<string, unknown>> | undefined;
  if (enc) {
    for (const ch of Object.values(enc)) {
      if (Array.isArray(ch)) {
        for (const item of ch) {
          if (item && typeof item === "object" && typeof item.field === "string") {
            fields.push(item.field);
          }
        }
      } else if (ch && typeof ch === "object" && typeof ch.field === "string") {
        fields.push(ch.field);
      }
    }
  }
  return fields;
}


/** Extract datum.fieldName references from a filter expression string */
function extractDatumRefs(expr: string): string[] {
  const refs: string[] = [];
  // Match datum.fieldName or datum['field name'] or datum["field name"]
  const dotPattern = /datum\.([a-zA-Z_$][\w$]*)/g;
  const bracketPattern = /datum\[['"](.+?)['"]\]/g;
  let m;
  while ((m = dotPattern.exec(expr)) !== null) refs.push(m[1]);
  while ((m = bracketPattern.exec(expr)) !== null) refs.push(m[1]);
  return refs;
}

/** Lint for transforms referencing fields that haven't been created yet (wrong ordering) */
function lintTransformOrder(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string[] {
  const warnings: string[] = [];
  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(transforms)) return warnings;

  const primaryKey = getPrimaryDatasetKey(spec, datasets);
  const baseColumns = primaryKey ? getColumns(datasets, primaryKey) : new Set<string>();
  const available = new Set(baseColumns);

  for (const t of transforms) {
    // Check filter references BEFORE this transform adds fields
    if (typeof t.filter === "string") {
      for (const ref of extractDatumRefs(t.filter)) {
        if (!available.has(ref)) {
          warnings.push(
            `Filter references "datum.${ref}" but "${ref}" is not available at this point in the transform pipeline. ` +
            `Move the transform that creates "${ref}" before this filter.`
          );
        }
      }
    } else if (t.filter && typeof t.filter === "object") {
      const pred = t.filter as Record<string, unknown>;
      if (typeof pred.field === "string" && !available.has(pred.field)) {
        warnings.push(
          `Filter references field "${pred.field}" but it is not available at this point in the transform pipeline. ` +
          `Move the transform that creates "${pred.field}" before this filter.`
        );
      }
    }

    // Check window sort references BEFORE this transform adds fields
    if (Array.isArray(t.window) && Array.isArray(t.sort)) {
      for (const s of t.sort as Array<Record<string, unknown>>) {
        if (typeof s.field === "string" && !available.has(s.field)) {
          warnings.push(
            `Window sort references "${s.field}" but it is not available at this point in the transform pipeline. ` +
            `Move the transform that creates "${s.field}" before this window.`
          );
        }
      }
    }

    // Check fold references columns that exist
    if (Array.isArray(t.fold)) {
      for (const col of t.fold as string[]) {
        if (typeof col === "string" && !available.has(col)) {
          const sample = [...available].slice(0, 5).join(", ");
          warnings.push(
            `Fold references column "${col}" but it doesn't exist at this point in the transform pipeline. ` +
            `Available columns include: ${sample}.`
          );
        }
      }
    }

    // Update available fields after this transform
    applyTransformFields(available, t);
  }

  // Recurse into sub-specs
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintTransformOrder(sub, datasets));
  }

  return warnings;
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

    // Check for rank (not dense_rank) after joinaggregate — causes rank gaps
    let seenJoinAggregate = false;
    for (const t of transforms) {
      if (Array.isArray(t.joinaggregate)) seenJoinAggregate = true;
      if (seenJoinAggregate && Array.isArray(t.window)) {
        for (const w of t.window as Array<Record<string, unknown>>) {
          if (w.op === "rank") {
            warnings.push(
              `Window uses "rank" after a joinaggregate. With joinaggregate, many rows share the same sort value, ` +
              `so "rank" skips numbers (e.g. 1, 1, 1, ..., 51) and top-N filters keep only 1 group. ` +
              `Use "dense_rank" instead — it assigns consecutive ranks (1, 2, 3) without gaps.`
            );
          }
        }
      }
    }

    // Check for redundant double-aggregate (transform output + inline encoding aggregate)
    const aggregatedOutputFields = new Set<string>();
    for (const t of transforms) {
      if (Array.isArray(t.aggregate)) {
        for (const agg of t.aggregate as Array<Record<string, unknown>>) {
          if (typeof agg.as === "string") aggregatedOutputFields.add(agg.as);
        }
      }
      if (Array.isArray(t.joinaggregate)) {
        for (const agg of t.joinaggregate as Array<Record<string, unknown>>) {
          if (typeof agg.as === "string") aggregatedOutputFields.add(agg.as);
        }
      }
      if (Array.isArray(t.window)) {
        for (const w of t.window as Array<Record<string, unknown>>) {
          if (typeof w.as === "string") aggregatedOutputFields.add(w.as);
        }
      }
    }
    if (aggregatedOutputFields.size > 0) {
      const encSpec = spec.encoding as Record<string, Record<string, unknown>> | undefined;
      if (encSpec) {
        for (const [channel, chSpec] of Object.entries(encSpec)) {
          if (chSpec && typeof chSpec === "object" && typeof chSpec.aggregate === "string" && typeof chSpec.field === "string") {
            if (aggregatedOutputFields.has(chSpec.field)) {
              warnings.push(
                `Field "${chSpec.field}" is already aggregated by a transform. ` +
                `Inline aggregate "${chSpec.aggregate}" on the ${channel} encoding will double-aggregate it. ` +
                `Remove the inline aggregate.`
              );
            }
          }
        }
      }
    }

    // Check if encoding references original field instead of the alias
    if (aliasMap.size > 0) {
      const encFields = getOwnEncodingFields(spec);
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

/** Apply a single transform's field effects to the available set (mutates in place) */
function applyTransformFields(available: Set<string>, t: Record<string, unknown>): void {
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
  // JoinAggregate: non-destructive — adds as aliases while keeping all fields
  if (Array.isArray(t.joinaggregate)) {
    for (const agg of t.joinaggregate as Array<Record<string, unknown>>) {
      if (typeof agg.as === "string") available.add(agg.as);
    }
  }
  // Window: adds as aliases
  if (Array.isArray(t.window)) {
    for (const w of t.window as Array<Record<string, unknown>>) {
      if (typeof w.as === "string") available.add(w.as);
    }
  }
  // Regression/Loess: adds as values
  if ((typeof t.regression === "string" || typeof t.loess === "string") && Array.isArray(t.as)) {
    for (const a of t.as as string[]) available.add(a);
  }
  // Bin: adds as or auto-generated bin_<field> variants
  if (t.bin !== undefined && typeof t.field === "string") {
    if (typeof t.as === "string") {
      available.add(t.as);
    } else if (Array.isArray(t.as)) {
      for (const a of t.as as string[]) available.add(a);
    } else {
      // No explicit "as" — Vega-Lite auto-generates bin field names
      // Add common patterns so downstream references don't produce false warnings
      const maxbins = (typeof t.bin === "object" && t.bin !== null)
        ? (t.bin as Record<string, unknown>).maxbins ?? 10
        : 10;
      available.add(`bin_maxbins_${maxbins}_${t.field}`);
      available.add(`bin_maxbins_${maxbins}_${t.field}_end`);
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
  for (const t of transforms) applyTransformFields(available, t);
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

  // Check for timeUnit on non-temporal data (any encoding channel except temporal type)
  // Recurse into sub-specs since they share the same dataset
  function checkTimeUnitOnNonTemporal(s: Record<string, unknown>, calcFields: Set<string>): void {
    // Collect calculate fields from this spec's transforms too
    const localCalcFields = new Set(calcFields);
    const localTransforms = s.transform as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(localTransforms)) {
      for (const t of localTransforms) {
        if (typeof t.calculate === "string" && typeof t.as === "string") {
          localCalcFields.add(t.as);
        }
      }
    }

    const enc = s.encoding as Record<string, Record<string, unknown>> | undefined;
    if (enc) {
      for (const [, chSpec] of Object.entries(enc)) {
        if (!chSpec || typeof chSpec !== "object") continue;
        if (typeof chSpec.timeUnit !== "string" || typeof chSpec.field !== "string") continue;
        if (chSpec.type === "temporal") continue;
        if (localCalcFields.has(chSpec.field)) continue;

        const tuSamples: unknown[] = [];
        for (const row of rows!) {
          const v = row[chSpec.field];
          if (v != null && v !== "") {
            tuSamples.push(v);
            if (tuSamples.length >= 10) break;
          }
        }
        if (tuSamples.length === 0) continue;

        const allPlainNumbers = tuSamples.every(isPlainNumber);
        const allNonDateStrings = tuSamples.every((v) => {
          if (typeof v === "number") return true;
          if (typeof v === "string") return isNaN(Date.parse(v));
          return true;
        });

        if (allPlainNumbers || allNonDateStrings) {
          warnings.push(
            `Encoding uses timeUnit "${chSpec.timeUnit}" on field "${chSpec.field}" ` +
            `but data values are plain numbers/strings (e.g. ${tuSamples[0]}), not dates. ` +
            `Remove timeUnit or convert data to date format.`
          );
        }
      }
    }
    for (const sub of getSubSpecs(s)) {
      checkTimeUnitOnNonTemporal(sub, localCalcFields);
    }
  }
  checkTimeUnitOnNonTemporal(spec, calculateFields);

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
        `Use "type": "quantitative" with "axis": {"format": "d"} to display as integers, ` +
        `or "type": "ordinal" for evenly-spaced labels.`
      );
    }
  }

  return warnings;
}

/** Non-summable field name patterns — stacking these values produces misleading totals */
const NON_SUMMABLE_PATTERN = /temperature|temp|rate|percent|pct|average|avg|mean|median|price|index|ratio|score/i;

/** Summable keywords — if a field matches NON_SUMMABLE_PATTERN but also contains one of these,
 *  it's likely a summable aggregate (e.g. "average_count", "price_total") and should NOT be flagged */
const SUMMABLE_OVERRIDE_PATTERN = /count|total|sum|quantity|population|revenue|sales|amount|units|volume/i;

function isNonSummableField(field: string): boolean {
  return NON_SUMMABLE_PATTERN.test(field) && !SUMMABLE_OVERRIDE_PATTERN.test(field);
}

/** Check if stacking is enabled (not explicitly disabled) on a mark+channel */
function isStackEnabled(mark: unknown, yChannel: Record<string, unknown> | null): boolean {
  if (yChannel?.stack === false || yChannel?.stack === null) return false;
  if (mark && typeof mark === "object") {
    const m = mark as Record<string, unknown>;
    if (m.stack === false || m.stack === null) return false;
  }
  return true;
}

/** Lint for stacking non-summable values (temperatures, rates, prices, etc.) */
function lintStackingNonSummable(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string[] {
  const warnings: string[] = [];

  // Check a single unit spec for stacking issues
  function checkUnit(
    mark: unknown,
    enc: Record<string, Record<string, unknown>> | undefined,
  ): void {
    if (!enc) return;
    const markType = getMarkType(mark);
    if (markType !== "bar" && markType !== "area") return;

    const yInfo = getChannelInfo(enc as Record<string, unknown>, "y");
    const colorInfo = getChannelInfo(enc as Record<string, unknown>, "color");
    if (!yInfo || !colorInfo) return; // no stacking without color
    if (yInfo.type !== "quantitative") return;
    if (!isStackEnabled(mark, yInfo)) return;

    const field = yInfo.field;
    if (typeof field === "string" && isNonSummableField(field)) {
      warnings.push(
        `Field "${field}" on a stacked ${markType} looks non-summable ` +
        `(temperatures, rates, prices should not be added together). ` +
        `Use "stack": false on the y encoding, or switch to a line/point mark.`
      );
    }
  }

  // Check top-level unit spec
  checkUnit(spec.mark, spec.encoding as Record<string, Record<string, unknown>> | undefined);

  // Check layers with encoding inheritance
  const layers = spec.layer as Array<Record<string, unknown>> | undefined;
  const topEnc = spec.encoding as Record<string, Record<string, unknown>> | undefined;
  if (Array.isArray(layers)) {
    for (const layer of layers) {
      const merged = topEnc
        ? { ...topEnc, ...(layer.encoding as Record<string, Record<string, unknown>> | undefined) }
        : (layer.encoding as Record<string, Record<string, unknown>> | undefined);
      checkUnit(layer.mark, merged);
    }
  }

  // Recurse into sub-specs
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintStackingNonSummable(sub, datasets));
  }

  return warnings;
}

/** Lint for log scale on fields containing zero or negative values */
function lintScaleIssues(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string[] {
  const warnings: string[] = [];
  const enc = spec.encoding as Record<string, Record<string, unknown>> | undefined;

  if (enc) {
    // Collect fields created by transforms (can't sample computed values)
    const computedFields = new Set<string>();
    const transforms = spec.transform as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(transforms)) {
      for (const t of transforms) {
        if (typeof t.as === "string") computedFields.add(t.as);
        if (Array.isArray(t.as)) for (const a of t.as as string[]) computedFields.add(a);
        if (Array.isArray(t.aggregate)) {
          for (const agg of t.aggregate as Array<Record<string, unknown>>) {
            if (typeof agg.as === "string") computedFields.add(agg.as);
          }
        }
        if (Array.isArray(t.joinaggregate)) {
          for (const agg of t.joinaggregate as Array<Record<string, unknown>>) {
            if (typeof agg.as === "string") computedFields.add(agg.as);
          }
        }
        if (Array.isArray(t.window)) {
          for (const w of t.window as Array<Record<string, unknown>>) {
            if (typeof w.as === "string") computedFields.add(w.as);
          }
        }
      }
    }

    const primaryKey = getPrimaryDatasetKey(spec, datasets);
    const rows = primaryKey ? datasets[primaryKey] : undefined;

    for (const [channel, chSpec] of Object.entries(enc)) {
      if (!chSpec || typeof chSpec !== "object") continue;
      const scale = chSpec.scale as Record<string, unknown> | undefined;
      if (!scale || typeof scale !== "object") continue;
      if (scale.type !== "log") continue;

      const field = chSpec.field;

      // Check explicit domain includes zero
      if (Array.isArray(scale.domain) && scale.domain.some((v: unknown) => v === 0)) {
        warnings.push(
          `Log scale on "${channel}" has domain including zero. ` +
          `Log(0) is undefined — use a linear scale or set domain minimum > 0.`
        );
        continue;
      }

      // Check data for zero/negative values (skip computed fields)
      if (typeof field === "string" && !computedFields.has(field) && rows && rows.length > 0) {
        const hasNonPositive = rows.some((r) => {
          const v = r[field];
          return typeof v === "number" && v <= 0;
        });
        if (hasNonPositive) {
          warnings.push(
            `Log scale on "${channel}" but field "${field}" contains zero or negative values. ` +
            `Log(0) is undefined. Filter out non-positive values or use a symlog/linear scale.`
          );
        }
      }
    }
  }

  // Recurse into sub-specs
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintScaleIssues(sub, datasets));
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

  // --- Arc/pie without theta encoding ---
  const markType = getMarkType(spec.mark);
  if (markType === "arc") {
    const arcEnc = spec.encoding as Record<string, unknown> | undefined;
    if (!arcEnc || !arcEnc.theta) {
      warnings.push(
        `Arc/pie mark requires a "theta" encoding channel for angular extent. ` +
        `Without it the chart renders as a full circle.`
      );
    }
  }

  // --- Bin on non-numeric field ---
  const binEnc = spec.encoding as Record<string, Record<string, unknown>> | undefined;
  if (binEnc) {
    const primaryKey = getPrimaryDatasetKey(spec, datasets);
    const rows = primaryKey ? datasets[primaryKey] : undefined;
    for (const [, chSpec] of Object.entries(binEnc)) {
      if (!chSpec || typeof chSpec !== "object") continue;
      if (chSpec.bin && typeof chSpec.field === "string" && rows && rows.length > 0) {
        const field = chSpec.field as string;
        const sample = rows.slice(0, 50);
        const numericCount = sample.filter((r) => {
          const v = r[field];
          return typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)));
        }).length;
        if (numericCount / sample.length < 0.5) {
          warnings.push(
            `Bin on field "${field}" but data values are strings. Bin requires numeric or temporal data.`
          );
        }
      }
    }
  }

  // --- High cardinality checks (axis, shape, color) + same field x/y + nominal on numeric ---
  const enc = spec.encoding as Record<string, Record<string, unknown>> | undefined;
  if (enc) {
    // --- Same field on both x and y ---
    const xInfo = enc.x as Record<string, unknown> | undefined;
    const yInfo = enc.y as Record<string, unknown> | undefined;
    if (xInfo && yInfo && typeof xInfo.field === "string" && xInfo.field === yInfo.field) {
      const xAgg = xInfo.aggregate;
      const yAgg = yInfo.aggregate;
      if (xAgg === yAgg) {
        warnings.push(
          `Same field "${xInfo.field}" on both x and y axes. ` +
          `This plots values against themselves. Use different fields for each axis.`
        );
      }
    }

    const primaryKey = getPrimaryDatasetKey(spec, datasets);
    const rows = primaryKey ? datasets[primaryKey] : undefined;

    // Collect fields referenced by filter transforms (already handled by user)
    const filteredFields = new Set<string>();
    const transforms = spec.transform as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(transforms)) {
      for (const t of transforms) {
        if (typeof t.filter === "string") {
          for (const ref of extractDatumRefs(t.filter)) filteredFields.add(ref);
        } else if (t.filter && typeof t.filter === "object") {
          const pred = t.filter as Record<string, unknown>;
          if (typeof pred.field === "string") filteredFields.add(pred.field);
        }
      }
    }

    // Also check if ALL sub-specs (layers) filter the same field —
    // if so, treat it as filtered at the parent level too.
    const subSpecs = getSubSpecs(spec);
    if (subSpecs.length > 0) {
      const perSubFiltered = subSpecs.map((sub) => {
        const subFields = new Set<string>();
        const subTransforms = sub.transform as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(subTransforms)) {
          for (const t of subTransforms) {
            if (typeof t.filter === "string") {
              for (const ref of extractDatumRefs(t.filter)) subFields.add(ref);
            } else if (t.filter && typeof t.filter === "object") {
              const pred = t.filter as Record<string, unknown>;
              if (typeof pred.field === "string") subFields.add(pred.field);
            }
          }
        }
        return subFields;
      });
      for (const field of perSubFiltered[0]) {
        if (perSubFiltered.every((s) => s.has(field))) {
          filteredFields.add(field);
        }
      }
    }

    for (const [channel, chSpec] of Object.entries(enc)) {
      if (!chSpec || typeof chSpec !== "object") continue;
      const chType = (chSpec as Record<string, unknown>).type;
      const chField = (chSpec as Record<string, unknown>).field;
      if (typeof chField !== "string") continue;

      // Skip cardinality check if the field is already being filtered
      if (filteredFields.has(chField)) continue;

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

      // Nominal/ordinal on continuous numeric field (>20 unique numeric values)
      if ((chType === "nominal" || chType === "ordinal") && uniqueCount !== null && uniqueCount > 20 && rows) {
        const numericCount = rows.filter((r) => {
          const v = r[chField];
          return typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)));
        }).length;
        if (numericCount / rows.length > 0.9) {
          warnings.push(
            `Field "${chField}" is encoded as ${chType} but contains ${uniqueCount} unique numeric values. ` +
            `This creates ${uniqueCount} discrete categories instead of a continuous axis. ` +
            `Use "quantitative" type, or bin the values.`
          );
        }
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

/** Check if transforms after the first aggregate include a window transform (ranking pattern) */
function hasWindowAfterAggregate(transforms: Array<Record<string, unknown>> | undefined): boolean {
  if (!Array.isArray(transforms)) return false;
  let seenAggregate = false;
  for (const t of transforms) {
    if (Array.isArray(t.aggregate)) seenAggregate = true;
    if (seenAggregate && Array.isArray(t.window)) return true;
  }
  return false;
}

/** Check that every encoding field is available in the primary dataset or created by transforms.
 *  Recurses into sub-specs (layers, concat panels) so each level is checked against its own available fields. */
function lintFieldReferences(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>,
  inherited?: { available: Set<string>; primaryKey: string; primaryColumns: Set<string> }
): string[] {
  const warnings: string[] = [];

  let primaryKey: string;
  let primaryColumns: Set<string>;
  let baseAvailable: Set<string>;

  // Sub-specs with their own data are checked independently
  const subData = spec.data as Record<string, unknown> | undefined;
  if (inherited && !(subData && typeof subData.url === "string" && datasets[subData.url])) {
    // Inherit parent's available fields (e.g., layer inheriting top-level transforms)
    primaryKey = inherited.primaryKey;
    primaryColumns = inherited.primaryColumns;
    baseAvailable = inherited.available;
  } else {
    // Root call or sub-spec with its own data
    const pk = getPrimaryDatasetKey(spec, datasets);
    if (!pk) return warnings;
    primaryKey = pk;
    primaryColumns = getColumns(datasets, primaryKey);
    if (primaryColumns.size === 0) return warnings;
    baseAvailable = new Set(primaryColumns);
  }

  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;
  const available = buildAvailableFields(baseAvailable, transforms);
  const aggregateGroupby = findAggregateGroupby(transforms);

  // Only check THIS spec's own encoding fields (sub-specs are checked recursively)
  const ownFields = getOwnEncodingFields(spec);

  for (const field of ownFields) {
    if (available.has(field)) continue;

    // Check if the field exists in the original dataset but was dropped by aggregate
    if (primaryColumns.has(field)) {
      if (aggregateGroupby !== null) {
        // This spec's own aggregate dropped the field
        if (hasWindowAfterAggregate(transforms)) {
          warnings.push(
            `Field "${field}" exists in the dataset but is not available after the aggregate transform. ` +
            `This looks like a top-N ranking pattern (aggregate → window → filter). ` +
            `Use "joinaggregate" instead of "aggregate" to preserve all original rows ` +
            `while adding the computed field for ranking.`
          );
        } else {
          warnings.push(
            `Field "${field}" exists in the dataset but is not available after the aggregate transform. ` +
            `Add "${field}" to the aggregate's "groupby" array to preserve it.`
          );
        }
      } else {
        // Field is in dataset but not available — likely dropped by a parent aggregate
        warnings.push(
          `Field "${field}" exists in the dataset but is not available — likely dropped by an aggregate transform. ` +
          `Use "joinaggregate" instead of "aggregate" to preserve all rows, or add "${field}" to "groupby".`
        );
      }
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

  // Recurse into sub-specs, passing current available fields for inheritance
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintFieldReferences(sub, datasets, {
      available,
      primaryKey,
      primaryColumns,
    }));
  }

  return warnings;
}

/** d3-format specifier regex (from d3-format source) */
const D3_FORMAT_RE = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([bcdeEfgGnopsrXx%])?$/;

/** Valid d3-time-format directives */
const TIME_DIRECTIVES = new Set("aAbBcdefgGHIjLmMpqQsSuUVwWxXyYZ%".split(""));

function isValidD3Format(fmt: string): boolean {
  return D3_FORMAT_RE.test(fmt);
}

function findInvalidTimeDirectives(fmt: string): string[] {
  const invalid: string[] = [];
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] === "%" && i + 1 < fmt.length) {
      const next = fmt[i + 1];
      // Skip padding modifiers: %-d, %_d, %0d
      if (next === "-" || next === "_" || next === "0") {
        if (i + 2 < fmt.length && TIME_DIRECTIVES.has(fmt[i + 2])) {
          i += 2;
          continue;
        }
      }
      if (!TIME_DIRECTIVES.has(next)) {
        invalid.push(`%${next}`);
      }
      i++; // skip the directive char
    }
  }
  return invalid;
}

/** Determine if a channel should use time-format validation */
function isTemporalChannel(chSpec: Record<string, unknown>): boolean {
  if (chSpec.formatType === "time") return true;
  if (chSpec.type === "temporal") return true;
  return false;
}

/** Check if an object has a custom formatType (not "number" or "time") */
function hasCustomFormatType(obj: Record<string, unknown>): boolean {
  return typeof obj.formatType === "string" && obj.formatType !== "number" && obj.formatType !== "time";
}

/** Valid top-level keys for each Vega-Lite transform type */
const TRANSFORM_KEYS: Record<string, Set<string>> = {
  aggregate:     new Set(["aggregate", "groupby"]),
  bin:           new Set(["bin", "field", "as"]),
  calculate:     new Set(["calculate", "as"]),
  density:       new Set(["density", "groupby", "cumulative", "counts", "bandwidth", "extent", "minsteps", "maxsteps", "steps", "as", "resolve"]),
  extent:        new Set(["extent", "param"]),
  filter:        new Set(["filter"]),
  flatten:       new Set(["flatten", "as"]),
  fold:          new Set(["fold", "as"]),
  impute:        new Set(["impute", "key", "keyvals", "groupby", "method", "value", "frame"]),
  joinaggregate: new Set(["joinaggregate", "groupby"]),
  loess:         new Set(["loess", "on", "groupby", "bandwidth", "as"]),
  lookup:        new Set(["lookup", "from", "as", "default"]),
  pivot:         new Set(["pivot", "value", "groupby", "limit", "op"]),
  quantile:      new Set(["quantile", "groupby", "probs", "step", "as"]),
  regression:    new Set(["regression", "on", "groupby", "method", "order", "extent", "params", "as"]),
  sample:        new Set(["sample"]),
  stack:         new Set(["stack", "groupby", "offset", "sort", "as"]),
  timeUnit:      new Set(["timeUnit", "field", "as"]),
  window:        new Set(["window", "frame", "ignorePeers", "groupby", "sort"]),
};

/** Identifying keys used to detect which transform type an object is */
const TRANSFORM_IDENTIFIERS: Array<{ key: string; check: (v: unknown) => boolean }> = [
  { key: "aggregate",     check: (v) => Array.isArray(v) },
  { key: "bin",           check: (v) => v === true || (typeof v === "object" && v !== null) },
  { key: "calculate",     check: (v) => typeof v === "string" },
  { key: "density",       check: (v) => typeof v === "string" },
  { key: "filter",        check: (v) => v !== undefined },
  { key: "flatten",       check: (v) => Array.isArray(v) },
  { key: "fold",          check: (v) => Array.isArray(v) },
  { key: "impute",        check: (v) => typeof v === "string" },
  { key: "joinaggregate", check: (v) => Array.isArray(v) },
  { key: "loess",         check: (v) => typeof v === "string" },
  { key: "lookup",        check: (v) => typeof v === "string" },
  { key: "pivot",         check: (v) => typeof v === "string" },
  { key: "quantile",      check: (v) => typeof v === "string" },
  { key: "regression",    check: (v) => typeof v === "string" },
  { key: "sample",        check: (v) => typeof v === "number" },
  { key: "stack",         check: (v) => typeof v === "string" },
  { key: "timeUnit",      check: (v) => typeof v === "string" || (typeof v === "object" && v !== null) },
  { key: "window",        check: (v) => Array.isArray(v) },
  // extent must come after density/regression since those also have "extent" as a valid key
  { key: "extent",        check: (v) => typeof v === "string" },
];

/** Lint for unrecognized top-level keys in transforms */
function lintUnknownTransformKeys(spec: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;

  if (Array.isArray(transforms)) {
    for (const t of transforms) {
      // Identify which transform type this is
      let matched: string | null = null;
      for (const { key, check } of TRANSFORM_IDENTIFIERS) {
        if (key in t && check(t[key])) {
          matched = key;
          break;
        }
      }

      if (!matched) {
        // No identifying key matched — likely a completely malformed transform
        const keys = Object.keys(t).join(", ");
        // Check if it looks like a flat joinaggregate (common LLM mistake)
        if (typeof t.op === "string" && typeof t.as === "string" && Array.isArray(t.groupby)) {
          warnings.push(
            `Transform has top-level "op", "as", and "groupby" but no "joinaggregate" wrapper. ` +
            `Use { "joinaggregate": [{ "op": "${t.op}", "field": "${t.field ?? ""}", "as": "${t.as}" }], "groupby": ${JSON.stringify(t.groupby)} }.`
          );
        } else {
          warnings.push(
            `Unrecognized transform with keys: ${keys}. ` +
            `Each transform must have an identifying key (e.g. "filter", "calculate", "joinaggregate", "window", "aggregate", "fold", "bin", etc.).`
          );
        }
        continue;
      }

      // Check for unrecognized keys
      const validKeys = TRANSFORM_KEYS[matched];
      if (!validKeys) continue;
      const extraKeys = Object.keys(t).filter((k) => !validKeys.has(k));
      if (extraKeys.length > 0) {
        const validList = [...validKeys].join(", ");
        for (const k of extraKeys) {
          warnings.push(
            `Transform "${matched}" has unrecognized key "${k}". ` +
            `Valid keys for ${matched} transforms are: ${validList}.`
          );
        }
      }
    }
  }

  // Recurse into sub-specs
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintUnknownTransformKeys(sub));
  }

  return warnings;
}

/** Lint format strings in encoding channels, axis.format, and legend.format */
function lintFormatStrings(spec: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const enc = spec.encoding as Record<string, Record<string, unknown>> | undefined;

  if (enc) {
    for (const [channel, chSpec] of Object.entries(enc)) {
      if (!chSpec) continue;

      // Handle tooltip arrays: validate each item's format
      if (Array.isArray(chSpec)) {
        for (let i = 0; i < chSpec.length; i++) {
          const item = chSpec[i] as Record<string, unknown>;
          if (!item || typeof item !== "object") continue;
          if (hasCustomFormatType(item)) continue;
          if (typeof item.format === "string") {
            const isTmp = isTemporalChannel(item);
            if (isTmp) {
              const invalid = findInvalidTimeDirectives(item.format);
              if (invalid.length > 0) {
                warnings.push(
                  `Invalid d3-time-format in ${channel}[${i}]: "${item.format}" contains unknown directive(s) ${invalid.join(", ")}. ` +
                  `See https://d3js.org/d3-time-format for valid directives.`
                );
              }
            } else {
              if (!isValidD3Format(item.format)) {
                warnings.push(
                  `Invalid d3-format in ${channel}[${i}]: "${item.format}" is not a valid number format specifier. ` +
                  `See https://d3js.org/d3-format for valid syntax.`
                );
              }
            }
          }
        }
        continue;
      }

      if (typeof chSpec !== "object") continue;

      // Skip custom formatType at channel level (not "number" or "time")
      if (hasCustomFormatType(chSpec)) {
        continue;
      }

      // Collect format strings to check: [format, source label]
      const toCheck: Array<[string, string]> = [];
      const isTemporal = isTemporalChannel(chSpec);

      if (typeof chSpec.format === "string") {
        toCheck.push([chSpec.format, `${channel} encoding`]);
      }
      const axis = chSpec.axis as Record<string, unknown> | undefined;
      if (axis && typeof axis === "object" && typeof axis.format === "string" && !hasCustomFormatType(axis)) {
        toCheck.push([axis.format, `${channel} axis`]);
      }
      const legend = chSpec.legend as Record<string, unknown> | undefined;
      if (legend && typeof legend === "object" && typeof legend.format === "string" && !hasCustomFormatType(legend)) {
        toCheck.push([legend.format, `${channel} legend`]);
      }

      for (const [fmt, source] of toCheck) {
        if (isTemporal) {
          const invalid = findInvalidTimeDirectives(fmt);
          if (invalid.length > 0) {
            warnings.push(
              `Invalid d3-time-format in ${source}: "${fmt}" contains unknown directive(s) ${invalid.join(", ")}. ` +
              `See https://d3js.org/d3-time-format for valid directives.`
            );
          }
        } else {
          if (!isValidD3Format(fmt)) {
            warnings.push(
              `Invalid d3-format in ${source}: "${fmt}" is not a valid number format specifier. ` +
              `See https://d3js.org/d3-format for valid syntax.`
            );
          }
        }
      }
    }
  }

  // Recurse into sub-specs
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintFormatStrings(sub));
  }

  return warnings;
}

/** Lint for groupby fields that don't exist at that point in the pipeline */
function lintGroupbyFields(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string[] {
  const warnings: string[] = [];
  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;

  if (Array.isArray(transforms)) {
    const pk = getPrimaryDatasetKey(spec, datasets);
    const baseColumns = pk ? getColumns(datasets, pk) : new Set<string>();
    const available = new Set(baseColumns);

    for (const t of transforms) {
      // Check groupby fields before applying this transform's effects
      if (Array.isArray(t.aggregate) || Array.isArray(t.joinaggregate) || Array.isArray(t.window)) {
        const groupby = t.groupby as string[] | undefined;
        if (Array.isArray(groupby)) {
          for (const field of groupby) {
            if (!available.has(field)) {
              const sample = [...available].slice(0, 8).join(", ");
              warnings.push(
                `Aggregate groupby references "${field}" but it doesn't exist. Available columns: ${sample}.`
              );
            }
          }
        }
      }
      applyTransformFields(available, t);
    }
  }

  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintGroupbyFields(sub, datasets));
  }
  return warnings;
}

/** Lint for lookup transforms referencing wrong datasets or non-existent keys/fields */
function lintLookupReferences(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string[] {
  const warnings: string[] = [];
  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;

  if (Array.isArray(transforms)) {
    const pk = getPrimaryDatasetKey(spec, datasets);
    const baseColumns = pk ? getColumns(datasets, pk) : new Set<string>();
    const available = new Set(baseColumns);

    for (const t of transforms) {
      if (t.lookup && t.from && typeof t.from === "object") {
        // Check lookup field exists in current available set
        if (typeof t.lookup === "string" && !available.has(t.lookup)) {
          const sample = [...available].slice(0, 8).join(", ");
          warnings.push(
            `Lookup field "${t.lookup}" not found in current fields. Available: ${sample}.`
          );
        }

        const from = t.from as Record<string, unknown>;
        const fromData = from.data as Record<string, unknown> | undefined;
        const fromUrl = fromData?.url as string | undefined;

        if (fromUrl) {
          if (!datasets[fromUrl]) {
            const keys = Object.keys(datasets).join(", ");
            warnings.push(
              `Lookup references dataset "${fromUrl}" but it is not loaded. Available: ${keys}.`
            );
          } else {
            const fromColumns = getColumns(datasets, fromUrl);
            const fromKey = from.key as string | undefined;
            if (fromKey && !fromColumns.has(fromKey)) {
              const cols = [...fromColumns].slice(0, 8).join(", ");
              warnings.push(
                `Lookup join key "${fromKey}" not found in dataset "${fromUrl}". Available: ${cols}.`
              );
            }
            const fromFields = from.fields as string[] | undefined;
            if (Array.isArray(fromFields)) {
              for (const f of fromFields) {
                if (!fromColumns.has(f)) {
                  const cols = [...fromColumns].slice(0, 8).join(", ");
                  warnings.push(
                    `Lookup field "${f}" not found in dataset "${fromUrl}". Available: ${cols}.`
                  );
                }
              }
            }
          }
        }
      }
      applyTransformFields(available, t);
    }
  }

  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintLookupReferences(sub, datasets));
  }
  return warnings;
}

/** Lint for facet fields that don't exist in the dataset */
function lintFacetRepeatFields(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): string[] {
  const warnings: string[] = [];

  const pk = getPrimaryDatasetKey(spec, datasets);
  const baseColumns = pk ? getColumns(datasets, pk) : new Set<string>();
  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;
  const available = buildAvailableFields(baseColumns, transforms);

  // Check facet fields
  const facet = spec.facet as Record<string, unknown> | undefined;
  if (facet) {
    const fieldsToCheck: string[] = [];
    if (typeof facet.field === "string") fieldsToCheck.push(facet.field);
    const row = facet.row as Record<string, unknown> | undefined;
    if (row && typeof row.field === "string") fieldsToCheck.push(row.field);
    const column = facet.column as Record<string, unknown> | undefined;
    if (column && typeof column.field === "string") fieldsToCheck.push(column.field);
    for (const field of fieldsToCheck) {
      if (!available.has(field)) {
        const sample = [...available].slice(0, 8).join(", ");
        warnings.push(
          `Facet field "${field}" not found in dataset. Available: ${sample}.`
        );
      }
    }
  }

  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintFacetRepeatFields(sub, datasets));
  }
  return warnings;
}

/** Lint for dual-axis layers missing resolve.scale.y */
function lintDualAxisResolve(
  spec: Record<string, unknown>,
): string[] {
  const warnings: string[] = [];
  const layers = spec.layer as Array<Record<string, unknown>> | undefined;

  if (Array.isArray(layers) && layers.length >= 2) {
    // Collect quantitative y-fields from each layer
    const quantYFields = new Set<string>();
    for (const layer of layers) {
      const enc = layer.encoding as Record<string, Record<string, unknown>> | undefined;
      const ySpec = enc?.y;
      if (ySpec && typeof ySpec.field === "string" && ySpec.type === "quantitative") {
        quantYFields.add(ySpec.field);
      }
    }

    if (quantYFields.size >= 2) {
      const resolve = spec.resolve as Record<string, Record<string, unknown>> | undefined;
      const scaleResolve = resolve?.scale as Record<string, unknown> | undefined;
      if (!scaleResolve?.y) {
        const fields = [...quantYFields];
        warnings.push(
          `Layers use different quantitative y-fields ("${fields[0]}", "${fields[1]}") but no resolve. ` +
          `Add "resolve": {"scale": {"y": "independent"}} for dual axes.`
        );
      }
    }
  }

  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintDualAxisResolve(sub));
  }
  return warnings;
}

/** Known Vega-Lite encoding properties that should NOT appear inside a field string */
const VL_ENCODING_PROPS = new Set([
  "type", "timeUnit", "aggregate", "bin", "sort", "axis", "scale",
  "title", "legend", "stack", "format", "band", "datum", "value",
]);

const MANGLED_FIELD_RE = /,\s*([a-zA-Z]+):/;

/** Lint for field names that contain concatenated encoding properties (AI hallucination) */
function lintMangledFieldNames(spec: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const enc = spec.encoding as Record<string, Record<string, unknown>> | undefined;
  if (enc) {
    for (const [channel, ch] of Object.entries(enc)) {
      if (!ch || typeof ch !== "object" || typeof ch.field !== "string") continue;
      const field = ch.field as string;
      const match = MANGLED_FIELD_RE.exec(field);
      if (!match) continue;

      // Parse comma-separated segments and check if any key is a known VL property
      const segments = field.split(",").map((s) => s.trim());
      const mangledProps: Array<{ key: string; value: string }> = [];
      for (let i = 1; i < segments.length; i++) {
        const colonIdx = segments[i].indexOf(":");
        if (colonIdx > 0) {
          const key = segments[i].slice(0, colonIdx).trim();
          const value = segments[i].slice(colonIdx + 1).trim();
          if (VL_ENCODING_PROPS.has(key)) {
            mangledProps.push({ key, value });
          }
        }
      }
      if (mangledProps.length === 0) continue;

      const intendedField = segments[0];
      const propsStr = mangledProps.map((p) => `"${p.key}": "${p.value}"`).join(", ");
      warnings.push(
        `Encoding channel "${channel}" has field "${field}" which appears to contain encoding properties ` +
        `concatenated into the field name. Use separate object properties instead: ` +
        `{ "field": "${intendedField}", ${propsStr} }.`
      );
    }
  }

  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintMangledFieldNames(sub));
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
    warnings.push(...lintMangledFieldNames(spec));
    warnings.push(...lintTransforms(spec));
    warnings.push(...lintTransformOrder(spec, datasets));
    warnings.push(...lintFieldReferences(spec, datasets));
    warnings.push(...lintTemporalNumeric(spec, datasets));
    warnings.push(...lintSpecPatterns(spec, datasets));
    warnings.push(...lintStackingNonSummable(spec, datasets));
    warnings.push(...lintScaleIssues(spec, datasets));
    warnings.push(...lintFormatStrings(spec));
    warnings.push(...lintUnknownTransformKeys(spec));
    warnings.push(...lintGroupbyFields(spec, datasets));
    warnings.push(...lintLookupReferences(spec, datasets));
    warnings.push(...lintFacetRepeatFields(spec, datasets));
    warnings.push(...lintDualAxisResolve(spec));
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
