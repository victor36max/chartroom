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

export function validateSpec(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): { valid: true; warnings: string[] } | { valid: false; error: string } {
  try {
    const fullSpec = injectData(spec, datasets);
    const warnings: string[] = [];
    // Lint for common transform issues before compiling
    warnings.push(...lintTransforms(spec));
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
