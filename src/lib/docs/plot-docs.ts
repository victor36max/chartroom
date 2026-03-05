export const TOPIC_IDS = [
  "arc",
  "bar",
  "dot",
  "line",
  "area",
  "cell",
  "rect",
  "text",
  "tick",
  "rule",
  "frame",
  "tip",
  "axis",
  "group",
  "bin",
  "stack",
  "color-scale",
  "position-scales",
  "faceting",
  "styling",
  "melt",
  "filter",
  "layout-patterns",
  "composite-patterns",
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

interface DocChunk {
  title: string;
  content: string;
}

const DOC_CHUNKS: Record<TopicId, DocChunk> = {
  arc: {
    title: "Arc Mark (pie/donut charts)",
    content: `Custom arc mark for pie and donut charts.

**Required options:**
- \`value\`: numeric field (slice sizes)
- \`label\`: category field (slice identities)

**Key options:**
- \`innerRadius\`: 0 = pie chart, >0 = donut (e.g. 60)
- \`padAngle\`: radians of gap between slices (e.g. 0.02)
- \`cornerRadius\`: rounded slice corners in pixels
- \`stroke\`: outline color (default "white")
- \`strokeWidth\`: outline width (default 1.5)

**Labels:**
- \`labelFormat\`: "name" | "percent" | "value" | "name-percent"
- \`labelThreshold\`: minimum % to show label (default 5)
- \`fontSize\`: font size for slice labels and legend text (e.g. "13px", default "11px")

**Layout:**
- \`sort\`: "value-asc" | "value-desc" | "label-asc" | "label-desc" | null
- \`aggregate\`: true = sum by label before rendering, false = use raw rows

**Color:**
- Use top-level \`"color": { "scheme": "set2" }\` to change palette
- Use \`"fill": ["#e41a1c","#377eb8"]\` in mark \`options\` for explicit per-slice colors (overrides scheme)

**Sizing:** Always set top-level \`"width"\` and \`"height"\` for arc charts (e.g., 640×400). Without explicit dimensions, the chart may render too small.

**When to use arc:** Use arc for "percentage of total", "share of", "proportion", or "breakdown" requests. Arc inherently shows part-of-whole without needing percentage computation. Do NOT attempt to compute percentages with bar charts — use arc instead.

**Example — donut chart:**
\`\`\`json
{
  "marks": [
    { "type": "arc", "data": "csv", "options": { "value": "revenue", "label": "region", "innerRadius": 60, "padAngle": 0.02, "cornerRadius": 4 } }
  ],
  "color": { "legend": true }
}
\`\`\``,
  },

  bar: {
    title: "Bar Marks (barX, barY)",
    content: `Vertical (\`barY\`) or horizontal (\`barX\`) bars for categorical comparisons, counts, and sums.

**Key options:**
- \`x\` / \`y\`: position channels (one categorical, one quantitative)
- \`fill\`: color by field or constant (default: currentColor)
- \`stroke\`: outline color (default: none)
- \`inset\`, \`insetLeft\`, \`insetRight\`, \`insetTop\`, \`insetBottom\`: pixel gap between bars (useful for histograms)
- \`rx\`, \`ry\`: corner radius in pixels for rounded bar edges
- \`sort\`: sort bars — use \`{ x: "y" }\` to sort x by y values, or \`{ x: "-y" }\` for descending
- \`tip\`: true for hover tooltips

**barY** expects x (categorical) and y (quantitative). **barX** swaps: y is categorical, x is quantitative.

**Example — horizontal bar chart sorted by value:**
\`\`\`json
{
  "marks": [
    { "type": "barX", "data": "csv", "options": { "y": "country", "x": "population", "fill": "steelblue", "sort": { "y": "-x" }, "tip": true } }
  ]
}
\`\`\`

**Rotated x-axis labels:** When labels overlap or user asks for rotation, add an \`axisX\` mark:
\`\`\`json
{
  "marks": [
    { "type": "barY", "data": "csv", "options": { "x": "country", "y": "gdp_billions", "fill": "steelblue", "tip": true } },
    { "type": "axisX", "options": { "tickRotate": -45, "fontSize": 11, "labelAnchor": "right" } }
  ],
  "x": { "axis": null },
  "marginBottom": 80
}
\`\`\`
Set \`"x": { "axis": null }\` to hide the default axis (the axisX mark replaces it). Set \`"marginBottom": 80\` to make room for angled labels.

**Gotcha:** For bar aggregation, use \`groupX\`/\`groupY\` transforms (see group topic). For stacked bars, add \`stackY\` (see stack topic). For grouped/side-by-side bars, use \`fx\` faceting instead of \`stackY\` (see faceting topic). Do NOT confuse \`groupX\` (an aggregation transform) with "grouped bars" (a visual side-by-side layout using \`fx\`).

**Gotcha:** Setting \`fill\` to a numeric column creates one color per unique value (potentially dozens of legend entries). Use a categorical column for \`fill\`, or a constant color string like \`"steelblue"\`.

**Gotcha:** When the user says "average" or "mean", use \`groupX: { outputs: { y: "mean" } }\` — NOT \`"sum"\`. Using \`sum\` when the user asked for an average produces values orders of magnitude too large (e.g., sum of 50 test scores ≈ 3750, but mean ≈ 75). Always match the reducer to the user's intent.`,
  },

  dot: {
    title: "Dot Mark",
    content: `Draws circles (or symbols) at x, y positions — used for scatter plots, bubble charts, and beeswarm plots.

**Key options:**
- \`x\`, \`y\`: position channels (bound to x/y scales)
- \`r\`: radius — a field name for bubble charts (bound to sqrt scale), or a constant number in pixels (default: 3)
- \`fill\`: fill color — field name or constant (default: currentColor if stroke is none)
- \`stroke\`: stroke color (default: none)
- \`strokeWidth\`: stroke width in pixels (default: 1.5)
- \`fillOpacity\`, \`opacity\`: transparency (0–1)
- \`symbol\`: categorical symbol channel — values: "circle", "cross", "diamond", "square", "star", "triangle", "wye"
- \`rotate\`: rotation angle in degrees
- \`tip\`: true for hover tooltips

**Example — scatter plot with size and color:**
\`\`\`json
{
  "marks": [
    { "type": "dot", "data": "csv", "options": { "x": "gdp", "y": "life_expectancy", "r": "population", "fill": "continent", "fillOpacity": 0.7, "tip": true } }
  ],
  "color": { "legend": true }
}
\`\`\`

**Gotcha:** When using \`r\` with a field, the scale is sqrt by default (so area is proportional to value). For a constant size, pass a number directly: \`"r": 5\`.`,
  },

  line: {
    title: "Line Marks (line, lineY, lineX)",
    content: `Draws lines connecting data points — used for time series, trends, and connected scatter plots.

**Variants:**
- \`line\`: needs both x and y channels
- \`lineY\`: shorthand where x defaults to index (0, 1, 2…) — use for simple series
- \`lineX\`: shorthand where y defaults to index

**Key options:**
- \`x\`, \`y\`: position channels
- \`stroke\`: color channel for multi-series lines (NOT \`fill\` — fill creates polygons!)
- \`strokeWidth\`: line thickness in pixels (default: 1.5)
- \`strokeOpacity\`: line opacity (0–1)
- \`strokeDasharray\`: dash pattern, e.g. "4 2" for dashed lines
- \`curve\`: interpolation — "linear" (default), "catmull-rom" (smooth through points), "monotone-x" (smooth, preserves monotonicity), "step" (stepped), "step-before", "step-after", "basis" (smooth, doesn't pass through points), "natural" (natural cubic spline)
- \`z\`: grouping channel (defaults to stroke/fill) — use to draw separate lines per group
- \`marker\`: add markers at data points — "circle", "arrow", "dot", or true
- \`tip\`: true for hover tooltips

**Example — multi-series line chart:**
\`\`\`json
{
  "marks": [
    { "type": "line", "data": "csv", "options": { "x": "date", "y": "price", "stroke": "company", "curve": "catmull-rom", "tip": true } }
  ],
  "color": { "legend": true }
}
\`\`\`

**CRITICAL: Use \`stroke\`, not \`fill\`, for line color.** Using \`fill\` on a line mark creates filled polygons/triangles.`,
  },

  area: {
    title: "Area Marks (areaY, areaX)",
    content: `Draws filled regions between a baseline and topline — used for area charts, stacked areas, and band charts.

**Variants:**
- \`areaY\`: baseline and topline share x values (time goes right). Most common.
- \`areaX\`: baseline and topline share y values (time goes up).

**Key options:**
- \`x\`, \`y\`: shorthand — when y is specified without y1/y2, an implicit stackY is applied (baseline at y=0)
- \`x1\`, \`x2\`, \`y1\`, \`y2\`: explicit baseline/topline channels for band charts
- \`fill\`: fill color — field name for stacked areas, or constant color
- \`fillOpacity\`: fill transparency (default: 1; use ~0.5 for overlapping areas)
- \`stroke\`: outline color (default: none for area)
- \`curve\`: same curve options as line mark — "linear", "catmull-rom", "monotone-x", "step", "basis", "natural"
- \`z\`: grouping channel (defaults to fill)
- \`tip\`: true for hover tooltips

**Example — stacked area chart:**
\`\`\`json
{
  "marks": [
    { "type": "areaY", "data": "csv", "options": { "x": "date", "y": "revenue", "fill": "product", "curve": "monotone-x", "tip": true } }
  ],
  "color": { "legend": true }
}
\`\`\`

**Example -- single-series area chart (filtered to one category):**
\`\`\`json
{
  "marks": [
    { "type": "areaY", "data": "csv", "options": { "x": "month", "y": "temperature", "fill": "steelblue", "filter": { "city": "New York" }, "curve": "monotone-x", "tip": true } }
  ],
  "x": { "domain": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] }
}
\`\`\`
Use a constant \`fill\` color (e.g. \`"steelblue"\`) for single-series area charts. Use \`filter\` to select one category from multi-category data.

**Multi-series area (non-stacked):** areaY implicitly stacks when \`fill\` is a data field — even without explicit \`stackY\`. To create truly overlapping areas, use \`y1: 0\` and \`y2\` to force a shared zero baseline:
\`\`\`json
{ "type": "areaY", "data": "csv", "options": { "x": "month", "y1": 0, "y2": "temperature", "fill": "city", "fillOpacity": 0.3, "stroke": "city", "curve": "monotone-x", "tip": true } }
\`\`\`
For non-summable values (temperature, prices, rates), prefer a **line chart** with \`stroke\` instead — it's clearer and avoids stacking confusion entirely.

**CRITICAL — implicit stacking:** When \`fill\` is a field name (not a CSS color), Observable Plot applies implicit \`stackY\` to areaY. This means \`areaY\` with \`fill: "city"\` and \`fillOpacity: 0.3\` does NOT produce overlapping areas — it produces stacked areas that merely look semi-transparent. The y-values are cumulative.

**Gotcha:** For area marks, \`fill\` is correct (unlike line marks which use \`stroke\`). But beware: when \`fill\` is a field, areas are automatically stacked unless you use explicit \`y1\`/\`y2\`.`,
  },

  cell: {
    title: "Cell Mark",
    content: `Draws rectangles in a grid — used for heatmaps where both x and y are ordinal/categorical.

**Key options:**
- \`x\`, \`y\`: categorical position channels (bound to band scales)
- \`fill\`: quantitative field for color intensity (the heatmap value)
- \`inset\`: pixel gap between cells (default: 0.5)
- \`rx\`, \`ry\`: corner radius for rounded cells
- \`tip\`: true for hover tooltips

**Example — heatmap:**
\`\`\`json
{
  "marks": [
    { "type": "cell", "data": "csv", "options": { "x": "month", "y": "category", "fill": "value", "inset": 1, "tip": true } }
  ],
  "color": { "scheme": "YlOrRd", "legend": true }
}
\`\`\`

**Aggregated heatmap:** When multiple rows map to the same cell (e.g., multiple buildings per hour×weekday), use \`group\` to aggregate:
\`\`\`json
{ "type": "cell", "data": "csv", "options": { "x": "hour", "y": "weekday", "fill": "consumption_kwh", "group": { "outputs": { "fill": "mean" } }, "tip": true } }
\`\`\`
Use \`group\` (NOT \`groupX\`) — \`group\` aggregates by ALL position channels (both x and y). \`groupX\` only groups by x, which drops the y dimension and produces empty cells.

**Gotcha:** Cell marks expect both x and y to be ordinal. For continuous x or y, use \`rect\` with \`binX\`/\`binY\` instead. Numeric values (like hour 0-23) are auto-converted to band scales.`,
  },

  rect: {
    title: "Rect Marks (rect, rectX, rectY)",
    content: `Draws axis-aligned rectangles — used for histograms (with bin transform), 2D heatmaps with continuous axes, and Marimekko charts.

**Variants:**
- \`rect\`: general rectangle with x1, x2, y1, y2
- \`rectY\`: shorthand for vertical rects (histograms with binX)
- \`rectX\`: shorthand for horizontal rects (histograms with binY)

**Key options:**
- \`x\`, \`y\`: when used with bin transform, these are the binned channels
- \`x1\`, \`x2\`, \`y1\`, \`y2\`: explicit edge positions
- \`fill\`: fill color (field or constant)
- \`inset\`: pixel gap between rects (bin transform adds default inset of 0.5)
- \`rx\`, \`ry\`: corner radius
- \`tip\`: true for hover tooltips

**Example — histogram:**
\`\`\`json
{
  "marks": [
    { "type": "rectY", "data": "csv", "options": { "x": "age", "binX": { "outputs": { "y": "count" } }, "fill": "steelblue", "tip": true } }
  ]
}
\`\`\`

**Note:** Combining binX and binY in the same mark is not supported. For 2D density, use a cell mark with categorical data instead.`,
  },

  text: {
    title: "Text Mark",
    content: `Renders text labels at x, y positions — used for data labels, annotations, and text-based charts.

**Key options:**
- \`x\`, \`y\`: position channels
- \`text\`: the text content — a field name, or a constant string
- \`fontSize\`: font size in pixels (default: 10)
- \`fontWeight\`: "bold", "normal", etc.
- \`fontFamily\`: font family string
- \`fontStyle\`: "italic", "normal"
- \`fill\`: text color (default: currentColor)
- \`stroke\`: text outline color (useful for readability on busy charts — set \`paintOrder: "stroke"\` and white stroke)
- \`strokeWidth\`: outline width
- \`textAnchor\`: "start", "middle", "end" (horizontal alignment)
- \`lineAnchor\`: "top", "middle", "bottom" (vertical alignment)
- \`rotate\`: rotation angle in degrees
- \`dx\`, \`dy\`: pixel offset from position (useful for nudging labels)
- \`lineWidth\`: max characters before wrapping (in ems)
- \`tip\`: true for hover tooltips

**Example — labeled scatter plot:**
\`\`\`json
{
  "marks": [
    { "type": "dot", "data": "csv", "options": { "x": "gdp", "y": "life_exp", "r": 3 } },
    { "type": "text", "data": "csv", "options": { "x": "gdp", "y": "life_exp", "text": "country", "dy": -8, "fontSize": 10 } }
  ]
}
\`\`\`

**Value labels on aggregated bars:** When adding data labels to a bar chart that uses groupX, the text mark needs the SAME groupX with an extra \`"text"\` output:
\`\`\`json
{
  "marks": [
    { "type": "barY", "data": "csv", "options": { "x": "product", "y": "revenue", "fill": "steelblue", "groupX": { "outputs": { "y": "sum" } }, "tip": true } },
    { "type": "text", "data": "csv", "options": { "x": "product", "y": "revenue", "text": "revenue", "dy": -8, "groupX": { "outputs": { "y": "sum", "text": "sum" } } } }
  ]
}
\`\`\`
CRITICAL: the text mark's \`groupX.outputs\` must include \`"text": "sum"\` (or same reducer as y) so labels show aggregated values, not raw row values.`,
  },

  tick: {
    title: "Tick Marks (tickX, tickY)",
    content: `Draws small perpendicular line segments at data points — used for strip plots, rug plots, and lollipop charts.

**Variants:**
- \`tickX\`: vertical ticks at x positions (line perpendicular to x-axis)
- \`tickY\`: horizontal ticks at y positions (line perpendicular to y-axis)

**Key options:**
- \`x\`, \`y\`: position channels. tickX requires x; tickY requires y. The other channel is optional (categorical grouping).
- \`stroke\`: tick color (default: currentColor)
- \`strokeWidth\`: tick thickness (default: 1)
- \`inset\`, \`insetTop\`, \`insetBottom\`: shorten ticks from band edges
- \`tip\`: true for hover tooltips

**Example — strip plot (distribution of values by category):**
\`\`\`json
{
  "marks": [
    { "type": "tickX", "data": "csv", "options": { "x": "salary", "y": "department", "stroke": "steelblue", "strokeOpacity": 0.5, "tip": true } }
  ]
}
\`\`\``,
  },

  rule: {
    title: "Rule Marks (ruleX, ruleY)",
    content: `Draws horizontal or vertical lines spanning the chart — used for reference lines, baselines, thresholds, and grid annotations.

**Variants:**
- \`ruleX\`: vertical line at x position (spans full y range by default)
- \`ruleY\`: horizontal line at y position (spans full x range by default)

**Key options:**
- \`x\` / \`y\`: position channel (the value where the line is drawn)
- \`x1\`, \`x2\` / \`y1\`, \`y2\`: to clip the line to a range instead of full span
- \`stroke\`: line color (default: currentColor)
- \`strokeWidth\`: line thickness (default: 1)
- \`strokeDasharray\`: dash pattern, e.g. "4 2"
- \`strokeOpacity\`: opacity (0–1)

**Example — baseline at zero for bar chart:**
\`\`\`json
{ "type": "ruleY", "data": null, "options": { "values": [0] } }
\`\`\`

**Example — threshold line:**
\`\`\`json
{ "type": "ruleY", "data": null, "options": { "values": [100], "stroke": "red", "strokeDasharray": "4 2", "strokeWidth": 2 } }
\`\`\`

**IMPORTANT:** For static reference lines, \`data\` MUST be \`null\` (not \`"csv"\`). Pass values via \`options.values\` array. Using \`"data": "csv"\` will draw lines from the CSV data, not at your specified values.

**Styling tip:** When users ask for colored or dashed reference lines, always include \`"stroke"\` and \`"strokeDasharray"\` on the rule mark. Don't drop these options when iterating on a chart — preserve all styling from previous iterations.`,
  },

  frame: {
    title: "Frame Mark",
    content: `Draws a rectangle around the plot area — a decorative border for the chart.

**Key options:**
- \`stroke\`: border color (default: currentColor)
- \`strokeWidth\`: border width
- \`strokeDasharray\`: dash pattern
- \`fill\`: background fill (default: none)
- \`fillOpacity\`: background opacity
- \`rx\`, \`ry\`: corner radius
- \`inset\`: shrink frame by pixels

**Example:**
\`\`\`json
{ "type": "frame", "options": { "stroke": "#ddd", "strokeWidth": 1 } }
\`\`\`

The frame mark does not take data. Omit \`data\` or set it to null.`,
  },

  tip: {
    title: "Tip Mark",
    content: `Renders standalone tooltips anchored to data points — useful when you want tooltips on their own or when the primary mark doesn't support \`tip: true\`.

**Key options:**
- \`x\`, \`y\`: anchor position channels
- \`title\`: primary text content (field name)
- \`channels\`: additional fields to show — object mapping display name to field
- \`anchor\`: tooltip position relative to point — "top", "bottom", "left", "right", "top-left", etc.
- \`fontSize\`: font size (default: 10)
- \`lineWidth\`: max line width in ems before wrapping
- \`fill\`: tooltip background (default: white)
- \`stroke\`: tooltip border color

**In most cases, just add \`"tip": true\` to your mark options** instead of creating a separate tip mark. The standalone tip mark is for advanced cases.

**Example:**
\`\`\`json
{ "type": "tip", "data": "csv", "options": { "x": "date", "y": "value", "title": "label", "anchor": "bottom" } }
\`\`\``,
  },

  axis: {
    title: "Axis Marks (axisX, axisY, axisFx, axisFy)",
    content: `Explicit axis marks for fine control over axis appearance. Use when you need custom font size, tick rotation, or label positioning beyond what top-level scale options provide.

**Variants:**
- \`axisX\` / \`axisY\`: for x and y scales
- \`axisFx\` / \`axisFy\`: for facet scales

**Key options:**
- \`label\`: axis label text
- \`labelAnchor\`: "left", "center", "right" (for x) or "top", "center", "bottom" (for y)
- \`labelOffset\`: pixel distance from axis
- \`fontSize\`: tick label font size in pixels
- \`tickRotate\`: rotate tick labels by degrees (e.g., -45 for diagonal)
- \`ticks\`: number of ticks, or an explicit array of tick values
- \`tickFormat\`: d3-format string (e.g. "$,.0f", ".1%")
- \`tickSize\`: tick line length in pixels
- \`anchor\`: "top" or "bottom" for x-axis; "left" or "right" for y-axis
- \`color\`: tick and label color
- \`fontFamily\`: font family
- \`fontWeight\`: font weight

**IMPORTANT:** When using explicit axis marks, set \`"axis": null\` on the corresponding top-level scale to suppress the default axis.

**Example — rotated x-axis labels:**
\`\`\`json
{
  "marks": [
    { "type": "barY", "data": "csv", "options": { "x": "name", "y": "value" } },
    { "type": "axisX", "options": { "tickRotate": -45, "fontSize": 11, "labelAnchor": "right" } }
  ],
  "x": { "axis": null }
}
\`\`\``,
  },

  group: {
    title: "Group Transform (groupX, groupY, groupZ)",
    content: `Groups data by a discrete channel and computes an aggregate (count, sum, mean, etc.) for each group. This is how you make bar charts from raw data.

**Variants:**
- \`group\`: groups on ALL position channels (x and y) — use for heatmaps/cells where you need to aggregate by both dimensions
- \`groupX\`: groups on x, outputs to y (and optionally other channels)
- \`groupY\`: groups on y, outputs to x
- \`groupZ\`: groups on z/fill/stroke (no position output)

**Spec format:**
\`\`\`json
"options": {
  "x": "category",
  "y": "numericField",
  "groupX": { "outputs": { "y": "sum" } }
}
\`\`\`
The \`outputs\` object maps output channel names to reducer names.

**Available reducers:** "count", "sum", "mean", "median", "min", "max", "mode", "first", "last", "deviation", "variance", "proportion", "proportion-facet".

**CRITICAL RULES:**
1. The grouping channel (e.g., x for groupX) goes OUTSIDE the transform — it is a regular mark option.
2. Only the AGGREGATED output channel goes in \`outputs\`.
3. NEVER put a column name as a reducer. Reducers are: "count", "sum", "mean", etc.
4. If groupX produces NaN, you likely put the wrong channels in outputs.

**Example — count by category:**
\`"x": "status", "groupX": { "outputs": { "y": "count" } }\`

**Example — average price by region:**
\`"x": "region", "y": "price", "groupX": { "outputs": { "y": "mean" } }\`

**CRITICAL: Match group direction to mark type:**
- \`barY\` (vertical bars) → use \`groupX\` (group on x, output to y)
- \`barX\` (horizontal bars) → use \`groupY\` (group on y, output to x)
Using groupX with barX will collapse all data into a single bar.

**Example — horizontal bar chart (barX + groupY):**
\`"y": "product", "x": "revenue", "groupY": { "outputs": { "x": "sum" } }, "sort": { "y": "-x" }\`

**Example — heatmap aggregation (cell + group):**
\`"x": "hour", "y": "weekday", "fill": "consumption", "group": { "outputs": { "fill": "mean" } }\`
Use \`group\` (not \`groupX\`) for cell/heatmap marks — \`group\` aggregates by ALL position channels. \`groupX\` only groups by x, which drops y and produces empty cells.

**Available reducers:** "count", "sum", "mean", "median", "min", "max", "mode", "first", "last", "deviation", "variance", "proportion", "proportion-facet".
NEVER use a column name (e.g. "revenue") as a reducer — that is always wrong.

**Choosing the right reducer:** Use \`"sum"\` when values should be added (e.g. revenue, counts). Use \`"mean"\` for averages (e.g. average price by region). Use \`"first"\` when each group has exactly one value and you just need to pass it through (common after melt, where each row is already unique per group combo).

**IMPORTANT:** \`groupX\`/\`groupY\` is an AGGREGATION transform — it computes sums, counts, means. It does NOT create side-by-side (grouped) bar layouts. For side-by-side bars, use \`fx\` faceting (see faceting topic). The name "group" in \`groupX\` refers to grouping data for aggregation, not visual grouping of bars.

**WARNING:** Using \`groupY\` on \`barY\` is the #1 cause of broken bar charts — it renders STACKED bars instead of the intended layout. This rule is absolute:
- barY → groupX (ALWAYS)
- barX → groupY (ALWAYS)

**Lines and areas with many data points:** When plotting trends from transactional data (e.g., orders, events, logs), use \`groupX\` to aggregate by the x-axis value. Without aggregation, each raw row becomes a separate point, creating noisy spikes instead of a clean trend.
Example — monthly revenue trend from order-level data:
\`"type": "line", "options": { "x": "year_month", "y": "revenue", "stroke": "category", "groupX": { "outputs": { "y": "sum" } } }\``,
  },

  bin: {
    title: "Bin Transform (binX, binY)",
    content: `Bins continuous data into intervals and aggregates — used for histograms and density visualizations.

**Variants:**
- \`binX\`: bins along x, outputs to y (vertical histogram)
- \`binY\`: bins along y, outputs to x (horizontal histogram)

**Spec format:**
\`\`\`json
"options": {
  "x": "numericField",
  "binX": { "outputs": { "y": "count" } }
}
\`\`\`

**Key options inside binX/binY:**
- \`outputs\`: object mapping output channels to reducers — same reducers as group ("count", "sum", "mean", etc.)
- \`thresholds\`: number of bins (e.g., 20) or a method name ("freedman-diaconis", "scott", "sturges")
- \`domain\`: explicit [min, max] range for bins
- \`cumulative\`: true for cumulative histogram

**Example — histogram with 30 bins:**
\`\`\`json
{
  "marks": [
    { "type": "rectY", "data": "csv", "options": { "x": "age", "binX": { "outputs": { "y": "count" }, "thresholds": 30 }, "fill": "steelblue", "tip": true } }
  ]
}
\`\`\`

**Gotcha:** Use \`rectY\` (not \`barY\`) for histograms — bars are for discrete categories, rects are for continuous bins. Combining binX and binY in one mark is not supported.

**IMPORTANT:** Even with binX, you MUST include \`"data": "csv"\` and \`"x": "fieldName"\` in the mark. The \`x\` channel tells binX which column to bin. Without it, the histogram will be empty.`,
  },

  stack: {
    title: "Stack Transform (stackY, stackX)",
    content: `Stacks marks vertically or horizontally — used for stacked bar charts, stacked area charts, and streamgraphs.

**Variants:**
- \`stackY\`: stacks along y (for vertical stacking — barY, areaY)
- \`stackX\`: stacks along x (for horizontal stacking — barX, areaX)

**Spec format:**
\`\`\`json
"options": {
  "x": "category",
  "y": "revenue",
  "fill": "product",
  "groupX": { "outputs": { "y": "sum" } },
  "stackY": {}
}
\`\`\`

**Key options inside stackY/stackX:**
- \`order\`: stacking order — "value" (largest on bottom), "-value" (smallest on bottom), "appearance" (first occurrence), "inside-out" (for streamgraphs), "sum" (by total), null (input order)
- \`offset\`: stacking offset — null (default, zero baseline), "normalize" (100% stacked), "center" (centered/streamgraph), "wiggle" (minimizes weighted wiggle for streamgraphs)
- \`reverse\`: true to reverse the stack order

**Example — 100% stacked bar chart:**
\`\`\`json
{
  "marks": [
    { "type": "barY", "data": "csv", "options": { "x": "quarter", "y": "revenue", "fill": "product", "groupX": { "outputs": { "y": "sum" } }, "stackY": { "offset": "normalize" }, "tip": true } }
  ],
  "y": { "tickFormat": ".0%" }
}
\`\`\`

**Example — horizontal stacked bar chart:**
Use \`stackX\` (not \`stackY\`) with \`barX\`, and \`groupY\` (not \`groupX\`):
\`\`\`json
{ "type": "barX", "data": "csv", "options": { "y": "product", "x": "revenue", "fill": "region", "groupY": { "outputs": { "x": "sum" } }, "stackX": {}, "tip": true } }
\`\`\`

**Gotcha:** Stack transforms are typically combined with group transforms. The group computes the aggregate values, and stack arranges them.

**WARNING — offset:normalize on single-category stacks:** If you use \`stackY\` with \`offset: "normalize"\` but each x-value has only ONE fill category, every bar becomes 100%. This is useless. Normalize only works when each stack has MULTIPLE segments (multiple fill values per x position). For single-category proportions, use an \`arc\` (pie) chart instead.

**Want side-by-side (grouped) bars instead of stacked?** Do NOT use \`stackY\`/\`stackX\` — remove it entirely and use \`fx\`/\`fy\` (faceting) instead. See the faceting topic.`,
  },

  "color-scale": {
    title: "Color Scales & Schemes",
    content: `Controls how data values map to colors. Set via the top-level \`"color"\` object in the spec.

**Key options:**
- \`scheme\`: named color scheme — see lists below
- \`type\`: scale type — "categorical", "ordinal", "linear", "sqrt", "log", "symlog", "sequential", "diverging", "threshold", "quantile"
- \`domain\`: explicit domain values — array of categories or [min, max]
- \`range\`: explicit output colors — array of CSS color strings
- \`legend\`: true to show color legend
- \`label\`: legend label text
- \`reverse\`: true to reverse the color direction
- \`pivot\`: midpoint for diverging scales (default: 0)
- \`zero\`: true to include zero in the domain

**Categorical schemes:** "tableau10" (default), "accent", "category10", "dark2", "paired", "pastel1", "pastel2", "set1", "set2", "set3", "observable10"
**Sequential schemes:** "blues", "greens", "greys", "oranges", "purples", "reds", "turbo", "viridis", "inferno", "magma", "plasma", "warm", "cool", "YlGnBu", "YlOrRd", "BuGn", "BuPu"
**Diverging schemes:** "rdbu", "rdylbu", "rdylgn", "piyg", "brbg", "prgn", "puor", "spectral"

**Example — sequential color scale with legend:**
\`\`\`json
{ "color": { "scheme": "YlOrRd", "type": "linear", "legend": true, "label": "Temperature (°C)" } }
\`\`\`

**Example — custom categorical colors:**
\`\`\`json
{ "color": { "domain": ["A", "B", "C"], "range": ["#e41a1c", "#377eb8", "#4daf4a"], "legend": true } }
\`\`\``,
  },

  "position-scales": {
    title: "Position Scales (x, y)",
    content: `Controls how data values map to x/y positions. Set via top-level \`"x"\` and \`"y"\` objects.

**Key options:**
- \`label\`: axis label text
- \`domain\`: explicit domain — [min, max] for quantitative, or array of categories for ordinal
- \`range\`: explicit pixel range — [start, end]
- \`type\`: scale type — "linear" (default for numbers), "log", "sqrt", "symlog", "pow", "utc" (default for dates), "time", "point", "band"
- \`tickFormat\`: d3-format string for tick labels — "$,.2f" (currency), ".1%" (percent), ",.0f" (comma-separated integer), ".2s" (SI prefix), "+.1f" (with sign)
- \`ticks\`: number of ticks
- \`grid\`: true to show grid lines
- \`nice\`: true to round domain to nice values
- \`zero\`: true to include zero in the domain
- \`reverse\`: true to reverse the axis direction
- \`inset\`: padding in pixels from the edge
- \`padding\`: band/point scale padding (0–1)
- \`axis\`: "top", "bottom", "left", "right", or null to suppress

**Example — log scale with formatted ticks:**
\`\`\`json
{
  "x": { "label": "Revenue", "type": "log", "tickFormat": "$,.0f", "grid": true },
  "y": { "label": "Growth (%)", "tickFormat": "+.1%", "nice": true, "zero": true }
}
\`\`\`

**Date axes:** Dates are auto-detected. Use \`"type": "utc"\` if needed. tickFormat uses d3-time-format: "%Y" (year), "%b %Y" (month year), "%b %d" (month day).

**Ordinal ordering:** Ordinal scales sort alphabetically by default. To enforce a custom order, set \`domain\` to an explicit array: \`"x": { "domain": ["Mon", "Tue", "Wed", "Thu", "Fri"] }\`. This is critical for month names, weekdays, or any non-alphabetical ordering.`,
  },

  faceting: {
    title: "Faceting (fx, fy)",
    content: `Creates small multiples by splitting data into panels by a categorical variable.

**How to use:**
- Add \`fx\` or \`fy\` in **mark options** to split by that field
- Set the corresponding top-level \`fx\` / \`fy\` scale for label and axis control

**Mark option:**
- \`fx\`: field name for horizontal faceting (panels left to right)
- \`fy\`: field name for vertical faceting (panels top to bottom)

**Top-level scale options (same as position scales):**
- \`label\`: facet axis label
- \`domain\`: explicit array of facet values (controls ordering)
- \`padding\`: gap between panels (0–1)
- \`axis\`: null to suppress facet labels

**Example — scatter plot faceted by region:**
\`\`\`json
{
  "marks": [
    { "type": "dot", "data": "csv", "options": { "x": "income", "y": "health", "fx": "region", "fill": "region", "tip": true } }
  ],
  "fx": { "label": "Region", "padding": 0.1 }
}
\`\`\`

**Example — grouped bar chart ("products side by side for each region"):**
\`\`\`json
{
  "marks": [
    { "type": "barY", "data": "csv", "options": { "x": "product", "y": "revenue", "fill": "product", "fx": "region", "groupX": { "outputs": { "y": "sum" } }, "tip": true } }
  ],
  "fx": { "padding": 0.1 }, "x": { "axis": null }, "color": { "legend": true }
}
\`\`\`
Think: "for each ___" = fx. \`fx\` = outer grouping (one panel per value), \`x\` = inner grouping (bars within each panel). Don't reverse them.

**Example — horizontal grouped bar chart ("regions side by side for each product"):**
\`\`\`json
{
  "marks": [
    { "type": "barX", "data": "csv", "options": { "y": "region", "x": "revenue", "fill": "region", "fy": "product", "groupY": { "outputs": { "x": "sum" } }, "tip": true } }
  ],
  "fy": { "padding": 0.1 }, "y": { "axis": null }, "color": { "legend": true }
}
\`\`\`
For horizontal grouped bars: use \`fy\` (not \`fx\`) and \`groupY\` (not \`groupX\`). \`fy\` = outer grouping (one row per value), \`y\` = inner grouping (bars within each row).

**Example — faceted histogram (rectY + binX + fx):**
\`\`\`json
{
  "marks": [
    { "type": "rectY", "data": "csv", "options": { "x": "income", "fx": "state", "fill": "state", "binX": { "outputs": { "y": "count" } }, "tip": true } }
  ],
  "fx": { "label": "State", "padding": 0.1 }, "color": { "legend": true }
}
\`\`\`
Use \`rectY\` (not \`barY\`) for histograms of continuous data. \`fx\` MUST be in the mark's \`options\`.

**Grouped bars vs. stacked bars:** Use \`fx\`/\`fy\` (faceting) for side-by-side grouped bars. Use \`stackY\`/\`stackX\` for stacked bars. These are mutually exclusive — if the user asks for "grouped" or "side-by-side", use faceting and do NOT include stack.

**Horizontal vs. vertical faceting:** \`fx\` creates columns (left to right) — use with \`barY\`. \`fy\` creates rows (top to bottom) — use with \`barX\`.

**Common mistake:** Putting \`fx\`/\`fy\` only at the top level but NOT in mark options. The top-level \`"fx": { ... }\` configures the facet scale (label, padding), but the mark's \`options.fx\` is what splits data into panels. You MUST include \`"fx": "fieldName"\` inside the mark's \`options\`.

**Gotcha:** You can use both fx and fy together for a grid layout. All panels share the same x/y scales for easy comparison.`,
  },

  styling: {
    title: "Common Mark Options & Styling",
    content: `Options available on ALL mark types for visual styling and positioning.

**Color & opacity:**
- \`fill\`: fill color (field or constant)
- \`fillOpacity\`: fill opacity (0–1)
- \`stroke\`: stroke color
- \`strokeWidth\`: stroke width in pixels
- \`strokeOpacity\`: stroke opacity (0–1)
- \`strokeDasharray\`: dash pattern, e.g. "4 2"
- \`strokeLinecap\`: "butt", "round", "square"
- \`strokeLinejoin\`: "bevel", "miter", "round"
- \`opacity\`: overall element opacity (0–1)

**Position adjustments:**
- \`dx\`: horizontal pixel offset
- \`dy\`: vertical pixel offset

**Rendering:**
- \`mixBlendMode\`: CSS blend mode — "multiply" (great for overlapping dots), "screen", "overlay"
- \`paintOrder\`: "stroke" (draws stroke behind fill — useful for text outlines)
- \`shapeRendering\`: "crispEdges" (sharp pixels for heatmaps)

**Sorting & filtering:**
- \`sort\`: sort the mark data — \`{ "x": "y" }\` sorts x by y values, \`{ "x": "-y" }\` for descending
- \`filter\`: field name or function to filter data points
- \`reverse\`: true to reverse the data order

**Channels:**
- \`channels\`: additional channels to include in tooltips — \`{ "Label": "fieldName" }\`
- \`href\`: field name for clickable links
- \`title\`: field name for native browser tooltips (separate from \`tip\`)

**Global style (top-level):**
\`"style": { "fontFamily": "serif", "fontSize": "14px", "background": "#f5f5f5" }\`
Applies CSS to the entire SVG container.`,
  },

  melt: {
    title: "Melt Transform (wide-to-long reshaping)",
    content: `Reshapes wide-format data (one column per series) into long format (one row per observation). Required when column names represent categories you want to plot.

**When to use:** If the CSV has multiple columns for the SAME kind of measure (like \`q1_score\`, \`q2_score\`, \`q3_score\`, or \`revenue_2020\`, \`revenue_2021\`), you MUST melt them first. Do NOT invent column names that don't exist — melt creates new \`key\`/\`value\` columns from the original column names and their values.

**Spec format:**
\`\`\`json
"melt": { "columns": ["col1", "col2", "col3"], "key": "metric", "value": "amount" }
\`\`\`
- \`columns\` (required): which columns to unpivot into rows
- \`key\` (default: "variable"): name for the new column holding the original column names
- \`value\` (default: "value"): name for the new column holding the values
- All columns NOT listed in \`columns\` are kept as-is (they become id columns repeated for each melted row)

After melt, the \`key\` column works as a categorical series — use it with \`fill\` for stacking or \`fx\` for side-by-side grouping.

**Stacked bar chart with melt** (wide data → stacked bars):
\`\`\`json
{
  "marks": [{ "type": "barY", "data": "csv", "options": {
    "melt": { "columns": ["q1_score", "q2_score", "q3_score"], "key": "quarter", "value": "score" },
    "x": "department", "y": "score", "fill": "quarter",
    "groupX": { "outputs": { "y": "first" } }, "stackY": {}, "tip": true
  }}],
  "color": { "legend": true }
}
\`\`\`
NOTE: Use \`"first"\` reducer (not \`"sum"\`) when melt already produces one row per group combo — summing would be wrong if values shouldn't be added together (e.g. returns, percentages, scores).

**Grouped bar chart with melt** (wide data → side-by-side bars):
\`\`\`json
{
  "marks": [{ "type": "barY", "data": "csv", "options": {
    "melt": { "columns": ["q1_score", "q2_score", "q3_score"], "key": "quarter", "value": "score" },
    "x": "quarter", "y": "score", "fill": "quarter", "fx": "department", "tip": true
  }}],
  "fx": { "label": "Department", "padding": 0.1 }, "x": { "axis": null }, "color": { "legend": true }
}
\`\`\`
Set \`"x": { "axis": null }\` to hide the redundant x-axis labels — the color legend already identifies each bar.`,
  },

  filter: {
    title: "Filter Transform (row selection)",
    content: `Filters CSV rows before plotting. Use \`filter\` in mark options to select a subset of data.

**Spec format — in mark options:**
\`\`\`json
"filter": { "column": "value" }
\`\`\`

**Match types:**
- **Exact match:** \`"filter": { "city": "New York" }\`
- **String prefix:** \`"filter": { "year_month": "2024" }\` — matches "2024-01", "2024-06", etc.
- **Range:** \`"filter": { "revenue": { "$gte": 100, "$lte": 500 } }\` — supports \`$gte\`, \`$gt\`, \`$lte\`, \`$lt\`
- **Multi-value:** \`"filter": { "region": ["East", "West"] }\` — matches any listed value
- **Combined:** \`"filter": { "region": "East", "revenue": { "$gte": 100 } }\` — all conditions must match (AND)

**Combining filter + groupX + stackY** (stacked bar chart of a data subset):
\`\`\`json
{ "options": { "x": "category", "y": "revenue", "fill": "region",
  "filter": { "year_month": "2024" },
  "groupX": { "outputs": { "y": "sum" } }, "stackY": {}, "tip": true } }
\`\`\`
All three work together: filter narrows raw data first, then groupX aggregates, then stackY stacks. Order in JSON doesn't matter — they are applied in the correct sequence automatically.

**Single-series from multi-category data:** Use filter to isolate one category, then use a constant \`fill\` color:
\`\`\`json
{ "options": { "x": "month", "y": "temperature", "fill": "steelblue",
  "filter": { "city": "New York" }, "tip": true } }
\`\`\``,
  },

  "layout-patterns": {
    title: "Layout Patterns (stacked, grouped, horizontal)",
    content: `How to arrange bars in different visual layouts. \`groupX\`/\`groupY\` is the AGGREGATION transform. \`stackY\`/\`stackX\` vs \`fx\`/\`fy\` controls the VISUAL LAYOUT.

## Stacked vs. Grouped (side-by-side) bars
| User says | Orientation | Layout | Mechanism |
|-----------|-------------|--------|-----------|
| "stacked" | Vertical | Bars ON TOP | \`fill\` for color + \`stackY: {}\` |
| "grouped" / "side-by-side" | Vertical | Bars NEXT TO each other | \`fx\` in mark options — NO \`stackY\` |
| "horizontal stacked" | Horizontal | Bars END TO END | \`fill\` for color + \`stackX: {}\` |
| "horizontal grouped" | Horizontal | Bars in rows | \`fy\` in mark options — NO \`stackX\` |

## Converting between layouts
**Stacked → grouped:** Remove \`stackY: {}\`. Move the \`fill\` field to \`fx\`. Set \`x\` to the old \`fill\` field, set \`fill\` to match \`x\`. Add top-level \`"fx": { "padding": 0.1 }\`, \`"x": { "axis": null }\`, \`"color": { "legend": true }\`.
**Grouped → stacked:** Remove \`fx\` from mark options. Move the \`fx\` field to \`fill\`. Add \`stackY: {}\`. Remove top-level \`"fx"\` and \`"x": { "axis": null }\`.

## Flipping vertical ↔ horizontal
Swap ALL of these together:
| Vertical | Horizontal |
|----------|------------|
| barY | barX |
| groupX | groupY |
| stackY | stackX |
| fx | fy |
| x (categorical) | y (categorical) |
| y (quantitative) | x (quantitative) |
Partial swaps (e.g. barX with groupX, or barX with fx) = broken chart. Always swap ALL pairs.

## Examples

**Stacked bar chart** (sum revenue by category, colored by region):
\`\`\`json
{ "options": { "x": "category", "y": "revenue", "fill": "region",
  "groupX": { "outputs": { "y": "sum" } }, "stackY": {}, "tip": true } }
\`\`\`

**Grouped bar chart** ("products side by side for each region"):
\`\`\`json
{
  "marks": [{ "type": "barY", "data": "csv", "options": {
    "x": "product", "y": "revenue", "fill": "product", "fx": "region",
    "groupX": { "outputs": { "y": "sum" } }, "tip": true
  }}],
  "fx": { "padding": 0.1 }, "x": { "axis": null }, "color": { "legend": true }
}
\`\`\`
Think: "for each ___" = fx. \`fx\` = outer grouping (panels), \`x\` = inner grouping (bars within panel).

**Horizontal bar chart with aggregation** — for barX, use \`groupY\` (NOT \`groupX\`):
\`\`\`json
{ "options": { "y": "product", "x": "revenue",
  "groupY": { "outputs": { "x": "sum" } }, "sort": { "y": "-x" }, "tip": true } }
\`\`\`

**Horizontal grouped bar chart** ("regions side by side for each product"):
\`\`\`json
{
  "marks": [{ "type": "barX", "data": "csv", "options": {
    "y": "region", "x": "revenue", "fill": "region", "fy": "product",
    "groupY": { "outputs": { "x": "sum" } }, "tip": true
  }}],
  "fy": { "padding": 0.1 }, "y": { "axis": null }, "color": { "legend": true }
}
\`\`\`
For horizontal grouped bars: use \`fy\` (NOT \`fx\`) and \`groupY\` (NOT \`groupX\`).`,
  },

  "composite-patterns": {
    title: "Composite Patterns (lollipop, labels, Pareto, strip plot)",
    content: `Multi-mark compositions that combine two or more mark types.

## Lollipop charts
Compose using ruleX (stems from 0 to value) + dot (circles at value):
\`\`\`json
{
  "marks": [
    { "type": "ruleX", "data": "csv", "options": { "y": "category", "x": "value", "groupY": { "outputs": { "x": "mean" } } } },
    { "type": "dot", "data": "csv", "options": { "y": "category", "x": "value", "r": 6, "fill": "steelblue", "groupY": { "outputs": { "x": "mean" } } } }
  ]
}
\`\`\`
Both marks need the same aggregation. For vertical lollipops, use ruleY + dot with groupX instead.

## Value labels on bars
Add a \`text\` mark with the same position and aggregation as the bar. The \`text\` channel should reference the same column as the quantitative axis:
\`\`\`json
{
  "marks": [
    { "type": "barY", "data": "csv", "options": { "x": "product", "y": "revenue", "fill": "steelblue", "groupX": { "outputs": { "y": "sum" } }, "tip": true } },
    { "type": "text", "data": "csv", "options": { "x": "product", "y": "revenue", "text": "revenue", "dy": -8, "groupX": { "outputs": { "y": "sum", "text": "sum" } } } }
  ]
}
\`\`\`
CRITICAL: the text mark's \`groupX.outputs\` must include \`"text": "sum"\` (or the same reducer as y) so labels show the aggregated value, not raw row values.

## Pareto charts
The system CANNOT compute running cumulative percentages. When asked for a Pareto chart:
1. Render a bar chart sorted DESCENDING by value
2. In your text response, you MUST explicitly tell the user: "I've rendered the bars sorted by value. Observable Plot doesn't support cumulative percentage lines, so the Pareto overlay cannot be included."
3. Do NOT title the chart "Pareto Chart" — title it descriptively (e.g. "Revenue by Subcategory, Sorted Descending")
4. Do NOT attempt to fake a cumulative line or invent a "cumulative" transform

## Strip plots
Use \`tickX\` (not \`dot\`) for strip plots. tickX draws vertical line segments:
\`\`\`json
{ "type": "tickX", "data": "csv", "options": { "x": "score", "y": "subject", "stroke": "subject", "strokeOpacity": 0.5, "tip": true } }
\`\`\`

## Rotated axis labels
When the user asks for rotated labels, add an \`axisX\` mark AND hide the default axis:
\`\`\`json
{
  "marks": [
    { "type": "barY", "data": "csv", "options": { "x": "country", "y": "gdp", "fill": "steelblue", "tip": true } },
    { "type": "axisX", "options": { "tickRotate": -45, "labelAnchor": "right", "fontSize": 10 } }
  ],
  "x": { "axis": null },
  "marginBottom": 80
}
\`\`\`
When there are 20+ categories, prefer \`barX\` (horizontal bars) instead — it's always more readable.`,
  },
};

export function lookupDocs(topics: TopicId[]): string {
  return topics
    .map((id) => {
      const chunk = DOC_CHUNKS[id];
      return chunk
        ? `### ${chunk.title}\n${chunk.content}`
        : `Unknown topic: ${id}`;
    })
    .join("\n\n---\n\n");
}
