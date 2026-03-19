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
  - 6 background highlight colours + clear
  - 6 text colours + default
- ⌘C copies the selected text to the clipboard

**Pages**
- Navigate between pages with the left/right arrows flanking the page card
- Add a new page with the + button (only enabled once the current page has content)
- Animated page transitions

**Appearance**
- Light / dark mode toggle
- 3 page background tones: white, cream, gray
- 5 monospace fonts: JetBrains Mono, Fira Code, Source Code Pro, IBM Plex Mono, Inconsolata

**Editing**
- Full undo/redo: ⌘Z / ⌘⇧Z

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
