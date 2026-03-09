import type { ChartSpec } from "@chartroom/core";

export interface EvalCase {
  name: string;
  description?: string;
  csvs: Record<string, string>; // { datasetName: "filename.csv" }
  messages: string[];
  tags: string[];
  rubric?: string; // plain-text description fed to judge
  expectDecline?: boolean;
}

export interface JudgeScores {
  correctness: number;
  chartType: number;
  readability: number;
  aesthetics: number;
  completeness: number;
}

export interface JudgeResult {
  scores: JudgeScores;
  total: number; // sum of all scores (max 25)
  reasoning: string;
}

export interface CaseResult {
  name: string;
  success: boolean;
  error?: string;
  finalSpec?: ChartSpec;
  screenshotPath?: string;
  screenshotBase64?: string;
  steps: number;
  toolCalls: string[];
  judgeScores?: JudgeResult;
  durationMs: number;
  totalTokens?: number;
}

export interface EvalSummary {
  runAt: string;
  model: string;
  totalCases: number;
  passed: number;
  failed: number;
  avgScore: number;
  cases: CaseResult[];
}
