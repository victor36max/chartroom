import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, getThemeConfig } from "../themes";

describe("getThemeConfig", () => {
  it("returns DEFAULT_CONFIG for 'default' theme", () => {
    expect(getThemeConfig("default")).toBe(DEFAULT_CONFIG);
  });

  it("returns config with tableau10 range by default", () => {
    const config = getThemeConfig("default");
    expect(config.range).toEqual({ category: { scheme: "tableau10" } });
  });

  it("returns a config for 'dark' theme", () => {
    const config = getThemeConfig("dark");
    expect(config).toBeDefined();
    expect(config.font).toBe("system-ui, -apple-system, sans-serif");
  });

  it("returns DEFAULT_CONFIG for unknown theme", () => {
    const config = getThemeConfig("nonexistent" as never);
    expect(config).toBe(DEFAULT_CONFIG);
  });

  it("preserves default font for all themes", () => {
    const config = getThemeConfig("fivethirtyeight");
    expect(config.font).toBe("system-ui, -apple-system, sans-serif");
  });
});
