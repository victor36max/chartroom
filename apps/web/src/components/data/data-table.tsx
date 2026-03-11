"use client";

import { useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";
import { Download, Plus, Trash2, MoreHorizontal, Pencil } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { extractMetadata } from "@chartroom/core";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ParsedCSV } from "@/types";

interface DataTableProps {
  csvData: ParsedCSV;
  datasetName: string;
  onDatasetChanged?: (name: string, data: ParsedCSV) => void;
}

const ROW_HEIGHT = 28;

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function coerceValue(value: string, columnType: string): unknown {
  if (value === "") return null;
  if (columnType === "number") {
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  }
  if (columnType === "boolean") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
    return value;
  }
  return value;
}

function generateColumnName(existingColumns: string[]): string {
  let i = 1;
  while (existingColumns.includes(`column_${i}`)) i++;
  return `column_${i}`;
}

/** Strip HTML from pasted content, keeping only plain text. */
function handlePaste(e: React.ClipboardEvent) {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
}

/** Check if the caret is at the very start of a contentEditable element. */
function isCaretAtStart(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;
  const range = sel.getRangeAt(0);
  return range.collapsed && range.startOffset === 0 && range.startContainer === el.firstChild || range.startContainer === el;
}

/** Check if the caret is at the very end of a contentEditable element. */
function isCaretAtEnd(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const text = el.textContent ?? "";
  if (range.startContainer === el) return range.startOffset >= el.childNodes.length;
  return range.startOffset >= text.length;
}

/** Focus a cell and select all its text. */
function focusCell(cell: HTMLElement) {
  cell.focus();
  const range = document.createRange();
  range.selectNodeContents(cell);
  window.getSelection()?.removeAllRanges();
  window.getSelection()?.addRange(range);
}

export function DataTable({ csvData, datasetName, onDatasetChanged }: DataTableProps) {
  const { data, metadata } = csvData;
  const columns = metadata.columns.map((c) => c.name);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editable = !!onDatasetChanged;

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const flush = useCallback(
    (newData: Record<string, unknown>[]) => {
      if (!onDatasetChanged) return;
      const newMetadata = extractMetadata(newData);
      onDatasetChanged(datasetName, { data: newData, metadata: newMetadata, errors: [] });
    },
    [onDatasetChanged, datasetName],
  );

  // Commit pending contentEditable changes on scroll (virtualization safety)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.isContentEditable && el.contains(active)) {
        active.blur();
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const commitCellEdit = useCallback(
    (rowIndex: number, colIndex: number, newText: string) => {
      const colName = columns[colIndex];
      const colMeta = metadata.columns[colIndex];
      const currentVal = String(data[rowIndex][colName] ?? "");
      if (newText === currentVal) return;
      const newData = data.map((row, i) =>
        i === rowIndex ? { ...row, [colName]: coerceValue(newText, colMeta?.type ?? "string") } : row,
      );
      flush(newData);
    },
    [columns, data, metadata.columns, flush],
  );

  const commitHeaderEdit = useCallback(
    (colIndex: number, newName: string) => {
      const oldName = columns[colIndex];
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;
      if (columns.includes(trimmed)) return; // duplicate name — reject silently
      const newData = data.map((row) => {
        const newRow: Record<string, unknown> = {};
        for (const key of Object.keys(row)) {
          newRow[key === oldName ? trimmed : key] = row[key];
        }
        return newRow;
      });
      flush(newData);
    },
    [columns, data, flush],
  );

  const addRow = useCallback(() => {
    const emptyRow: Record<string, unknown> = {};
    for (const col of columns) emptyRow[col] = null;
    flush([...data, emptyRow]);
  }, [columns, data, flush]);

  const deleteRow = useCallback(
    (rowIndex: number) => {
      flush(data.filter((_, i) => i !== rowIndex));
    },
    [data, flush],
  );

  const addColumn = useCallback(() => {
    const newName = generateColumnName(columns);
    const newData = data.map((row) => ({ ...row, [newName]: null }));
    flush(newData);
  }, [columns, data, flush]);

  const deleteColumn = useCallback(
    (colIndex: number) => {
      const colName = columns[colIndex];
      const newData = data.map((row) => {
        const newRow = { ...row };
        delete newRow[colName];
        return newRow;
      });
      flush(newData);
    },
    [columns, data, flush],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs text-muted-foreground border-b shrink-0 flex items-center justify-between">
        <span>
          {metadata.rowCount} rows, {columns.length} columns
        </span>
        <div className="flex items-center gap-1">
          {editable && (
            <>
              <Button variant="ghost" size="xs" onClick={addRow} title="Add row">
                <Plus className="h-3.5 w-3.5" />
                Row
              </Button>
              <Button variant="ghost" size="xs" onClick={addColumn} title="Add column">
                <Plus className="h-3.5 w-3.5" />
                Col
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => downloadCSV(data, datasetName)}
            title="Download as CSV"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0 text-xs">
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <thead className="sticky top-0 z-10" style={{ display: "block" }}>
            <tr
              style={{
                display: "grid",
                gridTemplateColumns: `32px repeat(${columns.length}, minmax(120px, 1fr))`,
              }}
            >
              <th className="px-1 py-2 font-medium text-center bg-muted text-muted-foreground border-b">
                #
              </th>
              {columns.map((col, colIndex) => (
                <th
                  key={col}
                  className="group px-1 py-2 font-medium text-left whitespace-nowrap bg-muted border-b"
                >
                  <div className="flex items-center gap-0.5">
                    <span
                      className="truncate flex-1 px-1 outline-none focus:ring-2 focus:ring-primary focus:bg-primary/10 rounded-sm"
                      contentEditable={editable}
                      suppressContentEditableWarning
                      onPaste={handlePaste}
                      onBlur={(e) => commitHeaderEdit(colIndex, e.currentTarget.textContent ?? "")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                        if (e.key === "Escape") {
                          e.currentTarget.textContent = col;
                          e.currentTarget.blur();
                        }
                      }}
                    >
                      {col}
                    </span>
                    {editable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              // Focus the contentEditable header span
                              const th = document.querySelectorAll("thead th")[colIndex + 1];
                              const span = th?.querySelector("[contenteditable]");
                              if (span instanceof HTMLElement) {
                                span.focus();
                                // Select all text
                                const range = document.createRange();
                                range.selectNodeContents(span);
                                window.getSelection()?.removeAllRanges();
                                window.getSelection()?.addRange(range);
                              }
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteColumn(colIndex)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1.5" />
                            Delete column
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ display: "block", position: "relative", height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = data[virtualRow.index];
              const rowIndex = virtualRow.index;
              return (
                <tr
                  key={rowIndex}
                  className="group/row hover:bg-muted/30"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `32px repeat(${columns.length}, minmax(120px, 1fr))`,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <td className="px-1 py-2 text-center text-muted-foreground relative">
                    <span className="group-hover/row:opacity-0">{rowIndex + 1}</span>
                    {editable && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="absolute inset-0 h-full w-full p-0 opacity-0 group-hover/row:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => deleteRow(rowIndex)}
                        title="Delete row"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                  {columns.map((col, colIndex) => (
                    <td
                      key={col}
                      data-row={rowIndex}
                      data-col={colIndex}
                      className="px-2 py-2 whitespace-nowrap truncate outline-none focus:ring-2 focus:ring-primary focus:ring-inset focus:bg-primary/10 rounded-sm"
                      contentEditable={editable}
                      suppressContentEditableWarning
                      onPaste={handlePaste}
                      onBlur={(e) =>
                        commitCellEdit(rowIndex, colIndex, e.currentTarget.textContent ?? "")
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                        if (e.key === "Escape") {
                          e.currentTarget.textContent = String(row[col] ?? "");
                          e.currentTarget.blur();
                        }
                        if (e.key === "Tab") {
                          e.preventDefault();
                          e.currentTarget.blur();
                          const nextCol = e.shiftKey
                            ? colIndex > 0 ? colIndex - 1 : colIndex
                            : colIndex < columns.length - 1 ? colIndex + 1 : colIndex;
                          if (nextCol !== colIndex) {
                            const tr = e.currentTarget.parentElement;
                            const nextTd = tr?.children[nextCol + 1];
                            if (nextTd instanceof HTMLElement) focusCell(nextTd);
                          }
                        }
                        // Arrow key navigation
                        if (e.key === "ArrowLeft" && isCaretAtStart(e.currentTarget) && colIndex > 0) {
                          e.preventDefault();
                          const tr = e.currentTarget.parentElement;
                          const prevTd = tr?.children[colIndex]; // colIndex because children[0] is row number
                          if (prevTd instanceof HTMLElement) focusCell(prevTd);
                        }
                        if (e.key === "ArrowRight" && isCaretAtEnd(e.currentTarget) && colIndex < columns.length - 1) {
                          e.preventDefault();
                          const tr = e.currentTarget.parentElement;
                          const nextTd = tr?.children[colIndex + 2];
                          if (nextTd instanceof HTMLElement) focusCell(nextTd);
                        }
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          const container = scrollRef.current;
                          if (!container) return;
                          const targetRow = e.key === "ArrowUp" ? rowIndex - 1 : rowIndex + 1;
                          if (targetRow < 0 || targetRow >= data.length) return;
                          e.preventDefault();
                          e.currentTarget.blur();
                          const target = container.querySelector<HTMLElement>(`td[data-row="${targetRow}"][data-col="${colIndex}"]`);
                          if (target) {
                            focusCell(target);
                          } else {
                            // Target row not rendered yet — scroll to it, then focus after virtualizer updates
                            virtualizer.scrollToIndex(targetRow, { align: "auto" });
                            requestAnimationFrame(() => {
                              const el = container.querySelector<HTMLElement>(`td[data-row="${targetRow}"][data-col="${colIndex}"]`);
                              if (el) focusCell(el);
                            });
                          }
                        }
                      }}
                    >
                      {String(row[col] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
