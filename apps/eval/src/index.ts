import { initRenderer, buildBundle, closeRenderer } from "@firechart/renderer";
import { resolveModelId, type ModelTier } from "@firechart/core";
import { runCase } from "./run-case";
import { judgeChart } from "./judge";
import { writeReport } from "./report";
import type { EvalCase } from "./types";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  };
  const getAll = (flag: string) => {
    const values: string[] = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === flag && i + 1 < args.length) values.push(args[++i]);
    }
    return values;
  };
  const tier = (get("--tier") ?? "mid") as ModelTier;
  return {
    tags: getAll("--tag"),
    caseNames: getAll("--case"),
    skipJudge: args.includes("--no-judge"),
    rebuildBundle: args.includes("--rebuild-bundle"),
    modelId: get("--model") ?? resolveModelId(tier),
    judgeModelId: resolveModelId("power"),
    concurrency: Number(get("--concurrency") ?? 5),
  };
}

async function pMap<T, R>(items: T[], fn: (item: T, workerIndex: number) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker(workerIndex: number) {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], workerIndex);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, (_, wi) => worker(wi)));
  return results;
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  const opts = parseArgs();

  // Load test cases
  const casesDir = path.resolve(__dirname, "../cases");
  if (!fs.existsSync(casesDir)) {
    console.error(`No cases directory found at ${casesDir}`);
    process.exit(1);
  }

  const caseFiles = fs.readdirSync(casesDir).filter((f) => f.endsWith(".json"));
  let cases: EvalCase[] = caseFiles.map((f) =>
    JSON.parse(fs.readFileSync(path.join(casesDir, f), "utf8"))
  );

  if (opts.tags.length > 0) cases = cases.filter((c) => opts.tags.some((t) => c.tags?.includes(t)));
  if (opts.caseNames.length > 0) cases = cases.filter((c) => opts.caseNames.includes(c.name));

  if (cases.length === 0) {
    console.error("No cases found matching filters");
    process.exit(1);
  }

  const concurrency = Math.max(1, opts.concurrency);
  console.log(`Running ${cases.length} eval case(s) with model: ${opts.modelId} (concurrency: ${concurrency})\n`);

  // Build bundle if needed
  if (opts.rebuildBundle) await buildBundle();

  // Output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputDir = path.resolve(__dirname, "../results", timestamp);
  fs.mkdirSync(outputDir, { recursive: true });

  // Init Playwright with page pool
  const { browser, pages } = await initRenderer(concurrency);

  // Run cases in parallel
  const results = await pMap(cases, async (evalCase, workerIndex) => {
    const page = pages[workerIndex];
    const result = await runCase(evalCase, page, outputDir, opts.modelId);

    if (!opts.skipJudge && result.screenshotBase64) {
      result.judgeScores = await judgeChart(
        result.screenshotBase64,
        evalCase.messages,
        evalCase.rubric,
        opts.judgeModelId
      );
    }

    const score = result.judgeScores ? ` [${result.judgeScores.total}/25]` : "";
    const status = result.success ? "PASS" : "FAIL";
    console.log(`  ${evalCase.name}... ${status}${score} (${(result.durationMs / 1000).toFixed(1)}s)`);
    return result;
  }, concurrency);

  await closeRenderer(browser);
  writeReport(results, outputDir, opts.modelId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
