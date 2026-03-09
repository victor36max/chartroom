# Vega-Lite vs Observable Plot: Comparison for AI Chart Generation

A comprehensive comparison of the two leading declarative visualization libraries, evaluated through the lens of building an AI-powered chart generator (like Chartroom).

## Architecture & Philosophy

**Observable Plot** is an imperative-ish JavaScript library. You compose mark functions (`Plot.barY(data, {x, y})`) and Plot renders an SVG element. Built on D3, designed for fast exploratory data analysis. Specs are JavaScript objects — not a pure declarative grammar.

**Vega-Lite** is a purely declarative JSON grammar. You describe what you want (`{"mark": "bar", "encoding": {"x": ..., "y": ...}}`), and the compiler resolves it to a full Vega specification, which renders via canvas or SVG. Inspired by the Grammar of Graphics (like ggplot2).

Key architectural difference: Observable Plot specs are JavaScript objects with function references (transforms like `Plot.groupX()` return functions). Vega-Lite specs are pure JSON — no functions, fully serializable.

In Chartroom, `spec-to-plot.ts` bridges this gap: the AI emits pure JSON, and the translation layer converts it to Plot function calls. This means Chartroom has essentially built a mini Vega-Lite on top of Observable Plot — a declarative JSON grammar that compiles to imperative Plot calls.

## AI-Friendliness

### Vega-Lite Advantages

- **Pure JSON** — the AI output IS the rendering input. No translation layer needed.
- **Massive training data** — in thousands of academic papers, tutorials, and notebooks since 2016. LLMs generate valid Vega-Lite with higher first-try success rates.
- **Built-in validation** — the compiler catches schema violations, type mismatches, and invalid encodings before rendering.
- **More native chart types** — pie, boxplot, error bars, regression, density are all built-in.
- **Aggregation is explicit** — `{"y": {"field": "sales", "aggregate": "sum"}}` makes direction unambiguous. No "groupY on barY actually means groupX" footgun.
- **Grouped bars are trivial** — `{"column": {"field": "category"}}` vs. faceting workarounds.

### Observable Plot Advantages

- **Simpler spec format** — fewer nesting levels. A bar chart is ~5 fields vs ~12 in Vega-Lite.
- **Less verbose** — specs are ~40-60% smaller. Fewer tokens = faster generation, lower cost.
- **Multi-mark composition is simpler** — push to marks array vs. `layer` with encoding inheritance.
- **Chartroom's validation catches errors** — the 663-line `spec-to-plot.ts` with 4 validation checks prevents many mistakes.

### Error Surface Comparison

| Error type | Observable Plot (via Chartroom) | Vega-Lite |
|---|---|---|
| Wrong aggregation direction | Caught by auto-fix in spec-to-plot | Explicit in encoding (less error-prone) |
| Missing column | Caught by validation | Runtime error (no built-in check) |
| Implicit stacking | Documented in system prompt | Explicit `stack` property |
| Type mismatches | Caught by Zod schema | Caught by Vega-Lite compiler |
| Pie/donut charts | Custom arc-mark.ts | Native via `"mark": "arc"` |

## Chart Type Coverage

| Chart type | Observable Plot | Vega-Lite | Notes |
|---|---|---|---|
| Bar (vertical/horizontal) | Native | Native | Both excellent |
| Line / Area | Native | Native | Both excellent |
| Scatter / Dot | Native | Native | Both excellent |
| Stacked bar / area | Native (groupX + stackY) | Native (`stack: true`) | VL more explicit |
| Grouped bar | Requires faceting (fx) | Native (`column` encoding) | VL simpler |
| Histogram | Native (binX) | Native (`bin: true`) | Comparable |
| Heatmap / Cell | Native | Native | Comparable |
| Pie / Donut | Not native (custom D3) | Native (`mark: "arc"`) | VL wins |
| Box plot | Not native | Native (`mark: "boxplot"`) | VL wins |
| Treemap | Not native | Not native (need Vega) | Neither |
| Map / Geo | Native (geo mark) | Native (geoshape) | Both need GeoJSON |
| Small multiples | Native (fx/fy) | Native (row/column/facet) | VL more flexible |
| Error bars | rule + tick composition | Native (`mark: "errorbar"`) | VL simpler |
| Tooltips | Native (tip mark) | Native (tooltip encoding) | Plot tip more flexible |
| Regression / Trend lines | Not native | Native (regression transform) | VL wins |
| Density plots | Not native | Native (density transform) | VL wins |
| Interactive selection | Not supported | Native (params + selections) | VL wins big |

## Aesthetics

### Default Styling

**Observable Plot:** Clean, minimal style inspired by academic/NYT graphics. System font stack (system-ui), light gray grid lines, automatic axis labels. Color scheme: tableau10. Overall feel: understated, professional, publication-ready. Very similar to what you'd see in an Observable notebook or a D3 chart by Mike Bostock.

**Vega-Lite:** More "tool-like" appearance — reminiscent of Excel/Google Sheets. Default font is Arial/Helvetica. Heavier axis lines, more prominent tick marks. Same tableau10 colors. Overall feel: functional but generic, needs theming to look polished. The "Google Charts" aesthetic.

**Winner: Observable Plot.** Its defaults look like a well-designed chart from a data journalism piece. For an AI chart generator where most charts are shown with defaults, this matters significantly.

### Customization & Theming

**Observable Plot:** Direct SVG styling via `style` property. Mark-level control (fill, stroke, opacity, fonts). Scale customization. No built-in theme system. No animation. No gradient fills without SVG hacks. Typography is basic.

**Vega-Lite:** Powerful `"config"` object with hundreds of properties. Predefined themes via `vega-themes` package (fivethirtyeight, latimes, urbaninstitute, powerbi). Conditional formatting native. Text wrapping and multi-line titles. Gradient and pattern fills via Vega signals. But: customization is through the config schema, not arbitrary CSS.

**Winner: Vega-Lite.** The config/theme system is vastly more powerful. "Make it look like FiveThirtyEight" with a single config object is a real product feature.

### Aesthetic Summary

| Dimension | Observable Plot | Vega-Lite |
|---|---|---|
| Default beauty | Better — publication-quality | Generic — needs theming |
| Theming system | None (manual CSS) | Excellent (config + themes) |
| Typography control | Basic | Good (wrapping, multi-line) |
| Conditional styling | Manual | Native (condition property) |
| SVG control | Direct | Indirect (through config) |

For AI chart generators: default quality matters more than theming ceiling for most interactions, since users rarely request specific themes. Plot wins on the dimension that matters most.

## Developer Experience

### Bundle Size
| Library | Gzipped | Notes |
|---|---|---|
| Observable Plot | ~80 KB | Includes D3 subset |
| Vega-Lite + Vega + Vega-Embed | ~200 KB | 3x heavier — full compiler + runtime |

### Rendering
- **Plot**: Always SVG. Works with `html-to-image` out of the box for screenshot capture.
- **Vega-Lite**: Defaults to Canvas. SVG mode available but not default. Canvas is harder to capture screenshots.

### Documentation
- **Plot**: Excellent docs at observablehq.com. Interactive Observable notebooks. Smaller but active community.
- **Vega-Lite**: Academic-quality docs + interactive editor. Larger community, more Stack Overflow answers, more LLM training data.

### React Integration
- **Plot**: No official React wrapper. Manual DOM mounting.
- **Vega-Lite**: `react-vega` package exists. Vega-Embed handles mounting.

## Greenfield Assessment (No Sunk Cost)

The recommendation depends on your priority:

### If you prioritize engineering simplicity: Vega-Lite

- Zero translation layer (pure JSON in, chart out)
- Higher LLM first-try accuracy due to training data prevalence
- Built-in compiler validation replaces ~2000 lines of custom code
- More native chart types (pie, boxplot, regression, density)
- Powerful theming system for style customization

### If you prioritize visual quality of output: Observable Plot

- Better-looking defaults (publication-quality without theming)
- Simpler, more concise specs (40-60% fewer tokens)
- SVG-first rendering (ideal for screenshot capture)
- Lighter bundle (80 KB vs 200 KB)
- Simpler multi-mark composition

### For an AI chart generator specifically

The main value proposition is "upload CSV, get a beautiful chart." Users see the default output — they iterate on data and marks, rarely on styling. This means **default visual quality matters more than theming ceiling or engineering convenience**.

Observable Plot is the better fit when your product IS the chart output. You build the translation layer once; every chart the user sees needs to look good immediately.

This is a close call. Both are defensible choices. The libraries converge on capability — the difference is in philosophy (imperative simplicity vs. declarative completeness) and aesthetics (beautiful defaults vs. powerful theming).

## Chartroom-Specific Context

Chartroom currently uses Observable Plot with a well-tested translation layer (`spec-to-plot.ts`, 663 lines) and extensive AI documentation (`plot-docs.ts`, 1000+ lines). The integration is moderately tight but well-isolated — Plot is imported in exactly one file.

Migration to Vega-Lite is not justified given: the existing system works well, produces good charts, and the translation layer + validation effectively provide most of Vega-Lite's declarative benefits. The sunk cost is real — not just code, but tuned validation rules, AI documentation, and battle-tested edge case handling.
