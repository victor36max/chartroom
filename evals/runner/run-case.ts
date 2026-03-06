import { generateText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { buildSystemPrompt } from "../../src/lib/agent/system-prompt";
import { createTools } from "../../src/lib/agent/tools";
import { extractMetadata, metadataToContext } from "../../src/lib/csv/parser";
import { renderChart } from "./render";
import type { EvalCase, CaseResult } from "./types";
import type { ChartSpec } from "../../src/types";
import type { Page } from "playwright";
import { validateSpec } from "../../src/lib/chart/validate-spec";
import Papa from "papaparse";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_STEPS = 5;
const TIMEOUT_MS = 120_000; // 2 minutes per case

function loadCSV(csvFilename: string): Record<string, unknown>[] {
  const csvPath = path.resolve(__dirname, "../data", csvFilename);
  const csvText = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  return parsed.data as Record<string, unknown>[];
}

export async function runCase(
  evalCase: EvalCase,
  page: Page,
  outputDir: string,
  modelId: string
): Promise<CaseResult> {
  const start = Date.now();

  // Load and parse CSV
  let csvData: Record<string, unknown>[];
  try {
    csvData = loadCSV(evalCase.csv);
  } catch {
    return {
      name: evalCase.name,
      success: false,
      error: `CSV not found: ${evalCase.csv}`,
      steps: 0,
      toolCalls: [],
      durationMs: Date.now() - start,
    };
  }

  const metadata = extractMetadata(csvData);
  const dataContext = metadataToContext(metadata);
  const system = buildSystemPrompt(dataContext);

  // Build eval tools — add execute + toModelOutput to render_chart
  const baseTools = createTools(csvData);
  let capturedSpec: ChartSpec | undefined;
  let screenshotBuffer: Buffer | undefined;

  const evalTools = {
    ...baseTools,
    render_chart: {
      ...baseTools.render_chart,
      execute: async (input: { spec: ChartSpec; title?: string; description?: string }) => {
        const chartSpec: ChartSpec = input.title
          ? { ...input.spec, title: input.title } as ChartSpec
          : input.spec;
        capturedSpec = chartSpec;

        // Validate spec before rendering (matches production behavior)
        const validation = validateSpec(chartSpec as unknown as Record<string, unknown>, csvData);
        if (!validation.valid) {
          return { success: false as const, error: `Vega-Lite compile error: ${validation.error}. Fix the spec and try again.` };
        }

        const result = await renderChart(page, chartSpec, csvData);
        if (!result.png) {
          return { success: false as const, error: result.error ?? "Render returned no image" };
        }

        screenshotBuffer = result.png;
        return { success: true as const, image: result.png.toString("base64") };
      },
      // Convert tool result to multimodal content so the model sees the screenshot
      toModelOutput: ({
        output,
      }: {
        toolCallId: string;
        input: unknown;
        output: { success: boolean; image?: string; error?: string };
      }) => {
        if (output.success && output.image) {
          return {
            type: "content" as const,
            value: [
              {
                type: "text" as const,
                text: "Chart rendered successfully. Here is a screenshot for evaluation:",
              },
              {
                type: "file-data" as const,
                data: output.image,
                mediaType: "image/png",
              },
            ],
          };
        }
        return {
          type: "text" as const,
          value: `Chart rendering failed: ${output.error}\nPlease fix the chart spec and try again.`,
        };
      },
    },
  };

  // Run the agentic loop
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const model = openrouter(modelId);
  const allToolCallNames: string[] = [];
  let totalSteps = 0;
  let lastError: string | undefined;

  const conversationMessages: ModelMessage[] = [];

  for (const userContent of evalCase.messages) {
    conversationMessages.push({ role: "user", content: [{ type: "text", text: userContent }] });

    let succeeded = false;
    for (let attempt = 0; attempt < 3 && !succeeded; attempt++) {
      try {
        const result = await Promise.race([
          generateText({
            model,
            system,
            messages: conversationMessages,
            tools: evalTools as ToolSet,
            stopWhen: stepCountIs(MAX_STEPS),
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout after 2 minutes")), TIMEOUT_MS)
          ),
        ]);

        totalSteps += result.steps.length;
        for (const step of result.steps) {
          for (const tc of step.toolCalls) {
            allToolCallNames.push(tc.toolName);
          }
        }

        // Append assistant messages to conversation for multi-turn
        conversationMessages.push(...result.response.messages);
        succeeded = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = /timeout|5\d\d|ECONNRESET|fetch failed|Internal Server Error/i.test(msg);
        if (!isTransient || attempt === 2) {
          lastError = msg;
          break;
        }
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
    if (lastError) break;
  }

  // Save screenshot
  let screenshotPath: string | undefined;
  let screenshotBase64: string | undefined;
  if (screenshotBuffer) {
    const screenshotsDir = path.join(outputDir, "screenshots");
    fs.mkdirSync(screenshotsDir, { recursive: true });
    screenshotPath = path.join(screenshotsDir, `${evalCase.name}.png`);
    fs.writeFileSync(screenshotPath, screenshotBuffer);
    screenshotBase64 = screenshotBuffer.toString("base64");
  }

  return {
    name: evalCase.name,
    success: evalCase.expectDecline
      ? !lastError && capturedSpec === undefined
      : !lastError && capturedSpec !== undefined,
    error: lastError,
    finalSpec: capturedSpec,
    screenshotPath,
    screenshotBase64,
    steps: totalSteps,
    toolCalls: allToolCallNames,
    durationMs: Date.now() - start,
  };
}
