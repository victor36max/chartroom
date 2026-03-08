import { generateText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  buildSystemPrompt,
  createTools,
  pruneOldToolResults,
  extractMetadata,
  datasetsToContext,
  validateSpec,
  type DatasetMap,
  type ChartSpec,
} from "@firechart/core";
import { renderChart } from "@firechart/renderer";
import type { EvalCase, CaseResult } from "./types";
import type { Page } from "playwright";
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

  // Load datasets
  const datasets: Record<string, Record<string, unknown>[]> = {};
  const datasetMap: DatasetMap = {};
  try {
    for (const [name, filename] of Object.entries(evalCase.csvs)) {
      const data = loadCSV(filename);
      datasets[name] = data;
      datasetMap[name] = { data, metadata: extractMetadata(data), errors: [] };
    }
  } catch (err) {
    return {
      name: evalCase.name,
      success: false,
      error: `CSV load error: ${err instanceof Error ? err.message : String(err)}`,
      steps: 0,
      toolCalls: [],
      durationMs: Date.now() - start,
    };
  }

  const dataContext = datasetsToContext(datasetMap);
  const system = buildSystemPrompt({ context: "web", dataContext });

  // Build eval tools — add execute + toModelOutput to render_chart
  const baseTools = createTools(datasets);
  let capturedSpec: ChartSpec | undefined;
  let screenshotBuffer: Buffer | undefined;

  const evalTools = {
    ...baseTools,
    render_chart: {
      ...baseTools.render_chart,
      execute: async (input: { spec: ChartSpec }) => {
        const chartSpec: ChartSpec = input.spec;
        capturedSpec = chartSpec;

        // Validate spec before rendering (matches production behavior)
        const validation = validateSpec(chartSpec as unknown as Record<string, unknown>, datasets);
        if (!validation.valid) {
          return { success: false as const, error: `Vega-Lite compile error: ${validation.error}. Fix the spec and try again.` };
        }

        const result = await renderChart(page, chartSpec as unknown as Record<string, unknown>, datasets);
        if ("error" in result && result.error) {
          return { success: false as const, error: result.error ?? "Render returned no image" };
        }

        const { png, warnings } = result as { png: Buffer; warnings: string[] };
        screenshotBuffer = png;
        const allWarnings = [...(validation.warnings || []), ...(warnings || [])];
        const warningsResult = allWarnings.length ? allWarnings : undefined;
        return { success: true as const, image: png.toString("base64"), warnings: warningsResult };
      },
      // Convert tool result to multimodal content so the model sees the screenshot
      toModelOutput: ({
        output,
      }: {
        toolCallId: string;
        input: unknown;
        output: { success: boolean; image?: string; error?: string; warnings?: string[] };
      }) => {
        if (output.success && output.image) {
          const warningText = output.warnings?.length
            ? `\n\nVega-Lite warnings:\n${output.warnings.map(w => `- ${w}`).join("\n")}\n\nPlease fix these warnings.`
            : "";
          return {
            type: "content" as const,
            value: [
              {
                type: "text" as const,
                text: `Chart rendered successfully.${warningText} Here is a screenshot for evaluation:`,
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
  const debugLog: string[] = [];

  const conversationMessages: ModelMessage[] = [];

  for (const userContent of evalCase.messages) {
    conversationMessages.push({ role: "user", content: [{ type: "text", text: userContent }] });

    let succeeded = false;
    for (let attempt = 0; attempt < 3 && !succeeded; attempt++) {
      try {
        const prunedMessages = pruneOldToolResults(conversationMessages);
        const result = await Promise.race([
          generateText({
            model,
            system,
            messages: prunedMessages,
            tools: evalTools as ToolSet,
            stopWhen: stepCountIs(MAX_STEPS),
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout after 2 minutes")), TIMEOUT_MS)
          ),
        ]);

        totalSteps += result.steps.length;

        // Debug logging: capture model text and tool calls per step
        debugLog.push(`--- Turn ${conversationMessages.length} (attempt ${attempt + 1}) ---`);
        debugLog.push(`Steps: ${result.steps.length}, finishReason: ${result.finishReason}`);
        if (result.text) {
          debugLog.push(`Model text: ${result.text}`);
        }
        for (let si = 0; si < result.steps.length; si++) {
          const step = result.steps[si];
          debugLog.push(`  Step ${si + 1}: finishReason=${step.finishReason}, toolCalls=${step.toolCalls.length}`);
          if (step.text) {
            debugLog.push(`  Text: ${step.text.slice(0, 500)}`);
          }
          for (const tc of step.toolCalls) {
            allToolCallNames.push(tc.toolName);
            debugLog.push(`  Tool: ${tc.toolName}(${JSON.stringify(tc.input).slice(0, 300)})`);
          }
          for (const tr of step.toolResults) {
            const val = typeof tr.output === "string" ? tr.output : JSON.stringify(tr.output);
            debugLog.push(`  Result[${tr.toolName}]: ${val.slice(0, 300)}`);
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

  // Save debug log
  const logsDir = path.join(outputDir, "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  fs.writeFileSync(path.join(logsDir, `${evalCase.name}.log`), debugLog.join("\n"), "utf8");

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
    success: !lastError && capturedSpec !== undefined,
    error: lastError,
    finalSpec: capturedSpec,
    screenshotPath,
    screenshotBase64,
    steps: totalSteps,
    toolCalls: allToolCallNames,
    durationMs: Date.now() - start,
  };
}
