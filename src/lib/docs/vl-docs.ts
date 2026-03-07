export const TOPIC_IDS = [
  "bar",
  "line",
  "area",
  "point",
  "rect",
  "rule",
  "text",
  "tick",
  "arc",
  "boxplot",
  "encoding",
  "aggregate",
  "stack",
  "fold",
  "filter",
  "calculate",
  "layer",
  "facet",
  "repeat",
  "color-scale",
  "position-scales",
  "styling",
  "layout-patterns",
  "composite-patterns",
  "editing-charts",
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

interface DocChunk {
  title: string;
  content: string;
}

const DOC_CHUNKS: Record<TopicId, DocChunk> = {
  bar: {
    title: "Bar Mark",
    content: `Creates bar charts (vertical or horizontal).

**Orientation:** Determined automatically — the quantitative channel becomes the bar length.
- Vertical: x=nominal/ordinal, y=quantitative
- Horizontal: x=quantitative, y=nominal/ordinal

**Basic vertical bar:**
\`\`\`json
{ "mark": "bar", "encoding": { "x": { "field": "category", "type": "nominal" }, "y": { "field": "value", "type": "quantitative" } } }
\`\`\`

**Horizontal bar:** Swap x and y:
\`\`\`json
{ "mark": "bar", "encoding": { "x": { "field": "value", "type": "quantitative" }, "y": { "field": "category", "type": "nominal" } } }
\`\`\`

**Aggregation in encoding:** Use \`aggregate\` on the quantitative channel:
\`\`\`json
"y": { "aggregate": "sum", "field": "revenue", "type": "quantitative" }
\`\`\`

**Grouped bars:** Use \`xOffset\` (or \`yOffset\` for horizontal):
\`\`\`json
"xOffset": { "field": "subcategory", "type": "nominal" }
\`\`\`

**Histogram:** Use \`bin: true\` on a quantitative x and \`aggregate: "count"\` on y:
\`\`\`json
{ "mark": "bar", "encoding": { "x": { "bin": true, "field": "value", "type": "quantitative" }, "y": { "aggregate": "count", "type": "quantitative" } } }
\`\`\`

**Mark properties:** \`{ "type": "bar", "cornerRadiusTopLeft": 3, "cornerRadiusTopRight": 3, "tooltip": true }\`

**Gotchas:**
- No barX/barY — orientation is automatic based on encoding types
- For stacked bars, add \`color\` encoding (stacking is default)
- For grouped bars, use \`xOffset\` channel
- \`width: { "step": 20 }\` controls bar width in pixels`,
  },

  line: {
    title: "Line Mark",
    content: `Creates line charts for trends over time or continuous data.

**Basic line chart:**
\`\`\`json
{ "mark": "line", "encoding": { "x": { "field": "date", "type": "temporal" }, "y": { "field": "value", "type": "quantitative" } } }
\`\`\`

**Multi-series:** Add color encoding:
\`\`\`json
"color": { "field": "series", "type": "nominal" }
\`\`\`

**Line with points:** Use layer:
\`\`\`json
{ "layer": [ { "mark": "line" }, { "mark": "point" } ], "encoding": { "x": { "field": "date", "type": "temporal" }, "y": { "field": "value", "type": "quantitative" } } }
\`\`\`

**Mark properties:** \`{ "type": "line", "point": true, "strokeWidth": 2, "interpolate": "monotone" }\`
Interpolation options: linear, monotone, step, step-before, step-after, basis, cardinal, catmull-rom, bundle, natural

**Smooth curves:** Use \`"interpolate": "catmull-rom"\` or \`"interpolate": "monotone"\` for smooth lines.

**Multi-series with aggregation:** When data has multiple rows per x-value per series (e.g. hourly data that needs daily sums), use inline aggregate:
\`\`\`json
{ "mark": "line", "encoding": { "x": { "field": "date", "type": "temporal" }, "y": { "aggregate": "sum", "field": "value", "type": "quantitative" }, "color": { "field": "category", "type": "nominal" } } }
\`\`\`

**Gotchas:**
- Use \`type: "temporal"\` for date fields, not "quantitative"
- For multi-series, always add \`color\` encoding so lines are separated
- \`order\` encoding controls point connection order (useful for connected scatter)
- \`interpolate\` goes in the mark object, not in encoding`,
  },

  area: {
    title: "Area Mark",
    content: `Creates area charts (filled region under a line).

**Basic area:**
\`\`\`json
{ "mark": "area", "encoding": { "x": { "field": "date", "type": "temporal" }, "y": { "field": "value", "type": "quantitative" } } }
\`\`\`

**Stacked area:** Add color encoding (stacked by default):
\`\`\`json
"color": { "field": "category", "type": "nominal" }
\`\`\`

**Normalized stacked area (100%):** Add \`stack: "normalize"\`:
\`\`\`json
"y": { "field": "value", "type": "quantitative", "stack": "normalize" }
\`\`\`

**Streamgraph:** Use \`stack: "center"\`

**Mark properties:** \`{ "type": "area", "opacity": 0.7, "line": true, "interpolate": "monotone" }\`
- \`line: true\` adds a line stroke on top of the area
- \`opacity\` controls fill transparency`,
  },

  point: {
    title: "Point Mark (scatter/bubble)",
    content: `Creates scatter plots and bubble charts.

**Basic scatter:**
\`\`\`json
{ "mark": "point", "encoding": { "x": { "field": "weight", "type": "quantitative" }, "y": { "field": "height", "type": "quantitative" } } }
\`\`\`

**Bubble chart:** Add size encoding:
\`\`\`json
"size": { "field": "population", "type": "quantitative" }
\`\`\`

**Color by category:**
\`\`\`json
"color": { "field": "species", "type": "nominal" }
\`\`\`

**Mark properties:** \`{ "type": "point", "filled": true, "size": 60, "opacity": 0.7 }\`
- \`filled: true\` fills the point (default is hollow circle)
- \`shape\` encoding: circle, square, cross, diamond, triangle-up, etc.

**Gotchas:**
- Use \`point\` not \`dot\` (Observable Plot term)
- \`filled: true\` is needed for filled circles`,
  },

  rect: {
    title: "Rect Mark (heatmap)",
    content: `Creates heatmaps and 2D binned plots.

**Basic heatmap:**
\`\`\`json
{ "mark": "rect", "encoding": { "x": { "field": "category1", "type": "ordinal" }, "y": { "field": "category2", "type": "ordinal" }, "color": { "field": "value", "type": "quantitative" } } }
\`\`\`

**2D histogram (binned heatmap):**
\`\`\`json
{ "mark": "rect", "encoding": { "x": { "bin": { "maxbins": 20 }, "field": "x", "type": "quantitative" }, "y": { "bin": { "maxbins": 20 }, "field": "y", "type": "quantitative" }, "color": { "aggregate": "count", "type": "quantitative" } } }
\`\`\`

**Ranged rect for annotations:** Use y/y2 or x/x2 for ranges:
\`\`\`json
{ "mark": "rect", "encoding": { "y": { "aggregate": "min", "field": "val" }, "y2": { "aggregate": "max", "field": "val" }, "opacity": { "value": 0.2 } } }
\`\`\`

**Calendar heatmap:** Combine with timeUnit:
\`\`\`json
"x": { "field": "date", "timeUnit": "date", "type": "ordinal" },
"y": { "field": "date", "timeUnit": "day", "type": "ordinal" }
\`\`\``,
  },

  rule: {
    title: "Rule Mark (reference lines)",
    content: `Creates horizontal or vertical reference lines and ranges.

**Horizontal reference line (constant value):**
\`\`\`json
{ "mark": "rule", "encoding": { "y": { "datum": 50 } } }
\`\`\`

**Vertical reference line:**
\`\`\`json
{ "mark": "rule", "encoding": { "x": { "datum": "2020-01-01", "type": "temporal" } } }
\`\`\`

**Average line (computed):**
\`\`\`json
{ "mark": "rule", "encoding": { "y": { "aggregate": "mean", "field": "value" } } }
\`\`\`

**Ranged rule (error bars):** Use y/y2:
\`\`\`json
{ "mark": "rule", "encoding": { "x": { "field": "category" }, "y": { "field": "low" }, "y2": { "field": "high" } } }
\`\`\`

**Mark properties:** \`{ "type": "rule", "strokeDash": [4, 4], "color": "red", "strokeWidth": 2 }\`

**Common pattern — layer with bar chart:**
\`\`\`json
{ "layer": [ { "mark": "bar", "encoding": { ... } }, { "mark": "rule", "encoding": { "y": { "datum": 100 }, "color": { "value": "red" } } } ] }
\`\`\``,
  },

  text: {
    title: "Text Mark (labels)",
    content: `Creates text labels on charts.

**Value labels on bars (layered):**
\`\`\`json
{ "layer": [
  { "mark": "bar", "encoding": { "x": { "field": "cat", "type": "nominal" }, "y": { "field": "val", "type": "quantitative" } } },
  { "mark": { "type": "text", "dy": -8 }, "encoding": { "x": { "field": "cat", "type": "nominal" }, "y": { "field": "val", "type": "quantitative" }, "text": { "field": "val", "type": "quantitative" } } }
] }
\`\`\`

**Labels on horizontal bars:**
\`\`\`json
{ "layer": [
  { "mark": "bar", "encoding": { "x": { "aggregate": "sum", "field": "revenue", "type": "quantitative" }, "y": { "field": "product", "type": "nominal" } } },
  { "mark": { "type": "text", "dx": 5, "align": "left" }, "encoding": { "x": { "aggregate": "sum", "field": "revenue", "type": "quantitative" }, "y": { "field": "product", "type": "nominal" }, "text": { "aggregate": "sum", "field": "revenue", "type": "quantitative" } } }
] }
\`\`\`
For horizontal bars use \`dx\` (not \`dy\`) and \`align: "left"\` to place labels after bar ends.

**Mark properties:** \`{ "type": "text", "fontSize": 12, "fontWeight": "bold", "dx": 0, "dy": -8, "align": "center", "baseline": "bottom" }\`
- \`dx\`/\`dy\`: pixel offset from position
- \`align\`: left, center, right
- \`baseline\`: top, middle, bottom

**Format numbers:** Use \`format\` in encoding:
\`\`\`json
"text": { "field": "value", "type": "quantitative", "format": ".1f" }
\`\`\`

**Labels on scatter plots (avoiding overlap):**
\`\`\`json
{ "layer": [
  { "mark": { "type": "point", "filled": true, "size": 60 } },
  { "mark": { "type": "text", "dx": 7, "dy": -7, "align": "left", "baseline": "bottom", "fontSize": 10 } , "encoding": { "text": { "field": "name", "type": "nominal" } } }
], "encoding": { "x": { "field": "xVal", "type": "quantitative" }, "y": { "field": "yVal", "type": "quantitative" } } }
\`\`\`
For dense datasets, use smaller fontSize (9-10) and offset labels away from points with dx/dy.

**Gotchas:**
- Always layer text with the chart mark — text alone is rarely useful
- Use \`dy: -8\` to position labels above bars
- Use \`dx: 7, align: "left"\` to position labels to the right of scatter points`,
  },

  tick: {
    title: "Tick Mark (strip plot)",
    content: `Creates tick marks — short lines for strip plots and distribution displays. ALWAYS use tick (never point) when user asks for "strip plot", "tick marks", or "rug plot".

**Strip plot (shows individual data points as ticks):**
\`\`\`json
{ "mark": "tick", "encoding": { "x": { "field": "value", "type": "quantitative" }, "y": { "field": "category", "type": "nominal" } } }
\`\`\`

**IMPORTANT:** Do NOT add any aggregate to the encoding. Tick/strip plots show INDIVIDUAL data points — each row in the data produces one tick mark. Aggregating (mean, sum, etc.) defeats the purpose.

**Mark properties:** \`{ "type": "tick", "thickness": 2, "opacity": 0.5 }\`
- Use \`opacity: 0.5\` or lower for dense datasets so overlapping ticks are visible
- \`thickness\` controls the stroke width of each tick

**Colored strip plot (distribution by group):**
\`\`\`json
{ "mark": { "type": "tick", "thickness": 2, "opacity": 0.5 }, "encoding": { "x": { "field": "score", "type": "quantitative" }, "y": { "field": "subject", "type": "nominal" }, "color": { "field": "subject", "type": "nominal" } } }
\`\`\`

**Gotchas:**
- Use \`tick\` not \`point\` for strip/rug plots — ticks show distribution density better
- NEVER aggregate tick data — the whole point is showing individual values
- Tick orientation follows the quantitative axis automatically
- Add \`opacity\` for dense data to see overlapping ticks`,
  },

  arc: {
    title: "Arc Mark (pie/donut charts)",
    content: `Creates pie charts, donut charts, and radial plots.

**Pie chart:**
\`\`\`json
{ "mark": { "type": "arc" }, "encoding": { "theta": { "field": "value", "type": "quantitative" }, "color": { "field": "category", "type": "nominal" } } }
\`\`\`

**Donut chart:** Add innerRadius:
\`\`\`json
{ "mark": { "type": "arc", "innerRadius": 50 } }
\`\`\`

**Pie with labels (layered):**
\`\`\`json
{ "encoding": { "theta": { "field": "value", "type": "quantitative", "stack": true }, "color": { "field": "category", "type": "nominal" } },
  "layer": [
    { "mark": { "type": "arc", "outerRadius": 80 } },
    { "mark": { "type": "text", "radius": 90 }, "encoding": { "text": { "field": "category", "type": "nominal" } } }
  ]
}
\`\`\`

**Key properties:**
- \`innerRadius\`: 0 = pie, >0 = donut
- \`outerRadius\`: outer edge size
- \`padAngle\`: gap between slices (radians, e.g. 0.02)
- \`cornerRadius\`: rounded corners

**Percentage of total / share:** Arc/pie charts naturally show proportions — prefer them when users ask for "percentage of total", "share", or "breakdown". Bar charts with percentage labels require a calculate transform instead.

**Gotchas:**
- Always use \`theta\` for the value, not x/y
- Always use \`color\` for the category
- For labels, layer text with \`radius\` > outerRadius
- \`stack: true\` on theta is needed for label positioning`,
  },

  boxplot: {
    title: "Boxplot (composite mark)",
    content: `Creates box-and-whisker plots showing distribution.

**Basic boxplot:**
\`\`\`json
{ "mark": "boxplot", "encoding": { "x": { "field": "category", "type": "nominal" }, "y": { "field": "value", "type": "quantitative" } } }
\`\`\`

**Horizontal boxplot:** Swap x and y.

**With extent (whisker range):**
\`\`\`json
{ "mark": { "type": "boxplot", "extent": 1.5 } }
\`\`\`
- \`extent: 1.5\` = 1.5 * IQR (standard)
- \`extent: "min-max"\` = whiskers extend to data extremes

**With color:**
\`\`\`json
"color": { "field": "category", "type": "nominal" }
\`\`\`

**Boxplot is a composite mark** — it generates box, whiskers, and outlier marks automatically. No need to build from primitives.`,
  },

  encoding: {
    title: "Encoding Channels and Types",
    content: `**Data types** (always specify for clarity):
- \`quantitative\` (Q): numbers, continuous
- \`nominal\` (N): categories, unordered (strings, labels)
- \`ordinal\` (O): categories, ordered (e.g. low/med/high, months)
- \`temporal\` (T): dates/times

**Position channels:** x, y, x2, y2, xOffset, yOffset
**Color channels:** color, fill, stroke, opacity
**Size/shape:** size, shape, angle
**Text:** text, tooltip
**Facet:** row, column, facet
**Arc:** theta, radius, theta2, radius2
**Order:** order, detail

**Tooltip:** Use \`tooltip\` encoding:
\`\`\`json
"tooltip": [
  { "field": "name", "type": "nominal" },
  { "field": "value", "type": "quantitative", "format": ",.0f" }
]
\`\`\`
Or shorthand: \`"mark": { "type": "bar", "tooltip": true }\`

**Sort:** Sort axis by another field:
\`\`\`json
"x": { "field": "category", "type": "nominal", "sort": "-y" }
\`\`\`
- \`"-y"\` = descending by y value
- \`"y"\` = ascending by y value
- Array of values for custom order: \`"sort": ["Mon", "Tue", "Wed"]\`

**Title:** Override axis/legend title:
\`\`\`json
"y": { "field": "val", "type": "quantitative", "title": "Revenue ($)" }
\`\`\`

**Datum (constant):** Position at a fixed value:
\`\`\`json
"y": { "datum": 50 }
\`\`\`

**Value (constant visual):** Fixed visual property:
\`\`\`json
"color": { "value": "steelblue" }
\`\`\``,
  },

  aggregate: {
    title: "Aggregate, Bin, and TimeUnit",
    content: `**Inline aggregation** (preferred for simple cases):
\`\`\`json
"y": { "aggregate": "sum", "field": "revenue", "type": "quantitative" }
\`\`\`
Operations: count, sum, mean, median, min, max, stdev, variance, distinct, valid, missing, q1, q3

**Count (no field needed):**
\`\`\`json
"y": { "aggregate": "count", "type": "quantitative" }
\`\`\`

**Bin (histogram):**
\`\`\`json
"x": { "bin": true, "field": "value", "type": "quantitative" }
\`\`\`
Options: \`{ "bin": { "maxbins": 20 } }\` or \`{ "bin": { "step": 5 } }\`

**TimeUnit (date grouping):**
\`\`\`json
"x": { "field": "date", "timeUnit": "yearmonth", "type": "temporal" }
\`\`\`
Units: year, quarter, month, date, day, hours, minutes, seconds
Combos: yearmonth, yearmonthdate, monthdate, hoursminutes

**Transform-based aggregation** (for complex cases):
\`\`\`json
"transform": [{ "aggregate": [{ "op": "mean", "field": "score", "as": "avg_score" }], "groupby": ["category"] }]
\`\`\`

**Gotchas:**
- Prefer inline \`aggregate\` in encoding over transform for simple cases
- \`count\` aggregate doesn't need a \`field\`
- bin creates a range — the y axis should use \`aggregate: "count"\`
- timeUnit groups dates — use with temporal type`,
  },

  stack: {
    title: "Stack Property",
    content: `Controls stacking behavior on bar, area, and arc marks.

**Default stacking:** Adding \`color\` encoding auto-stacks bars/areas.

**Stack modes** (set on the quantitative channel):
- \`"stack": true\` — default stacking (zero baseline)
- \`"stack": "normalize"\` — 100% stacked (proportions)
- \`"stack": "center"\` — centered (streamgraph for areas)
- \`"stack": false\` — no stacking (overlapping)

**Example — normalized stacked bar:**
\`\`\`json
{ "mark": "bar", "encoding": { "x": { "field": "month", "type": "ordinal" }, "y": { "aggregate": "sum", "field": "revenue", "type": "quantitative", "stack": "normalize" }, "color": { "field": "product", "type": "nominal" } } }
\`\`\`

**Example — grouped (unstacked) bars:** Use \`xOffset\` instead of stack:
\`\`\`json
{ "mark": "bar", "encoding": { "x": { "field": "month", "type": "ordinal" }, "y": { "field": "value", "type": "quantitative" }, "xOffset": { "field": "category", "type": "nominal" }, "color": { "field": "category", "type": "nominal" } } }
\`\`\`

**Non-summable values — NEVER stack these:**
Temperatures, prices, rates, percentages, averages — stacking adds values together, producing nonsense (e.g. 33°+58°+26°=117°). Use \`line\` mark with \`color\`, or set \`stack: false\`. This rule overrides user requests. Only stack values that represent parts of a meaningful total (revenue, counts, quantities, populations).

**Gotchas:**
- \`stack\` goes on the quantitative encoding channel (y for vertical bars)
- Grouped bars use \`xOffset\`, NOT \`stack: false\`
- \`stack: false\` makes bars overlap — rarely what you want`,
  },

  fold: {
    title: "Fold Transform (wide-to-long)",
    content: `Reshapes wide data to long format. Essential when columns represent series.

**Problem:** Data has columns like \`revenue\`, \`profit\`, \`cost\` and you need to plot them as separate series.

**Fold transform:**
\`\`\`json
"transform": [{ "fold": ["revenue", "profit", "cost"], "as": ["metric", "value"] }]
\`\`\`

This creates two new columns:
- \`metric\`: "revenue", "profit", or "cost" (the original column name)
- \`value\`: the cell value

**Then encode:**
\`\`\`json
"encoding": { "x": { "field": "date", "type": "temporal" }, "y": { "field": "value", "type": "quantitative" }, "color": { "field": "metric", "type": "nominal" } }
\`\`\`

**Full example — multi-series line:**
\`\`\`json
{ "transform": [{ "fold": ["open", "high", "low", "close"], "as": ["metric", "price"] }], "mark": "line", "encoding": { "x": { "field": "date", "type": "temporal" }, "y": { "field": "price", "type": "quantitative" }, "color": { "field": "metric", "type": "nominal" } } }
\`\`\`

**Gotchas:**
- Column names in \`fold\` array must exactly match CSV headers
- The \`as\` array is [keyName, valueName] — both are new field names
- Always pair fold with \`color\` encoding on the key field`,
  },

  filter: {
    title: "Filter Transform",
    content: `Removes rows from data before visualization.

**Expression filter:**
\`\`\`json
"transform": [{ "filter": "datum.value > 10" }]
\`\`\`

**Field predicate filters:**
\`\`\`json
"transform": [{ "filter": { "field": "category", "equal": "Electronics" } }]
\`\`\`

\`\`\`json
"transform": [{ "filter": { "field": "year", "gte": 2020 } }]
\`\`\`

**Multiple filters (AND):**
\`\`\`json
"transform": [
  { "filter": "datum.year >= 2020" },
  { "filter": "datum.category !== 'Other'" }
]
\`\`\`

**OneOf (IN list):**
\`\`\`json
"transform": [{ "filter": { "field": "region", "oneOf": ["North", "South"] } }]
\`\`\`

**Range:**
\`\`\`json
"transform": [{ "filter": { "field": "price", "range": [10, 100] } }]
\`\`\`

**Expression syntax:** Use \`datum.fieldName\` to reference fields. Standard JS operators: ==, !=, >, <, >=, <=, &&, ||`,
  },

  calculate: {
    title: "Calculate Transform",
    content: `Creates new computed fields from expressions.

**Basic calculate:**
\`\`\`json
"transform": [{ "calculate": "datum.revenue - datum.cost", "as": "profit" }]
\`\`\`

**String manipulation:**
\`\`\`json
"transform": [{ "calculate": "datum.name + ' (' + datum.year + ')'", "as": "label" }]
\`\`\`

**Conditional:**
\`\`\`json
"transform": [{ "calculate": "datum.value > 100 ? 'High' : 'Low'", "as": "level" }]
\`\`\`

**Date formatting:**
\`\`\`json
"transform": [{ "calculate": "year(datum.date)", "as": "year" }]
\`\`\`

**Common functions:** year(), month(), date(), hours(), minutes(), floor(), ceil(), abs(), sqrt(), log(), exp(), pow(), upper(), lower(), substring(), length(), trim(), toNumber(), toString()

**Gotchas:**
- Use \`datum.fieldName\` to reference fields (not just field name)
- The \`as\` property names the new field
- Chain multiple calculates for complex derivations`,
  },

  layer: {
    title: "Layer Composition (multi-mark)",
    content: `Overlays multiple marks in the same view. Essential for combining chart types.

**Basic layer:**
\`\`\`json
{ "layer": [
  { "mark": "bar", "encoding": { "x": { "field": "cat", "type": "nominal" }, "y": { "field": "val", "type": "quantitative" } } },
  { "mark": "rule", "encoding": { "y": { "datum": 50 }, "color": { "value": "red" } } }
] }
\`\`\`

**Shared encoding:** Put common encoding at top level:
\`\`\`json
{ "encoding": { "x": { "field": "date", "type": "temporal" } },
  "layer": [
    { "mark": "line", "encoding": { "y": { "field": "value", "type": "quantitative" } } },
    { "mark": "point", "encoding": { "y": { "field": "value", "type": "quantitative" } } }
  ]
}
\`\`\`

**Common patterns:**
- Line + point (line chart with dots)
- Bar + text (labeled bars)
- Bar + rule (bar chart with reference line)
- Area + line (area with stroke)
- Point + rule (scatter with mean line)

**Reference line with dashed style:**
\`\`\`json
{ "layer": [
  { "mark": "bar", "encoding": { "x": { "field": "cat", "type": "nominal" }, "y": { "aggregate": "mean", "field": "score", "type": "quantitative" } } },
  { "mark": { "type": "rule", "strokeDash": [4, 4] }, "encoding": { "y": { "datum": 75 }, "color": { "value": "red" } } }
] }
\`\`\`
Key: use \`datum\` (not \`field\`) for constant-value reference lines. Use \`strokeDash: [4, 4]\` for dashed style.

**Gotchas:**
- Each layer can have its own mark, encoding, and transform
- Encoding in outer spec is inherited by all layers
- Layer-level encoding overrides inherited encoding
- Use \`"color": { "value": "red" }\` for constant colors in a layer
- **WARNING:** Do NOT use shared encoding with rule marks. A rule inheriting x=categorical + setting y=datum renders as VERTICAL lines at each category. For bar+rule layers, put each layer's encoding inside the layer, NOT at top level:
\`\`\`json
{ "layer": [
  { "mark": "bar", "encoding": { "x": { "field": "cat", "type": "nominal" }, "y": { "aggregate": "mean", "field": "val", "type": "quantitative" } } },
  { "mark": { "type": "rule", "strokeDash": [4, 4] }, "encoding": { "y": { "datum": 75 }, "color": { "value": "red" } } }
] }
\`\`\``,
  },

  facet: {
    title: "Facet (small multiples)",
    content: `Creates a grid of small charts, one per category value.

**Row/column encoding (simplest):**
\`\`\`json
{ "mark": "bar", "encoding": { "x": { "field": "month", "type": "ordinal" }, "y": { "field": "sales", "type": "quantitative" }, "column": { "field": "region", "type": "nominal" } } }
\`\`\`

**Row faceting:**
\`\`\`json
"row": { "field": "category", "type": "nominal" }
\`\`\`

**Wrapped facet (grid with columns count):**
\`\`\`json
{ "facet": { "field": "category", "type": "nominal", "columns": 3 }, "spec": { "mark": "bar", "encoding": { "x": { "field": "month", "type": "ordinal" }, "y": { "field": "value", "type": "quantitative" } } } }
\`\`\`

**Row + Column grid:**
\`\`\`json
{ "facet": { "row": { "field": "category" }, "column": { "field": "region" } }, "spec": { ... } }
\`\`\`

**Gotchas:**
- Use \`row\`/\`column\` encoding for simple 1D facets
- Use \`facet\` + \`spec\` for wrapped grids or 2D facets
- Data should be at the top level, not repeated in each facet
- \`columns\` controls wrap count in wrapped facets
- Each facet shares the same scale by default`,
  },

  repeat: {
    title: "Repeat Composition",
    content: `Creates multiple views from the same data, varying the field. Useful for SPLOM and multi-metric views.

**Row/column repeat (SPLOM):**
\`\`\`json
{ "repeat": { "row": ["field1", "field2"], "column": ["field2", "field1"] }, "spec": { "mark": "point", "encoding": { "x": { "field": { "repeat": "column" }, "type": "quantitative" }, "y": { "field": { "repeat": "row" }, "type": "quantitative" } } } }
\`\`\`

**Layer repeat (multi-series):**
\`\`\`json
{ "repeat": { "layer": ["revenue", "profit"] }, "spec": { "mark": "line", "encoding": { "x": { "field": "date", "type": "temporal" }, "y": { "field": { "repeat": "layer" }, "type": "quantitative" }, "color": { "datum": { "repeat": "layer" }, "type": "nominal" } } } }
\`\`\`

**Gotchas:**
- \`{ "repeat": "column" }\` in field references the repeated dimension
- For layer repeat, use \`datum\` (not \`field\`) in color for series labels
- Alternative to fold transform for multi-metric views`,
  },

  "color-scale": {
    title: "Color Scales",
    content: `**Categorical colors:** Automatic with nominal/ordinal type.

**Custom categorical palette:**
\`\`\`json
"color": { "field": "category", "type": "nominal", "scale": { "range": ["#e41a1c", "#377eb8", "#4daf4a"] } }
\`\`\`

**Named scheme:**
\`\`\`json
"color": { "field": "category", "type": "nominal", "scale": { "scheme": "category10" } }
\`\`\`
Schemes: category10, category20, tableau10, tableau20, set1, set2, set3, paired, pastel1, pastel2, dark2, accent

**Sequential (quantitative):**
\`\`\`json
"color": { "field": "value", "type": "quantitative", "scale": { "scheme": "blues" } }
\`\`\`
Schemes: blues, greens, reds, oranges, purples, greys, viridis, inferno, magma, plasma, cividis, turbo, yelloworangered, yelloworangebrown, yellowgreen, yellowgreenblue, bluegreen, bluepurple, orangered, purpleblue, purplered, redpurple, greenblue

**Diverging:**
\`\`\`json
"color": { "field": "change", "type": "quantitative", "scale": { "scheme": "redblue", "domainMid": 0 } }
\`\`\`
Schemes: redblue, blueorange, redgrey, redyellowgreen, redyellowblue, spectral, purplegreen, pinkyellowgreen, brownbluegreen, purpleorange

**Reverse a scheme:** Add \`"reverse": true\` to flip a color scheme direction:
\`\`\`json
"scale": { "scheme": "redyellowgreen", "reverse": true }
\`\`\`
This is important for diverging schemes when you want high=red, low=green (the default \`redyellowgreen\` maps low→red, high→green).

**WARNING:** D3 shorthand names (YlOrRd, RdBu, PuBu, etc.) are NOT valid in Vega-Lite. Use full names: yelloworangered, redblue, purpleblue, etc.

**Domain mapping (specific colors per value):**
\`\`\`json
"scale": { "domain": ["good", "bad"], "range": ["green", "red"] }
\`\`\`

**Constant color:** Use \`value\`, not \`field\`:
\`\`\`json
"color": { "value": "steelblue" }
\`\`\``,
  },

  "position-scales": {
    title: "Position Scales (x/y)",
    content: `**Log scale:**
\`\`\`json
"y": { "field": "value", "type": "quantitative", "scale": { "type": "log" } }
\`\`\`

**Sqrt scale (for area/bubble):**
\`\`\`json
"size": { "field": "pop", "type": "quantitative", "scale": { "type": "sqrt" } }
\`\`\`

**Zero baseline control:**
\`\`\`json
"y": { "field": "value", "type": "quantitative", "scale": { "zero": false } }
\`\`\`

**Custom domain:**
\`\`\`json
"y": { "field": "value", "type": "quantitative", "scale": { "domain": [0, 100] } }
\`\`\`

**Axis formatting:**
\`\`\`json
"x": { "field": "date", "type": "temporal", "axis": { "format": "%b %Y", "labelAngle": -45, "title": "Date" } }
\`\`\`
\`\`\`json
"y": { "field": "revenue", "type": "quantitative", "axis": { "format": "$,.0f", "title": "Revenue" } }
\`\`\`

**Hide axis:** \`"axis": null\`

**Reverse:** \`"sort": "descending"\` or \`"scale": { "reverse": true }\`

**D3 format strings:** $, = currency prefix; , = thousands separator; .2f = 2 decimal; .0% = percentage; .2s = SI prefix

**Month/weekday ordering:**
Ordinal months and weekdays sort alphabetically by default. Always provide explicit sort:
\`\`\`json
"x": { "field": "month", "type": "ordinal", "sort": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] }
\`\`\`
For weekdays:
\`\`\`json
"y": { "field": "day", "type": "ordinal", "sort": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] }
\`\`\``,
  },

  styling: {
    title: "Styling and Appearance",
    content: `**IMPORTANT: Never emit config, $schema, background, padding, or autosize.** Theme is applied automatically at render time.

**Title and subtitle:**
\`\`\`json
"title": { "text": "Main Title", "subtitle": "Subtitle text" }
\`\`\`
Or simple: \`"title": "Main Title"\`

**Width and height:**
\`\`\`json
"width": 400, "height": 300
\`\`\`

**Opacity:** Use encoding or mark property:
\`\`\`json
"opacity": { "field": "weight", "type": "quantitative" }
\`\`\`
or constant: \`"opacity": { "value": 0.7 }\` or in mark: \`{ "type": "bar", "opacity": 0.7 }\`

**Stroke/fill on marks:** Use mark properties:
\`\`\`json
{ "type": "bar", "stroke": "#333", "strokeWidth": 1, "fill": "steelblue" }
\`\`\`

**Conditional encoding:**
\`\`\`json
"color": { "condition": { "test": "datum.value > 100", "value": "red" }, "value": "gray" }
\`\`\`

**Label rotation:**
\`\`\`json
"x": { "field": "category", "axis": { "labelAngle": -45 } }
\`\`\`

**Legend position:**
\`\`\`json
"color": { "field": "cat", "type": "nominal", "legend": { "orient": "bottom", "direction": "horizontal" } }
\`\`\`
Hide legend: \`"legend": null\``,
  },

  "layout-patterns": {
    title: "Layout Patterns",
    content: `**Stacked bar chart:**
\`\`\`json
{ "mark": "bar", "encoding": { "x": { "field": "month", "type": "ordinal" }, "y": { "aggregate": "sum", "field": "revenue", "type": "quantitative" }, "color": { "field": "product", "type": "nominal" } } }
\`\`\`

**Grouped bar chart:**
\`\`\`json
{ "mark": "bar", "encoding": { "x": { "field": "month", "type": "ordinal" }, "y": { "field": "revenue", "type": "quantitative" }, "xOffset": { "field": "product", "type": "nominal" }, "color": { "field": "product", "type": "nominal" } } }
\`\`\`

**Horizontal bar chart (sorted):**
\`\`\`json
{ "mark": "bar", "encoding": { "x": { "aggregate": "sum", "field": "revenue", "type": "quantitative" }, "y": { "field": "product", "type": "nominal", "sort": "-x" } } }
\`\`\`

**100% stacked bar:**
\`\`\`json
"y": { "aggregate": "sum", "field": "revenue", "type": "quantitative", "stack": "normalize" }
\`\`\`

**Diverging bar (e.g. Likert scale):** Use calculate to create offset, then stack.

**Waterfall:** Requires window transform for running total.

**Key rules:**
- Stacking is DEFAULT when color is added to bars
- \`xOffset\` = grouped bars
- \`stack: "normalize"\` = 100%
- \`sort: "-x"\` or \`sort: "-y"\` = descending sort by value`,
  },

  "composite-patterns": {
    title: "Composite Chart Patterns",
    content: `**Lollipop chart (bar + circle):**
\`\`\`json
{ "encoding": { "x": { "field": "value", "type": "quantitative" }, "y": { "field": "category", "type": "nominal", "sort": "-x" } },
  "layer": [
    { "mark": { "type": "rule" } },
    { "mark": { "type": "point", "filled": true, "size": 100 } }
  ]
}
\`\`\`

**Bar chart with value labels:**
\`\`\`json
{ "encoding": { "x": { "field": "category", "type": "nominal" }, "y": { "field": "value", "type": "quantitative" } },
  "layer": [
    { "mark": "bar" },
    { "mark": { "type": "text", "dy": -8 }, "encoding": { "text": { "field": "value", "type": "quantitative" } } }
  ]
}
\`\`\`

**Pareto chart:** Window transforms for cumulative % are unreliable. Instead, render a **bar chart sorted descending** by value. Explain to the user that cumulative percentage line cannot be computed.

**Dual-axis (shared x, two y scales):**
Use \`layer\` with \`resolve: { scale: { y: "independent" } }\`

**Line with confidence band:**
\`\`\`json
{ "layer": [
  { "mark": "area", "encoding": { "y": { "field": "low" }, "y2": { "field": "high" }, "opacity": { "value": 0.3 } } },
  { "mark": "line", "encoding": { "y": { "field": "mean" } } }
] }
\`\`\`

**Scatter with trend line:**
\`\`\`json
{ "layer": [
  { "mark": "point" },
  { "mark": { "type": "line", "color": "red" }, "transform": [{ "regression": "y", "on": "x" }] }
] }
\`\`\``,
  },

  "editing-charts": {
    title: "Editing Charts (multi-turn modifications)",
    content: `When the user asks to modify an existing chart, apply targeted changes to the existing spec.

**Flip orientation (vertical ↔ horizontal):**
Swap x and y encoding channels. Keep types the same.

**Sort bars by value — CRITICAL:**
The \`sort\` property goes on the CATEGORICAL encoding channel and references the OTHER axis:
- Vertical bars sorted descending: \`"x": { "field": "category", "type": "nominal", "sort": "-y" }\`
- Horizontal bars sorted descending: \`"y": { "field": "category", "type": "nominal", "sort": "-x" }\`
NEVER use \`sort: "-x"\` on the x channel — that references itself and is meaningless.
NEVER use a sort transform for bar ordering — use encoding sort.

**Add value labels:** Wrap in layer, add text mark:
Add a layer with \`{ "mark": { "type": "text", "dy": -8 }, "encoding": { "text": { "field": "val" } } }\`

**Add reference line:** Add a rule layer:
\`{ "mark": "rule", "encoding": { "y": { "datum": 100 }, "color": { "value": "red" } } }\`

**Change colors:** Modify color scale:
\`"color": { "field": "cat", "scale": { "range": ["#e41a1c", "#377eb8"] } }\`

**Add title/subtitle:**
\`"title": { "text": "Main", "subtitle": "Sub" }\`

**Change aggregation:** Modify the aggregate property:
\`"y": { "aggregate": "mean", "field": "value" }\` (was sum, now mean)

**Convert single to layered:** Wrap existing spec in layer array, add new mark.

**Remove stacking:** Add \`"stack": false\` or switch to grouped with \`xOffset\`.

**Key principle:** Modify the minimum necessary. Don't rebuild from scratch.`,
  },
};

export function lookupDocs(topics: TopicId[]): string {
  return topics
    .map((id) => {
      const chunk = DOC_CHUNKS[id];
      return `## ${chunk.title}\n\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}
