import * as vl from "vega-lite";
import * as vega from "vega";
import { Resvg } from "@resvg/resvg-js";
import { injectData } from "./inject-data";
import { getThemeConfig } from "./themes";
import type { LoggerInterface } from "vega";

function createWarningLogger(warnings: string[]): LoggerInterface {
  let _level = 0;
  const self: LoggerInterface = {
    level(v?: number) {
      if (v !== undefined) { _level = v; return self; }
      return _level;
    },
    warn(...args: readonly unknown[]) { warnings.push(args.map(String).join(" ")); return self; },
    info() { return self; },
    debug() { return self; },
    error() { return self; },
  } as LoggerInterface;
  return self;
}

export async function renderChart(
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>,
  themeId: string = "default"
): Promise<{ png: Buffer; warnings: string[]; error?: undefined } | { png?: undefined; warnings?: undefined; error: string }> {
  try {
    const warnings: string[] = [];
    const logger = createWarningLogger(warnings);

    // Inject data into spec
    const withData = injectData(spec, datasets);

    // Get theme config
    const config = getThemeConfig(themeId as Parameters<typeof getThemeConfig>[0]);

    // Compile Vega-Lite to Vega
    const compiled = vl.compile(withData as unknown as vl.TopLevelSpec, { config, logger });

    // Create a headless Vega view and render to SVG
    const view = new vega.View(vega.parse(compiled.spec), {
      renderer: "none",
      logger,
    });
    await view.runAsync();
    const svg = await view.toSVG();
    view.finalize();

    // Convert SVG to PNG with resvg
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width" as const, value: 900 },
    });
    const rendered = resvg.render();
    const png = Buffer.from(rendered.asPng());

    return { png, warnings };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
