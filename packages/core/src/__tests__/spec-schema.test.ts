import { describe, it, expect } from "vitest";
import { vlSpecSchema, createVlSpecSchema, vlUnitSchema } from "../spec-schema";

describe("vlSpecSchema", () => {
  it("accepts a basic bar chart spec", () => {
    const spec = {
      mark: "bar",
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    expect(vlSpecSchema.parse(spec)).toBeDefined();
  });

  it("accepts a layered spec", () => {
    const spec = {
      layer: [
        { mark: "bar", encoding: { x: { field: "a" } } },
        { mark: "rule", encoding: { y: { datum: 10 } } },
      ],
    };
    expect(vlSpecSchema.parse(spec)).toBeDefined();
  });

  it("accepts spec with data url", () => {
    const spec = {
      data: { url: "sales.csv" },
      mark: "line",
    };
    expect(vlSpecSchema.parse(spec)).toBeDefined();
  });

  it("accepts spec with transforms", () => {
    const spec = {
      mark: "bar",
      transform: [{ filter: "datum.value > 10" }],
    };
    expect(vlSpecSchema.parse(spec)).toBeDefined();
  });
});

describe("createVlSpecSchema", () => {
  it("creates schema with dataset names in description", () => {
    const schema = createVlSpecSchema(["sales.csv", "products.csv"]);
    expect(schema).toBeDefined();
    const spec = { data: { url: "sales.csv" }, mark: "bar" };
    expect(schema.parse(spec)).toBeDefined();
  });
});

describe("vlUnitSchema", () => {
  it("accepts a unit spec", () => {
    const spec = { mark: "point", encoding: { x: { field: "a" } } };
    expect(vlUnitSchema.parse(spec)).toBeDefined();
  });
});
