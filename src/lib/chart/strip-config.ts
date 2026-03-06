const STRIP_KEYS = ["config", "$schema", "background", "padding", "autosize"] as const;

export function stripStyling(spec: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...spec };
  for (const key of STRIP_KEYS) {
    delete clone[key];
  }
  return clone;
}
