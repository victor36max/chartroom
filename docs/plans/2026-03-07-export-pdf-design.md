# Export: Add PDF Export Support

## Context

Chartroom currently supports PNG and SVG export via Vega Embed's native `Result.view` API. Users need PDF export for print-ready, vector-quality chart output. The export UI is a simple popover dropdown in the chart panel toolbar.

## Design

### Approach: jsPDF + svg2pdf.js (client-side, vector PDF)

Add `exportChartAsPdf()` to `src/lib/chart/export-chart.ts` using:
- **jsPDF** — PDF document creation
- **svg2pdf.js** — converts SVG elements to vector PDF content (text stays selectable, lines stay crisp)

### Flow

```
User clicks "Export PDF"
  -> currentResult.view.toSVG()         # get SVG string from Vega
  -> parse SVG string into DOM element   # DOMParser
  -> extract width/height from SVG       # for page sizing
  -> new jsPDF({ orientation, format })  # create PDF sized to chart
  -> svg2pdf(svgElement, doc, options)   # render SVG into PDF
  -> doc.save("chart.pdf")              # trigger download
```

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/chart/export-chart.ts` | Add `exportChartAsPdf()` function |
| `src/components/chart/chart-panel.tsx` | Add "Export PDF" button to export popover (lines 206-223) |
| `package.json` | Add `jspdf` and `svg2pdf.js` dependencies |

### UI Change

Add a third button "Export PDF" in the export popover, styled like the existing "Export SVG" button (secondary/muted style). Order: PNG (primary) > SVG > PDF.

### PDF Page Sizing

Size the PDF page to match the chart dimensions (no fixed A4/Letter). This gives a tight, chart-only output that can be embedded in other documents.

### Dependencies

- `jspdf` — ~150KB, well-maintained, MIT license
- `svg2pdf.js` — ~30KB, companion to jsPDF for SVG rendering, MIT license

### What's NOT in scope

- No title/metadata in PDF
- No server-side generation
- No "save/embed" feature
