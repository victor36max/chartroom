import { buildSystemPrompt as coreBuildSystemPrompt } from "@chartroom/core";

export function buildSystemPrompt(dataContext: string | undefined): string {
  return coreBuildSystemPrompt({ context: "web", dataContext });
}
