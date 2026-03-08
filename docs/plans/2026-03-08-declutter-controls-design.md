# Declutter CSV Controls & Clear Chat UI

## Problem

The controls row below the textarea crams too many items into one line: `+ Add CSV`, dataset pills with remove buttons, and `Clear chat`. With multiple datasets loaded, it becomes visually cluttered and hard to scan.

## Design

Move dataset management into the header bar. Keep only "Clear chat" below the textarea.

### Header bar (updated)

```
┌────────────────────────────────────┐
│ ⚡ Fast ▾  │  📎 2 datasets ▾  132 rows │
└────────────────────────────────────┘
```

- The existing badge + row count becomes a clickable trigger
- Clicking opens a **Popover** (shadcn/ui) listing datasets with remove (✕) buttons and an "+ Add CSV" action at the bottom
- The `+ Add CSV` button includes a hidden file input (same pattern as current implementation)
- Row count text stays visible in the header (not inside the popover)

### Popover content

```
┌────────────────────┐
│  sales.csv      ✕  │
│  orders.csv     ✕  │
│────────────────────│
│  + Add CSV         │
└────────────────────┘
```

### Input area (simplified)

```
┌────────────────────────────────────┐
│  [textarea]                   Send │
│                        Clear chat  │
└────────────────────────────────────┘
```

- Only "Clear chat" remains below textarea (right-aligned, shown when `hasMessages && !isBusy`)
- Drag-and-drop CSV upload still works on the input area
- Initial CSV upload button (dashed border) still shows when no CSV is loaded

## Files to modify

| File | Changes |
|------|---------|
| `src/components/chat/chat-panel.tsx` | Add dataset popover to header, move `onDatasetRemoved` + `onFilesSelected` handling to header, add hidden file input + popover state |
| `src/components/chat/message-input.tsx` | Remove `+ Add CSV`, dataset pills, and `onDatasetRemoved` prop. Keep only `Clear chat` in the controls row. Remove `addFileInputRef`. |

## Components used

- `Popover`, `PopoverTrigger`, `PopoverContent` from shadcn/ui (may need to install)
- Existing `Badge`, `X` icon from lucide-react

## Verification

1. `bun run lint` — no lint errors
2. `bun run build` — successful build
3. `bun run test` — all tests pass
4. Manual: load 1-3 CSVs, verify popover shows/manages them, verify clear chat still works, verify drag-drop still works
