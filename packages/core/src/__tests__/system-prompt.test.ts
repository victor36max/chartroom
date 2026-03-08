import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../system-prompt";

describe("buildSystemPrompt", () => {
  it("web context includes render_chart tool reference", () => {
    const prompt = buildSystemPrompt({ context: "web" });
    expect(prompt).toContain("render_chart");
  });

  it("plugin context includes render_chart tool reference", () => {
    const prompt = buildSystemPrompt({ context: "plugin" });
    expect(prompt).toContain("render_chart");
  });

  it("both contexts include decline list", () => {
    for (const context of ["web", "plugin"] as const) {
      const prompt = buildSystemPrompt({ context });
      expect(prompt).toContain("Funnel charts");
      expect(prompt).toContain("waterfall");
    }
  });

  it("both contexts include stacking rules", () => {
    for (const context of ["web", "plugin"] as const) {
      const prompt = buildSystemPrompt({ context });
      expect(prompt).toContain("NEVER stack");
    }
  });

  it("includes data context when provided", () => {
    const prompt = buildSystemPrompt({
      context: "web",
      dataContext: "Dataset: 100 rows, 3 columns",
    });
    expect(prompt).toContain("100 rows");
  });

  it("shows no-data message when no data context", () => {
    const prompt = buildSystemPrompt({ context: "web" });
    expect(prompt).toContain("No dataset loaded");
  });

  it("plugin context includes file-based instructions", () => {
    const prompt = buildSystemPrompt({ context: "plugin" });
    expect(prompt).toContain("load_csv");
  });
});
