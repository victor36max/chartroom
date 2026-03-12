// Types
export type {
  ChartSpec,
  ThemeId,
  CategoricalInfo,
  DateGranularity,
  ColumnMeta,
  DataMetadata,
  ParsedCSV,
  DatasetMap,
} from "./types";

// CSV parsing
export {
  parseCSV,
  parseCSVString,
  extractMetadata,
  metadataToContext,
  datasetsToContext,
  isExcelFile,
  excelToCSVName,
} from "./csv-parser";

// Excel parsing
export {
  getSheetNames,
  parseExcelSheet,
  getSheetNamesFromBuffer,
  parseExcelBufferSheet,
} from "./excel-parser";

// Spec utilities
export { injectData } from "./inject-data";
export { validateSpec } from "./validate-spec";

// Themes
export { DEFAULT_CONFIG, getThemeConfig } from "./themes";

// Spec schema (Zod, no AI SDK dependency)
export {
  vlSpecSchema,
  vlUnitSchema,
  vlMarkSchema,
  encodingChannelSchema,
  createVlSpecSchema,
} from "./spec-schema";

// System prompt
export { buildSystemPrompt, type SystemPromptOptions } from "./system-prompt";

// Docs
export { TOPIC_IDS, lookupDocs, DOC_CHUNKS, type TopicId } from "./docs";

// AI tools (requires `ai` peer dependency)
export { createTools } from "./tools";
export { pruneContext, pruneOldToolResults } from "./prune-context";
