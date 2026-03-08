import { buildSystemPrompt as coreBuildSystemPrompt } from "@firechart/core";

export function buildSystemPrompt(dataContext: string | undefined): string {
  return coreBuildSystemPrompt({ context: "web", dataContext });
}
