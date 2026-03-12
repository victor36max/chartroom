import { tool } from "ai";
import { z } from "zod";
import { TOPIC_IDS, lookupDocs, type TopicId } from "./docs";
import { createVlSpecSchema } from "./spec-schema";

export function createTools(datasetNames: string[]) {
  const vlSpecSchema = createVlSpecSchema(datasetNames);

  return {
    render_chart: tool({
      description:
        "Render a chart using a Vega-Lite v6 specification. The chart will be displayed to the user and a screenshot will be returned for you to evaluate. Always use this tool to create or update charts.",
      inputSchema: z.object({
        spec: vlSpecSchema.describe("The Vega-Lite v6 chart specification"),
      }),
      // No execute — this is a client-side tool in web, overridden in eval
    }),

    lookup_docs: tool({
      description:
        "Look up Vega-Lite documentation for specific topics. " +
        "Use when you need details about a mark type, encoding, transform, or composition. " +
        "Available topics: " +
        "bar, line, area, point, rect, rule, text, tick, arc, boxplot, " +
        "encoding (channels and types), aggregate (aggregate/bin/timeUnit), " +
        "stack, fold (wide-to-long reshape), filter (includes top/bottom N with window), calculate, " +
        "lookup (cross-dataset joins), window (running totals/moving averages/ranking), " +
        "regression (trend lines/loess smoothing), impute (fill missing values), pivot (long-to-wide), " +
        "layer (multi-mark), facet (small multiples), repeat, concat (hconcat/vconcat side-by-side panels), " +
        "color-scale, position-scales, styling, " +
        "layout-patterns (stacked/grouped/horizontal), composite-patterns (lollipop/pareto/dual-axis/trend-line), editing-charts",
      inputSchema: z.object({
        topics: z
          .array(z.string())
          .min(1)
          .max(3)
          .describe("Topic(s) to look up, max 3. Valid: " + TOPIC_IDS.join(", ")),
      }),
      execute: async ({ topics }) => {
        const validSet = new Set<string>(TOPIC_IDS);
        const valid = topics.filter((t) => validSet.has(t)) as TopicId[];
        const invalid = topics.filter((t) => !validSet.has(t));
        const parts: string[] = [];
        if (invalid.length > 0) {
          parts.push(`Unknown topic(s): ${invalid.join(", ")}. Valid topics: ${TOPIC_IDS.join(", ")}`);
        }
        if (valid.length > 0) {
          parts.push(lookupDocs(valid));
        }
        return { documentation: parts.join("\n\n---\n\n") };
      },
    }),
  };
}
