type Row = Record<string, unknown>;

interface AnalysisResult {
  query: string;
  result: unknown;
}

export function analyzeData(
  data: Row[],
  query: string
): AnalysisResult {
  const q = query.toLowerCase();

  // Basic stats for numeric columns
  if (q.includes("stats") || q.includes("statistics") || q.includes("summary") || q.includes("describe")) {
    return { query, result: computeStats(data) };
  }

  // Value counts
  if (q.includes("value count") || q.includes("unique") || q.includes("distribution") || q.includes("frequency")) {
    const col = extractColumnName(q, data);
    if (col) {
      return { query, result: valueCounts(data, col) };
    }
  }

  // Top/bottom N
  const topMatch = q.match(/top\s+(\d+)/);
  const bottomMatch = q.match(/bottom\s+(\d+)/);
  if (topMatch || bottomMatch) {
    const n = parseInt(topMatch?.[1] ?? bottomMatch?.[1] ?? "5");
    const col = extractColumnName(q, data);
    if (col) {
      const sorted = [...data]
        .filter((r) => r[col] != null)
        .sort((a, b) => {
          const va = Number(a[col]);
          const vb = Number(b[col]);
          return topMatch ? vb - va : va - vb;
        })
        .slice(0, n);
      return { query, result: sorted };
    }
  }

  // Group by
  if (q.includes("group by") || q.includes("group")) {
    const col = extractColumnName(q, data);
    if (col) {
      return { query, result: groupBy(data, col) };
    }
  }

  // Correlation
  if (q.includes("correlation") || q.includes("correlate")) {
    return { query, result: computeCorrelations(data) };
  }

  // Fallback: return basic stats
  return { query, result: computeStats(data) };
}

function extractColumnName(query: string, data: Row[]): string | null {
  if (data.length === 0) return null;
  const columns = Object.keys(data[0]);

  // Try to find an exact column name match in the query
  for (const col of columns) {
    if (query.toLowerCase().includes(col.toLowerCase())) {
      return col;
    }
  }

  return null;
}

function computeStats(data: Row[]): Record<string, unknown> {
  if (data.length === 0) return {};
  const columns = Object.keys(data[0]);
  const stats: Record<string, unknown> = { rowCount: data.length };

  for (const col of columns) {
    const values = data.map((r) => r[col]).filter((v) => v != null);
    const nums = values.filter((v) => typeof v === "number") as number[];

    if (nums.length > 0) {
      stats[col] = {
        type: "numeric",
        count: nums.length,
        min: nums.reduce((m, v) => (v < m ? v : m), Infinity),
        max: nums.reduce((m, v) => (v > m ? v : m), -Infinity),
        mean: nums.reduce((a, b) => a + b, 0) / nums.length,
        median: median(nums),
      };
    } else {
      const unique = new Set(values).size;
      stats[col] = {
        type: "categorical",
        count: values.length,
        unique,
        topValues: Object.entries(valueCounts(data, col))
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([k, v]) => ({ value: k, count: v })),
      };
    }
  }

  return stats;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function valueCounts(data: Row[], col: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of data) {
    const key = String(row[col] ?? "null");
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function groupBy(
  data: Row[],
  col: string
): Record<string, { count: number; sample: Row }> {
  const groups: Record<string, Row[]> = {};
  for (const row of data) {
    const key = String(row[col] ?? "null");
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  const result: Record<string, { count: number; sample: Row }> = {};
  for (const [key, rows] of Object.entries(groups)) {
    result[key] = { count: rows.length, sample: rows[0] };
  }
  return result;
}

function computeCorrelations(data: Row[]): Record<string, unknown> {
  if (data.length === 0) return {};
  const columns = Object.keys(data[0]);
  const numCols = columns.filter((col) => {
    const vals = data.map((r) => r[col]);
    return vals.some((v) => typeof v === "number");
  });

  if (numCols.length < 2) {
    return { message: "Need at least 2 numeric columns for correlation" };
  }

  const correlations: Record<string, number> = {};
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const pairs = data
        .map((r) => ({ a: Number(r[numCols[i]]), b: Number(r[numCols[j]]) }))
        .filter(({ a, b }) => !isNaN(a) && !isNaN(b));
      if (pairs.length > 1) {
        correlations[`${numCols[i]} × ${numCols[j]}`] = pearson(
          pairs.map((p) => p.a),
          pairs.map((p) => p.b)
        );
      }
    }
  }

  return correlations;
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, _, i) => a + x[i] * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));

  return den === 0 ? 0 : Math.round((num / den) * 1000) / 1000;
}
