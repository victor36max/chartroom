import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { JudgeResult } from "./types";

const JUDGE_PROMPT = `You are evaluating an AI-generated data visualization chart.
Score the chart on each criterion from 1 (very poor) to 5 (excellent).

Respond with ONLY a JSON object in this exact format, no other text:
{
  "correctness": <1-5>,
  "chartType": <1-5>,
  "readability": <1-5>,
  "aesthetics": <1-5>,
  "completeness": <1-5>,
  "reasoning": "<brief explanation>"
}

Criteria:
- correctness: Does the chart accurately represent the data as requested?
- chartType: Is the appropriate chart type used for the request?
- readability: Are axes, labels, and values clear and legible?
- aesthetics: Does the chart look polished (title, subtitle, colors)?
- completeness: Did the AI fulfill the complete request?

Be strict but fair.`;

export async function judgeChart(
  screenshotBase64: string,
  userPrompts: string[],
  rubric?: string
): Promise<JudgeResult> {
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const model = openrouter(process.env.JUDGE_MODEL_ID ?? "anthropic/claude-sonnet-4");

  const rubricText = rubric ? `\nAdditional rubric: ${rubric}` : "";

  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${JUDGE_PROMPT}

User request: "${userPrompts.join('" → "')}"${rubricText}`,
          },
          {
            type: "file",
            data: screenshotBase64,
            mediaType: "image/png",
          },
        ],
      },
    ],
  });

  // Extract JSON from response (model may wrap in markdown code fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Judge did not return valid JSON: ${text.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const scores = {
    correctness: clamp(parsed.correctness),
    chartType: clamp(parsed.chartType),
    readability: clamp(parsed.readability),
    aesthetics: clamp(parsed.aesthetics),
    completeness: clamp(parsed.completeness),
  };

  const total =
    scores.correctness + scores.chartType + scores.readability + scores.aesthetics + scores.completeness;

  return {
    scores,
    total,
    reasoning: parsed.reasoning ?? "",
  };
}

function clamp(n: unknown): number {
  const v = Number(n);
  if (isNaN(v)) return 1;
  return Math.max(1, Math.min(5, Math.round(v)));
}
