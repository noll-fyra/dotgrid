# dotgrid

A minimal dot-grid journal for the browser. Each page is a fixed-size portrait card overlaid with a dot grid, where every cell holds exactly one character. It feels like writing on paper — but with rich text formatting, multiple pages, and full undo history.

## Features

**Writing**
- Click any cell to place your cursor and start typing
- Characters push existing text rightward; Backspace pulls it left
- Enter inserts a new line (shifts all rows below down); Backspace at column 0 joins with the line above
- Tab inserts two spaces and shifts the run

**Selection & formatting**
- Click and drag on cells with text to select a linear range
- Click and drag on empty cells to draw a rectangular selection
- Shift+Arrow keys extend the selection from the keyboard
- Formatting toolbar appears above any active selection:
  - **Bold** (⌘B), *Italic* (⌘I), Underline (⌘U), ~~Strikethrough~~ (⌘⇧X)
  - 6 text colours + default
  - 6 background highlight colours + clear
- ⌘C copies the selected text to the clipboard

**Editing**
- Full undo/redo: ⌘Z / ⌘⇧Z

**Pages**
- The **Index** (`/`) is the hub — a grid of page thumbnails you can click to open
- Add a new page with the **New page** card at the end of the index grid
- Each page has an editable title (defaults to "Page N"); limit 40 characters
- Bookmark any page with the ★ button on its thumbnail or in the editor sidebar

**Tags**
- Type `#word` anywhere in a page to tag it
- Tags are collected automatically from all pages

**Search & filtering** (Index page)
- **Text search** — filters the grid to pages whose content matches; non-matching pages stay in position (invisible) to preserve the layout
- **★ filter** — show only bookmarked pages
- **# filter** — opens a tag panel with all tags sorted alphabetically; click a tag to filter pages by it
- All three filters combine

**In-page search** (editor)
- A **Find** input in the left sidebar highlights every matching run of cells in amber
- Shows a match count; press Escape to clear

**Appearance**
- Light / dark mode toggle
- 3 page background tones: white, cream, gray
- 5 monospace fonts: JetBrains Mono, Fira Code, Source Code Pro, IBM Plex Mono, Inconsolata
- Settings panel on the right side of the editor

**Persistence**
- All pages, titles, bookmarks, and settings are saved to `localStorage` automatically

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Other commands

```bash
npm run build    # production build
npm run preview  # serve the production build locally
npx tsc --noEmit # type-check
npm test         # run tests
```
