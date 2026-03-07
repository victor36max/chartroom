type SpecObj = Record<string, unknown>;

function isCSVSentinel(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "name" in data &&
    (data as Record<string, unknown>).name === "csv"
  );
}

function replaceData(obj: SpecObj, rows: Record<string, unknown>[], topLevel = false): SpecObj {
  const clone = { ...obj };

  // Replace sentinel data
  if (isCSVSentinel(clone.data)) {
    clone.data = { values: rows };
  }

  // Inject data only at top level if spec has no data at all (single view)
  if (topLevel && !clone.data && !clone.layer && !clone.hconcat && !clone.vconcat && !clone.concat && !clone.facet && !clone.repeat) {
    clone.data = { values: rows };
  }

  // Recurse into layers
  if (Array.isArray(clone.layer)) {
    clone.layer = (clone.layer as SpecObj[]).map((l) => replaceData(l, rows));
  }

  // Recurse into facet inner spec
  if (clone.spec && typeof clone.spec === "object") {
    clone.spec = replaceData(clone.spec as SpecObj, rows);
  }

  // Recurse into concat arrays
  for (const key of ["hconcat", "vconcat", "concat"] as const) {
    if (Array.isArray(clone[key])) {
      clone[key] = (clone[key] as SpecObj[]).map((s) => replaceData(s, rows));
    }
  }

  return clone;
}

export function injectData(
  spec: Record<string, unknown>,
  rows: Record<string, unknown>[]
): Record<string, unknown> {
  return replaceData(structuredClone(spec) as SpecObj, rows, true);
}
