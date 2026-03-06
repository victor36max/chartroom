type Row = Record<string, unknown>;

interface RawResult {
  rows: Row[];
  total: number;
}

interface AggregatedResult {
  categories: { name: string; value: number }[];
  total_groups: number;
}

interface FilterOptions {
  column: string;
  direction: "top" | "bottom";
  n: number;
  groupBy?: string;
  aggregate?: "sum" | "count" | "mean" | "max" | "min";
}

export function filterData(
  data: Row[],
  options: FilterOptions
): RawResult | AggregatedResult {
  if (data.length === 0) {
    return options.groupBy
      ? { categories: [], total_groups: 0 }
      : { rows: [], total: 0 };
  }

  if (options.groupBy && options.aggregate) {
    return filterAggregated(data, options);
  }

  return filterRaw(data, options);
}

function filterRaw(data: Row[], options: FilterOptions): RawResult {
  const { column, direction, n } = options;

  const sorted = [...data]
    .filter((r) => r[column] != null)
    .sort((a, b) => {
      const va = Number(a[column]);
      const vb = Number(b[column]);
      return direction === "top" ? vb - va : va - vb;
    })
    .slice(0, n);

  return { rows: sorted, total: data.length };
}

function filterAggregated(
  data: Row[],
  options: FilterOptions
): AggregatedResult {
  const { column, direction, n, groupBy, aggregate } = options;

  const groups = new Map<string, number[]>();
  for (const row of data) {
    const key = String(row[groupBy!] ?? "null");
    if (!groups.has(key)) groups.set(key, []);
    const val = Number(row[column]);
    if (!isNaN(val)) groups.get(key)!.push(val);
  }

  const aggregated: { name: string; value: number }[] = [];
  for (const [name, values] of groups) {
    let value: number;
    switch (aggregate) {
      case "sum":
        value = values.reduce((a, b) => a + b, 0);
        break;
      case "count":
        value = values.length;
        break;
      case "mean":
        value = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "max":
        value = Math.max(...values);
        break;
      case "min":
        value = Math.min(...values);
        break;
      default:
        value = values.reduce((a, b) => a + b, 0);
    }
    aggregated.push({ name, value });
  }

  aggregated.sort((a, b) => {
    const diff = direction === "top" ? b.value - a.value : a.value - b.value;
    if (diff !== 0) return diff;
    return direction === "top"
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  });

  return {
    categories: aggregated.slice(0, n),
    total_groups: groups.size,
  };
}
