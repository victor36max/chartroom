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

/** Collect all field references from encoding channels (including nested layers) */
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
  const layers = spec.layer as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(layers)) {
    for (const layer of layers) {
      fields.push(...collectEncodingFields(layer));
    }
  }
  return fields;
}

/** Check for aggregate transforms missing "as" or encoding referencing original field instead of alias */
function lintTransforms(spec: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const transforms = spec.transform as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(transforms)) return warnings;

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

  const available = buildAvailableFields(
    primaryColumns,
    spec.transform as Array<Record<string, unknown>> | undefined
  );

  const encFields = collectEncodingFields(spec);

  for (const field of encFields) {
    if (available.has(field)) continue;

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
