# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (Vite, hot reload)
npm run build    # tsc + Vite production build
npm run preview  # serve the production build locally
npx tsc --noEmit # type-check without building
```

No test runner is configured.

## Architecture

### Grid model (`src/hooks/useGrid.ts`)
The entire document is a flat array of `CellData` (`{ char, bold, italic }`) with `COLS × ROWS` entries. All editing logic lives here — there are no separate paragraph, line, or word abstractions. Key primitives:

- `findRunEnd(cells, from)` — walks forward until `char === ''`. Used everywhere to scope operations to connected text. A typed space (`' '`) is **non-empty** and is included in runs.
- `shiftRunRight / shiftRunRightN` — insert-mode helpers that push a run rightward.
- `deleteAndShiftLeft` — pull a run left (backspace).
- `deleteRangeAndShiftLeft` — delete a selection and close the gap.
- Enter does a full row-shift-down (inverse: backspace at col 0 joins lines with a full row-shift-up).
- Selection is `{ anchor, head }` — `selectionRange()` normalises to `{ start, end }`.

### Page layout (`src/components/Page.tsx`)
The page card is `(COLS + 2) × CELL_W` by `(ROWS + 2) × CELL_H` pixels. The grid is centered inside via flexbox, giving exactly one cell of margin on every side. `CELL_W = 9` and `CELL_H = 24` are exported constants used by `FormatToolbar` for pixel-accurate positioning.

A hidden `<input>` (off-screen, always focused) is the keyboard trap. All pointer events on cells call `setCursor` or `extendSelectionTo` via `onPointerDown` / `onPointerEnter` for drag-select.

### Settings & theming (`src/constants.ts`, `src/components/Settings.tsx`)
Shared types and data (`Theme`, `BgKey`, `FontKey`, `FONTS`, `PAGE_BG`) live in `src/constants.ts` — **not** in `App.tsx` — to avoid a circular import between `App` and `Settings`.

Dark mode is applied by setting `data-theme="dark"` on `<html>` via `useEffect`; all overrides are CSS `[data-theme="dark"]` selectors in `index.css`. The active font is applied the same way via `document.documentElement.style.setProperty('--font', ...)`.

Page background colour is the only prop passed to `Page` — it is an inline `style` because it varies per theme+key combination (`PAGE_BG[theme][bgKey]`).

### Formatting toolbar (`src/components/FormatToolbar.tsx`)
Positioned `absolute` inside `.grid-area` (which is `position: relative`). Its pixel coordinates are computed from `selection.anchor/head`, `COLS`, `CELL_W`, and `CELL_H`. Bold/italic are toggled on the selected range by `applyFormat` in `useGrid`; repeated application toggles them back off.
