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

export function validateSpec(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
): { valid: true; warnings: string[] } | { valid: false; error: string } {
  try {
    const fullSpec = injectData(spec, datasets);
    const warnings: string[] = [];
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
