import * as vl from "vega-lite";
import { injectData } from "./inject-data";

export function validateSpec(
  spec: Record<string, unknown>,
  data: Record<string, unknown>[]
): { valid: true } | { valid: false; error: string } {
  try {
    const fullSpec = injectData(spec, data);
    vl.compile(fullSpec as unknown as vl.TopLevelSpec);
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
