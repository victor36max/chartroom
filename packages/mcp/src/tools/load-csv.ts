import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import {
  parseCSVString,
  metadataToContext,
  datasetsToContext,
  isExcelFile,
  excelToCSVName,
  getSheetNamesFromBuffer,
  parseExcelBufferSheet,
  type DatasetMap,
} from "@chartroom/core";

const VALID_EXTENSIONS = new Set([".csv", ".tsv", ".xls", ".xlsx", ".xlsm", ".xlsb"]);

export function registerLoadCsv(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "load_csv",
    "Load and parse a CSV or Excel file. Returns column metadata (names, types, sample values). Supports .csv, .tsv, .xls, .xlsx.",
    { path: z.string().describe("Absolute path to the CSV or Excel file") },
    async ({ path: csvPath }) => {
      try {
        const ext = path.extname(csvPath).toLowerCase();
        if (!VALID_EXTENSIONS.has(ext)) {
          return {
            content: [{ type: "text" as const, text: `Error: Expected a .csv, .tsv, or Excel file, got "${ext || "no extension"}"` }],
            isError: true,
          };
        }

        const rawName = csvPath.split("/").pop() ?? csvPath;

        if (isExcelFile(rawName)) {
          const fileBuffer = await fs.readFile(csvPath);
          const buffer = fileBuffer.buffer.slice(
            fileBuffer.byteOffset,
            fileBuffer.byteOffset + fileBuffer.byteLength
          ) as ArrayBuffer;
          const sheetNames = getSheetNamesFromBuffer(buffer);
          for (const sheet of sheetNames) {
            const parsed = parseExcelBufferSheet(buffer, sheet);
            const name = sheetNames.length === 1
              ? excelToCSVName(rawName)
              : excelToCSVName(rawName, sheet);
            datasets[name] = parsed;
          }
        } else {
          const text = await fs.readFile(csvPath, "utf8");
          const parsed = parseCSVString(text);
          datasets[rawName] = parsed;
        }

        const entries = Object.entries(datasets);
        const context = entries.length > 1
          ? datasetsToContext(datasets)
          : `Dataset "${entries[0][0]}" (reference with \`{ "url": "${entries[0][0]}" }\`):\n${metadataToContext(entries[0][1].metadata)}`;

        return { content: [{ type: "text" as const, text: context }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error loading file: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
