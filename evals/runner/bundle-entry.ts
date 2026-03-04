import { specToPlot } from "../../src/lib/chart/spec-to-plot";

// Expose specToPlot to the Playwright page context
(window as unknown as Record<string, unknown>).specToPlot = specToPlot;
