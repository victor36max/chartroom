import { describe, it, expect } from "vitest";
import { stripStyling } from "../strip-config";

describe("stripStyling", () => {
  it("removes config from spec", () => {
    const spec = { mark: "bar", encoding: {}, config: { font: "Arial" } };
    expect(stripStyling(spec)).toEqual({ mark: "bar", encoding: {} });
  });

  it("removes $schema", () => {
    const spec = { $schema: "https://vega.github.io/schema/vega-lite/v6.json", mark: "bar", encoding: {} };
    expect(stripStyling(spec)).toEqual({ mark: "bar", encoding: {} });
  });

  it("removes background, padding, autosize", () => {
    const spec = { mark: "bar", encoding: {}, background: "white", padding: 10, autosize: "fit" };
    expect(stripStyling(spec)).toEqual({ mark: "bar", encoding: {} });
  });

  it("preserves data, mark, encoding, transform, layer, title", () => {
    const spec = {
      data: { name: "csv" },
      mark: "bar",
      encoding: { x: { field: "a" } },
      transform: [{ filter: "datum.a > 5" }],
      title: "My Chart",
      width: 400,
      height: 300,
    };
    expect(stripStyling(spec)).toEqual(spec);
  });

  it("does not mutate original spec", () => {
    const spec = { mark: "bar", encoding: {}, config: { font: "Arial" } };
    const original = JSON.parse(JSON.stringify(spec));
    stripStyling(spec);
    expect(spec).toEqual(original);
  });
});
