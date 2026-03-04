import { initRenderer, buildBundle, closeRenderer } from "./render";
import { runCase } from "./run-case";
import { judgeChart } from "./judge";
import { writeReport } from "./report";
import type { EvalCase, CaseResult } from "./types";
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
  return {
    tag: get("--tag"),
    caseName: get("--case"),
    skipJudge: args.includes("--no-judge"),
    rebuildBundle: args.includes("--rebuild-bundle"),
    modelId: get("--model") ?? process.env.MODEL_ID ?? "anthropic/claude-sonnet-4",
  };
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

  if (opts.tag) cases = cases.filter((c) => c.tags?.includes(opts.tag!));
  if (opts.caseName) cases = cases.filter((c) => c.name === opts.caseName);

  if (cases.length === 0) {
    console.error("No cases found matching filters");
    process.exit(1);
  }

  console.log(`Running ${cases.length} eval case(s) with model: ${opts.modelId}\n`);

  // Build bundle if needed
  if (opts.rebuildBundle) await buildBundle();

  // Output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputDir = path.resolve(__dirname, "../results", timestamp);
  fs.mkdirSync(outputDir, { recursive: true });

  // Init Playwright
  const { browser, page } = await initRenderer();

  const results: CaseResult[] = [];
  for (const evalCase of cases) {
    process.stdout.write(`  ${evalCase.name}...`);
    const result = await runCase(evalCase, page, outputDir, opts.modelId);

    if (!opts.skipJudge && result.screenshotBase64) {
      result.judgeScores = await judgeChart(
        result.screenshotBase64,
        evalCase.messages,
        evalCase.rubric
      );
    }

    results.push(result);
    const score = result.judgeScores ? ` [${result.judgeScores.total}/25]` : "";
    const status = result.success ? "PASS" : "FAIL";
    console.log(` ${status}${score} (${(result.durationMs / 1000).toFixed(1)}s)`);
  }

  await closeRenderer(browser);
  writeReport(results, outputDir, opts.modelId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
