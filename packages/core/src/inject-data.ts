type SpecObj = Record<string, unknown>;
type Datasets = Record<string, Record<string, unknown>[]>;

function getDatasetUrl(data: unknown): string | null {
  if (typeof data === "object" && data !== null && "url" in data) {
    const url = (data as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }
  return null;
}

function replaceData(obj: SpecObj, datasets: Datasets, topLevel = false): SpecObj {
  const clone = { ...obj };

  // Replace URL sentinel data
  const dsUrl = getDatasetUrl(clone.data);
  if (dsUrl && datasets[dsUrl]) {
    clone.data = { values: datasets[dsUrl] };
  }

  // Inject default data at top level when spec has no data.
  // layer/facet/repeat inherit parent data, so injecting here is correct.
  // concat specs need per-sub-spec data, so skip those.
  if (topLevel && !clone.data && !clone.hconcat && !clone.vconcat && !clone.concat) {
    const firstKey = Object.keys(datasets)[0];
    if (firstKey) clone.data = { values: datasets[firstKey] };
  }

  // Traverse transforms for lookup.from.data sentinels
  if (Array.isArray(clone.transform)) {
    clone.transform = (clone.transform as SpecObj[]).map((t) => {
      if (t.lookup && t.from && typeof t.from === "object") {
        const from = { ...(t.from as SpecObj) };
        const fromUrl = getDatasetUrl(from.data);
        if (fromUrl && datasets[fromUrl]) {
          from.data = { values: datasets[fromUrl] };
        }
        // Fix common mistake: fields at top level instead of inside from
        if (Array.isArray(t.fields) && !from.fields) {
          from.fields = t.fields;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { fields, ...rest } = t;
          return { ...rest, from };
        }
        return { ...t, from };
      }
      return t;
    });
  }

  // Recurse into layers
  if (Array.isArray(clone.layer)) {
    clone.layer = (clone.layer as SpecObj[]).map((l) => replaceData(l, datasets));
  }

  // Recurse into facet inner spec
  if (clone.spec && typeof clone.spec === "object") {
    clone.spec = replaceData(clone.spec as SpecObj, datasets);
  }

  // Recurse into concat arrays
  for (const key of ["hconcat", "vconcat", "concat"] as const) {
    if (Array.isArray(clone[key])) {
      clone[key] = (clone[key] as SpecObj[]).map((s) => replaceData(s, datasets));
    }
  }

  return clone;
}

export function injectData(
  spec: Record<string, unknown>,
  datasets: Datasets
): Record<string, unknown> {
  return replaceData(structuredClone(spec) as SpecObj, datasets, true);
}
