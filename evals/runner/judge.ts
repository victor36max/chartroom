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
- aesthetics: Does the chart look polished (title, colors, layout)?
- completeness: Did the AI fulfill the complete request?

CRITICAL RULES — you MUST follow these:
1. The rubric is authoritative. If the rubric says "both orientations acceptable", do NOT penalize for either orientation. If the rubric says multiple mark types are acceptable, accept any of them.
2. Do NOT invent requirements beyond what the user requested and the rubric states. Only score against stated requirements.
3. Score each criterion independently. A chart with the wrong type but clean labels, good colors, and a clear title should still score 4-5 on readability and aesthetics.
4. For "decline" cases where the rubric says to acknowledge a limitation and render an alternative: score high (4-5) if the alternative chart is reasonable and well-rendered. Only score low if the output is misleading or broken.
5. A subtitle is NOT required unless the rubric explicitly requires it.
6. Do not penalize for reasonable axis choices when the rubric doesn't specify exact axis mappings.

Be fair and follow the rubric strictly.`;

export async function judgeChart(
  screenshotBase64: string,
  userPrompts: string[],
  rubric: string | undefined,
  judgeModelId: string
): Promise<JudgeResult> {
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const model = openrouter(judgeModelId);

  const rubricText = rubric ? `\nAdditional rubric: ${rubric}` : "";

  const messages = [
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: `${JUDGE_PROMPT}

User request: "${userPrompts.join('" → "')}"${rubricText}`,
        },
        {
          type: "file" as const,
          data: screenshotBase64,
          mediaType: "image/png" as const,
        },
      ],
    },
  ];

  let parsed: Record<string, unknown> | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { text } = await generateText({ model, messages });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        if (attempt < 2) { await new Promise(r => setTimeout(r, 1000)); continue; }
        throw new Error(`Judge did not return valid JSON: ${text.slice(0, 200)}`);
      }
      parsed = JSON.parse(jsonMatch[0]);
      break;
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  if (!parsed) throw new Error("Judge failed after 3 attempts");
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
    reasoning: String(parsed.reasoning ?? ""),
  };
}

function clamp(n: unknown): number {
  const v = Number(n);
  if (isNaN(v)) return 1;
  return Math.max(1, Math.min(5, Math.round(v)));
}
