import fs from "fs";
import path from "path";
import type { CaseResult, EvalSummary } from "./types";

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function writeReport(
  results: CaseResult[],
  outputDir: string,
  modelId: string
): void {
  const scored = results.filter((r) => r.judgeScores);
  const summary: EvalSummary = {
    runAt: new Date().toISOString(),
    model: modelId,
    totalCases: results.length,
    passed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    avgScore: avg(scored.map((r) => r.judgeScores!.total)),
    cases: results.map((r) => ({ ...r, screenshotBase64: undefined })), // strip large base64 from JSON
  };

  // Write JSON
  fs.writeFileSync(
    path.join(outputDir, "summary.json"),
    JSON.stringify(summary, null, 2)
  );

  // Write HTML report
  fs.writeFileSync(path.join(outputDir, "report.html"), buildHtml(results, summary));

  // Terminal summary
  console.log(
    `\nEval complete: ${summary.passed}/${summary.totalCases} passed | Avg score: ${summary.avgScore.toFixed(1)}/25 | Model: ${modelId}\n`
  );

  const nameWidth = Math.max(
    6,
    ...results.map((r) => r.name.length)
  );

  console.log(
    `  ${"Case".padEnd(nameWidth)}  Score  Steps  Time     Status`
  );
  console.log(`  ${"─".repeat(nameWidth)}  ─────  ─────  ───────  ──────`);

  for (const r of results) {
    const score = r.judgeScores ? `${r.judgeScores.total}/25` : "  -  ";
    const status = r.success ? "PASS" : "FAIL";
    const time = `${(r.durationMs / 1000).toFixed(1)}s`;
    console.log(
      `  ${r.name.padEnd(nameWidth)}  ${score.padStart(5)}  ${String(r.steps).padStart(5)}  ${time.padStart(7)}  ${status}`
    );
  }

  console.log(`\nReport: ${path.join(outputDir, "report.html")}`);
}

function buildHtml(results: CaseResult[], summary: EvalSummary): string {
  const cards = results
    .map((r) => {
      const scoreHtml = r.judgeScores
        ? `<div class="scores">
            <div class="score-row"><span>Correctness</span><span class="score">${r.judgeScores.scores.correctness}/5</span></div>
            <div class="score-row"><span>Chart Type</span><span class="score">${r.judgeScores.scores.chartType}/5</span></div>
            <div class="score-row"><span>Readability</span><span class="score">${r.judgeScores.scores.readability}/5</span></div>
            <div class="score-row"><span>Aesthetics</span><span class="score">${r.judgeScores.scores.aesthetics}/5</span></div>
            <div class="score-row"><span>Completeness</span><span class="score">${r.judgeScores.scores.completeness}/5</span></div>
            <div class="score-row total"><span>Total</span><span class="score">${r.judgeScores.total}/25</span></div>
            <p class="reasoning">${escapeHtml(r.judgeScores.reasoning)}</p>
          </div>`
        : `<div class="scores"><p class="reasoning">No judge scores</p></div>`;

      const screenshotHtml = r.screenshotBase64
        ? `<img src="data:image/png;base64,${r.screenshotBase64}" alt="${escapeHtml(r.name)}" />`
        : `<div class="no-screenshot">No screenshot</div>`;

      const badge = r.success
        ? `<span class="badge pass">PASS</span>`
        : `<span class="badge fail">FAIL</span>`;

      const errorHtml = r.error
        ? `<div class="error">${escapeHtml(r.error)}</div>`
        : "";

      return `
        <div class="card">
          <div class="card-header">
            <h3>${escapeHtml(r.name)} ${badge}</h3>
            <span class="meta">${r.steps} steps · ${(r.durationMs / 1000).toFixed(1)}s · tools: ${r.toolCalls.join(", ") || "none"}</span>
          </div>
          ${errorHtml}
          <div class="card-body">
            <div class="screenshot">${screenshotHtml}</div>
            ${scoreHtml}
          </div>
        </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Chartroom Eval Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; color: #333; padding: 24px; }
    .header { max-width: 1000px; margin: 0 auto 24px; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header .summary { display: flex; gap: 24px; font-size: 14px; color: #666; }
    .header .summary strong { color: #333; }
    .card { max-width: 1000px; margin: 0 auto 16px; background: white; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden; }
    .card-header { padding: 16px; border-bottom: 1px solid #eee; }
    .card-header h3 { font-size: 16px; display: flex; align-items: center; gap: 8px; }
    .card-header .meta { font-size: 12px; color: #999; }
    .card-body { display: flex; gap: 16px; padding: 16px; }
    .screenshot { flex: 1; min-width: 0; }
    .screenshot img { width: 100%; height: auto; border: 1px solid #eee; border-radius: 4px; }
    .no-screenshot { padding: 40px; text-align: center; color: #999; background: #fafafa; border-radius: 4px; }
    .scores { width: 240px; flex-shrink: 0; }
    .score-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
    .score-row.total { font-weight: 700; border-top: 2px solid #e0e0e0; margin-top: 4px; padding-top: 8px; }
    .score { font-weight: 600; }
    .reasoning { font-size: 13px; color: #666; margin-top: 12px; line-height: 1.5; }
    .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .badge.pass { background: #e6f4ea; color: #1e7e34; }
    .badge.fail { background: #fce8e6; color: #c5221f; }
    .error { padding: 12px 16px; background: #fce8e6; color: #c5221f; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Chartroom Eval Report</h1>
    <div class="summary">
      <span><strong>${summary.passed}/${summary.totalCases}</strong> passed</span>
      <span>Avg score: <strong>${summary.avgScore.toFixed(1)}/25</strong></span>
      <span>Model: <strong>${escapeHtml(summary.model)}</strong></span>
      <span>${new Date(summary.runAt).toLocaleString()}</span>
    </div>
  </div>
  ${cards}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
