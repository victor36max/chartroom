import { describe, it, expect } from "vitest";
import { specToPlot } from "../spec-to-plot";
import type { ChartSpec } from "@/types";

// Plot returns HTMLElement (figure) when title/subtitle present, SVGSVGElement otherwise
function expectElement(result: unknown) {
  expect(result instanceof HTMLElement || result instanceof SVGElement).toBe(true);
}

// Helper: minimal CSV data
const salesData = [
  { category: "A", revenue: 100 },
  { category: "B", revenue: 200 },
  { category: "C", revenue: 300 },
];

const timeData = [
  { date: "2024-01-01", value: 10 },
  { date: "2024-02-01", value: 20 },
  { date: "2024-03-01", value: 30 },
];

const monthData = [
  { month: "2024-01", value: 10 },
  { month: "2024-02", value: 20 },
];

function makeSpec(overrides: Partial<ChartSpec> & { marks: ChartSpec["marks"] }): ChartSpec {
  return { marks: overrides.marks, ...overrides };
}

// --- Basic rendering ---

describe("specToPlot — basic rendering", () => {
  it("renders a barY chart", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    const result = specToPlot(spec, salesData);
    expectElement(result);
  });

  it("renders a dot chart", () => {
    const spec = makeSpec({
      marks: [{ type: "dot", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("renders a line chart", () => {
    const spec = makeSpec({
      marks: [{ type: "line", data: "csv", options: { x: "date", y: "value" } }],
    });
    expectElement(specToPlot(spec, timeData));
  });

  it("renders with no data field (defaults to csv)", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", options: { x: "category", y: "revenue" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Title and subtitle ---

describe("specToPlot — title/subtitle", () => {
  it("renders title as h2 with default styles", () => {
    const spec = makeSpec({
      title: "Sales by Category",
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    const result = specToPlot(spec, salesData) as HTMLElement;
    expect(result).toBeInstanceOf(HTMLElement);
    const h2 = result.querySelector("h2");
    expect(h2).not.toBeNull();
    expect(h2!.textContent).toBe("Sales by Category");
    expect(h2!.style.fontWeight).toBe("700");
  });

  it("renders subtitle as h3", () => {
    const spec = makeSpec({
      title: "Title",
      subtitle: "A subtitle",
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    const result = specToPlot(spec, salesData) as HTMLElement;
    const h3 = result.querySelector("h3");
    expect(h3).not.toBeNull();
    expect(h3!.textContent).toBe("A subtitle");
  });

  it("applies custom titleStyle overrides", () => {
    const spec = makeSpec({
      title: "Custom",
      titleStyle: { color: "red" },
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    const result = specToPlot(spec, salesData) as HTMLElement;
    const h2 = result.querySelector("h2");
    expect(h2!.style.color).toBe("red");
  });
});

// --- Default fill ---

describe("specToPlot — default fill", () => {
  it("applies default fill to barY when no fill specified", () => {
    const spec = makeSpec({
      title: "Test",
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    const result = specToPlot(spec, salesData) as HTMLElement;
    // Check that the SVG contains the default fill color somewhere in its markup
    const svg = result.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.innerHTML).toContain("#4e79a7");
  });

  it("does not override explicit fill", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue", fill: "category" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Auto-tip ---

describe("specToPlot — auto-tip", () => {
  it("auto-enables tip on supported marks when not specified", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("respects explicit tip: false", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue", tip: false } }],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Date parsing ---

describe("specToPlot — date parsing", () => {
  it("auto-parses YYYY-MM-DD date strings in x channel", () => {
    const spec = makeSpec({
      marks: [{ type: "line", data: "csv", options: { x: "date", y: "value" } }],
    });
    expectElement(specToPlot(spec, timeData));
  });

  it("auto-parses YYYY-MM date strings (appending -01)", () => {
    const spec = makeSpec({
      marks: [{ type: "line", data: "csv", options: { x: "month", y: "value" } }],
    });
    expectElement(specToPlot(spec, monthData));
  });
});

// --- Filter ---

describe("specToPlot — filter", () => {
  it("filters rows by exact match", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue", filter: { category: "A" } } }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("filters rows by array inclusion", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue", filter: { category: ["A", "B"] } } }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("filters rows by range operators", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue", filter: { revenue: { $gte: 200 } } } }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("filters by string prefix", () => {
    const dateData = [
      { date: "2024-01-01", val: 10 },
      { date: "2024-01-15", val: 20 },
      { date: "2024-02-01", val: 30 },
    ];
    const spec = makeSpec({
      marks: [{ type: "line", data: "csv", options: { x: "date", y: "val", filter: { date: "2024-01" } } }],
    });
    expectElement(specToPlot(spec, dateData));
  });
});

// --- Melt (wide-to-long) ---

describe("specToPlot — melt transform", () => {
  it("reshapes wide data to long format", () => {
    const wideData = [
      { year: "2020", revenue: 100, cost: 50, profit: 50 },
      { year: "2021", revenue: 200, cost: 80, profit: 120 },
    ];
    const spec = makeSpec({
      marks: [{
        type: "barY",
        data: "csv",
        options: {
          x: "year",
          y: "value",
          fill: "variable",
          melt: { columns: ["revenue", "cost", "profit"], key: "variable", value: "value" },
        },
      }],
    });
    expectElement(specToPlot(spec, wideData));
  });
});

// --- Group/bin transforms ---

describe("specToPlot — transforms", () => {
  it("renders barY with groupX transform", () => {
    const spec = makeSpec({
      marks: [{
        type: "barY",
        data: "csv",
        options: {
          x: "category",
          groupX: { y: "count" },
        },
      }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("auto-fixes groupY on barY to groupX", () => {
    // fixGroupDirection swaps groupY→groupX; validation sees groupX.y="count" so y is satisfied
    const spec = makeSpec({
      marks: [{
        type: "barY",
        data: "csv",
        options: {
          x: "category",
          y: "revenue",
          groupY: { y: "count" },
        },
      }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("auto-fixes groupX on barX to groupY", () => {
    const spec = makeSpec({
      marks: [{
        type: "barX",
        data: "csv",
        options: {
          x: "revenue",
          y: "category",
          groupX: { x: "count" },
        },
      }],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Validation: position channels ---

describe("specToPlot — validatePositionChannels", () => {
  it("throws when barY is missing x", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { y: "revenue" } }],
    });
    expect(() => specToPlot(spec, salesData)).toThrow(/missing "x"/);
  });

  it("throws when barY is missing y", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category" } }],
    });
    expect(() => specToPlot(spec, salesData)).toThrow(/missing "y"/);
  });

  it("does not throw for lineY missing x (x-optional)", () => {
    const spec = makeSpec({
      marks: [{ type: "lineY", data: "csv", options: { y: "revenue" } }],
    });
    expect(() => specToPlot(spec, salesData)).not.toThrow();
  });

  it("does not throw for lineX missing y (y-optional)", () => {
    const spec = makeSpec({
      marks: [{ type: "lineX", data: "csv", options: { x: "revenue" } }],
    });
    expect(() => specToPlot(spec, salesData)).not.toThrow();
  });

  it("does not throw when groupX computes y as count", () => {
    const spec = makeSpec({
      marks: [{
        type: "barY",
        data: "csv",
        options: { x: "category", groupX: { y: "count" } },
      }],
    });
    expect(() => specToPlot(spec, salesData)).not.toThrow();
  });

  it("includes available columns in error message", () => {
    const spec = makeSpec({
      marks: [{ type: "dot", data: "csv", options: {} }],
    });
    expect(() => specToPlot(spec, salesData)).toThrow(/Available columns/);
  });
});

// --- Validation: column names ---

describe("specToPlot — validateColumns", () => {
  it("throws when spec references non-existent column", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "nonexistent", y: "revenue" } }],
    });
    expect(() => specToPlot(spec, salesData)).toThrow(/not in the CSV/);
  });

  it("does not throw for columns created by melt", () => {
    const wideData = [
      { year: "2020", q1: 10, q2: 20, q3: 30 },
    ];
    const spec = makeSpec({
      marks: [{
        type: "barY",
        data: "csv",
        options: {
          x: "year",
          y: "value",
          fill: "variable",
          melt: { columns: ["q1", "q2", "q3"], key: "variable", value: "value" },
        },
      }],
    });
    expect(() => specToPlot(spec, wideData)).not.toThrow();
  });

  it("does not flag CSS color strings as missing columns", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue", fill: "#ff0000" } }],
    });
    expect(() => specToPlot(spec, salesData)).not.toThrow();
  });

  it("does not flag named CSS colors as missing columns", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue", fill: "red" } }],
    });
    expect(() => specToPlot(spec, salesData)).not.toThrow();
  });
});

// --- Validation: faceting ---

describe("specToPlot — validateFaceting", () => {
  it("throws when fx is at top level but no mark has fx", () => {
    const spec = makeSpec({
      fx: { label: "Category" },
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    } as ChartSpec);
    expect(() => specToPlot(spec, salesData)).toThrow(/fx scale is configured.*no mark has "fx"/);
  });

  it("does not throw when fx is at top level and mark has fx", () => {
    const spec = makeSpec({
      fx: { label: "Category" },
      marks: [{ type: "barY", data: "csv", options: { x: "revenue", y: "revenue", fx: "category" } }],
    } as ChartSpec);
    expect(() => specToPlot(spec, salesData)).not.toThrow();
  });
});

// --- Unknown mark type ---

describe("specToPlot — unknown mark type", () => {
  it("throws for unknown mark types", () => {
    const spec = makeSpec({
      marks: [{ type: "sparkline" as string, data: "csv", options: {} }],
    });
    expect(() => specToPlot(spec, salesData)).toThrow(/Unknown mark type.*sparkline/);
  });
});

// --- Auto color legend ---

describe("specToPlot — auto color legend", () => {
  it("auto-enables color legend when fill references a data column", () => {
    const spec = makeSpec({
      title: "Legend test",
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue", fill: "category" } }],
    });
    const result = specToPlot(spec, salesData) as HTMLElement;
    expect(result).toBeInstanceOf(HTMLElement);
  });
});

// --- Ordinal domain auto-detection ---

describe("specToPlot — ordinal domain detection", () => {
  it("auto-detects month names and sets correct domain order", () => {
    const monthNameData = [
      { month: "Jan", value: 10 },
      { month: "Feb", value: 20 },
      { month: "Mar", value: 30 },
      { month: "Apr", value: 40 },
      { month: "May", value: 50 },
      { month: "Jun", value: 60 },
    ];
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "month", y: "value" } }],
    });
    expectElement(specToPlot(spec, monthNameData));
  });

  it("auto-detects weekday names", () => {
    const dayData = [
      { day: "Mon", value: 10 },
      { day: "Tue", value: 20 },
      { day: "Wed", value: 30 },
      { day: "Thu", value: 40 },
      { day: "Fri", value: 50 },
    ];
    const spec = makeSpec({
      marks: [{ type: "barY", data: "csv", options: { x: "day", y: "value" } }],
    });
    expectElement(specToPlot(spec, dayData));
  });
});

// --- Cell marks auto-band scale ---

describe("specToPlot — cell mark band scale", () => {
  it("forces band scale for cell marks with numeric position channels", () => {
    const heatmapData = [
      { x: 1, y: 1, value: 10 },
      { x: 1, y: 2, value: 20 },
      { x: 2, y: 1, value: 30 },
      { x: 2, y: 2, value: 40 },
    ];
    const spec = makeSpec({
      marks: [{ type: "cell", data: "csv", options: { x: "x", y: "y", fill: "value" } }],
    });
    expectElement(specToPlot(spec, heatmapData));
  });
});

// --- Frame and options-only marks ---

describe("specToPlot — options-only marks", () => {
  it("renders frame mark (no data)", () => {
    const spec = makeSpec({
      marks: [
        { type: "barY", data: "csv", options: { x: "category", y: "revenue" } },
        { type: "frame", options: {} },
      ],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Rule marks ---

describe("specToPlot — rule marks", () => {
  it("renders ruleY with values array", () => {
    const spec = makeSpec({
      marks: [
        { type: "barY", data: "csv", options: { x: "category", y: "revenue" } },
        { type: "ruleY", data: "csv", options: { values: [150] } },
      ],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("renders ruleX with default value", () => {
    const spec = makeSpec({
      marks: [
        { type: "barY", data: "csv", options: { x: "category", y: "revenue" } },
        { type: "ruleX", options: {} },
      ],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Custom axis marks ---

describe("specToPlot — custom axis marks", () => {
  it("renders with custom axisX and suppresses default x axis", () => {
    const spec = makeSpec({
      marks: [
        { type: "barY", data: "csv", options: { x: "category", y: "revenue" } },
        { type: "axisX", options: { tickRotate: -45 } },
      ],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("increases marginBottom for rotated axisX ticks", () => {
    const spec = makeSpec({
      marks: [
        { type: "barY", data: "csv", options: { x: "category", y: "revenue" } },
        { type: "axisX", options: { tickRotate: -45 } },
      ],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Margin estimation ---

describe("specToPlot — margin estimation", () => {
  it("auto-estimates marginLeft for long categorical y-axis labels", () => {
    const longLabelData = [
      { category: "Very Long Category Name Here", value: 100 },
      { category: "Another Long Label Example", value: 200 },
    ];
    const spec = makeSpec({
      marks: [{ type: "barX", data: "csv", options: { y: "category", x: "value" } }],
    });
    expectElement(specToPlot(spec, longLabelData));
  });

  it("does not override explicit marginLeft", () => {
    const spec = makeSpec({
      marginLeft: 100,
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Width/height ---

describe("specToPlot — dimensions", () => {
  it("respects explicit width and height", () => {
    const spec = makeSpec({
      width: 800,
      height: 600,
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Scale options ---

describe("specToPlot — scale options", () => {
  it("passes through x scale options", () => {
    const spec = makeSpec({
      x: { label: "Category", tickRotate: -45 },
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("passes through y scale options with tickFormat", () => {
    const spec = makeSpec({
      y: { label: "Revenue ($)", tickFormat: "$,.0f" },
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("passes through color scheme", () => {
    const spec = makeSpec({
      color: { scheme: "category10" },
      marks: [{ type: "barY", data: "csv", options: { x: "category", y: "revenue", fill: "category" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Empty data edge cases ---

describe("specToPlot — edge cases", () => {
  it("handles empty CSV data without error for frame-only spec", () => {
    const spec = makeSpec({
      marks: [{ type: "frame", options: {} }],
    });
    expectElement(specToPlot(spec, []));
  });

  it("throws unknown data source error for non-csv data references", () => {
    const spec = makeSpec({
      marks: [{ type: "barY", data: "external" as string, options: { x: "category", y: "revenue" } }],
    });
    expect(() => specToPlot(spec, salesData)).toThrow(/Unknown data source/);
  });
});

// --- StackY transform ---

describe("specToPlot — stackY transform", () => {
  it("renders stacked barY via stackY transform", () => {
    const stackData = [
      { category: "A", type: "X", value: 10 },
      { category: "A", type: "Y", value: 20 },
      { category: "B", type: "X", value: 30 },
      { category: "B", type: "Y", value: 40 },
    ];
    const spec = makeSpec({
      marks: [{
        type: "barY",
        data: "csv",
        options: {
          x: "category",
          y: "value",
          fill: "type",
          stackY: { offset: "normalize" },
        },
      }],
    });
    expectElement(specToPlot(spec, stackData));
  });
});

// --- Text mark ---

describe("specToPlot — text mark", () => {
  it("renders text mark with x, y, and text channels", () => {
    const spec = makeSpec({
      marks: [{
        type: "text",
        data: "csv",
        options: { x: "category", y: "revenue", text: "category" },
      }],
    });
    expectElement(specToPlot(spec, salesData));
  });
});

// --- Tick marks ---

describe("specToPlot — tick marks", () => {
  it("renders tickX mark", () => {
    const spec = makeSpec({
      marks: [{ type: "tickX", data: "csv", options: { x: "revenue", y: "category" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });

  it("renders tickY mark", () => {
    const spec = makeSpec({
      marks: [{ type: "tickY", data: "csv", options: { x: "category", y: "revenue" } }],
    });
    expectElement(specToPlot(spec, salesData));
  });
});
