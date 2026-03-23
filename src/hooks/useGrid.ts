import { useCallback, useEffect, useRef, useState } from 'react'

export const COLS = 78
export const ROWS = 58
export const TOTAL_CELLS = COLS * ROWS

export type CellData = {
  char: string
  bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean
  color: string; bg: string
}

const makeCell = (char = ''): CellData => ({
  char, bold: false, italic: false, underline: false, strikethrough: false, color: '', bg: '',
})

export function makeEmptyGrid(): CellData[] {
  return Array(TOTAL_CELLS).fill(null).map(() => makeCell())
}

// rect is only present (and true) for rectangular selections; absent = linear.
export type Selection = { anchor: number; head: number; rect?: true }

type HistoryEntry = { cells: CellData[]; cursor: number }

const MAX_HISTORY = 100

function clamp(i: number) {
  return Math.max(0, Math.min(TOTAL_CELLS - 1, i))
}

function findRunEnd(cells: CellData[], from: number): number {
  let i = from
  while (i < TOTAL_CELLS && cells[i].char !== '') i++
  return i
}

function shiftRunRight(prev: CellData[], from: number): CellData[] {
  const next = [...prev]
  const runEnd = Math.min(findRunEnd(next, from), TOTAL_CELLS - 1)
  for (let i = runEnd; i > from; i--) next[i] = next[i - 1]
  next[from] = makeCell()
  return next
}

function shiftRunRightN(prev: CellData[], from: number, n: number): CellData[] {
  const next = [...prev]
  const runEnd = findRunEnd(next, from)
  for (let i = Math.min(runEnd - 1 + n, TOTAL_CELLS - 1); i >= from + n; i--) next[i] = next[i - n]
  for (let i = from; i < Math.min(from + n, TOTAL_CELLS); i++) next[i] = makeCell()
  return next
}

function deleteRangeAndShiftLeft(prev: CellData[], start: number, end: number): CellData[] {
  const next = [...prev]
  const runEnd = findRunEnd(next, end + 1)
  const shiftLen = runEnd - (end + 1)
  for (let i = 0; i < shiftLen; i++) next[start + i] = next[end + 1 + i]
  for (let i = start + shiftLen; i <= end; i++) next[i] = makeCell()
  return next
}

function deleteAndShiftLeft(prev: CellData[], from: number): CellData[] {
  const next = [...prev]
  const runEnd = findRunEnd(next, from + 1)
  for (let i = from; i < runEnd - 1; i++) next[i] = next[i + 1]
  if (runEnd > from + 1) next[runEnd - 1] = makeCell()
  else next[from] = makeCell()
  return next
}

export function selectionRange(sel: Selection) {
  return { start: Math.min(sel.anchor, sel.head), end: Math.max(sel.anchor, sel.head) }
}

// Returns all cell indices covered by a selection (handles both linear and rect).
function selectionIndices(sel: Selection): number[] {
  if (!sel.rect) {
    const { start, end } = selectionRange(sel)
    const out: number[] = []
    for (let i = start; i <= end; i++) out.push(i)
    return out
  }
  const aRow = Math.floor(sel.anchor / COLS), aCol = sel.anchor % COLS
  const hRow = Math.floor(sel.head   / COLS), hCol = sel.head   % COLS
  const r0 = Math.min(aRow, hRow), r1 = Math.max(aRow, hRow)
  const c0 = Math.min(aCol, hCol), c1 = Math.max(aCol, hCol)
  const out: number[] = []
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++)
      out.push(r * COLS + c)
  return out
}

// Per-cell hit test — use this in rendering instead of a range check.
export function isInSelection(i: number, sel: Selection): boolean {
  if (!sel.rect) {
    const { start, end } = selectionRange(sel)
    return i >= start && i <= end
  }
  const aRow = Math.floor(sel.anchor / COLS), aCol = sel.anchor % COLS
  const hRow = Math.floor(sel.head   / COLS), hCol = sel.head   % COLS
  const row = Math.floor(i / COLS), col = i % COLS
  return row >= Math.min(aRow, hRow) && row <= Math.max(aRow, hRow)
      && col >= Math.min(aCol, hCol) && col <= Math.max(aCol, hCol)
}

export function useGrid(initialCells?: CellData[]) {
  const [cells, setCells] = useState<CellData[]>(() =>
    initialCells ?? makeEmptyGrid()
  )
  const [cursor, setCursorRaw] = useState(0)
  const [selection, setSelection] = useState<Selection | null>(null)

  // Always-current refs so undo/redo/snapshot are stable (zero deps).
  const cellsRef  = useRef(cells)
  const cursorRef = useRef(cursor)
  useEffect(() => { cellsRef.current  = cells  }, [cells])
  useEffect(() => { cursorRef.current = cursor }, [cursor])

  const undoStack = useRef<HistoryEntry[]>([])
  const redoStack = useRef<HistoryEntry[]>([])

  const snapshot = useCallback(() => {
    if (undoStack.current.length >= MAX_HISTORY) undoStack.current.shift()
    undoStack.current.push({ cells: cellsRef.current, cursor: cursorRef.current })
    redoStack.current = []
  }, [])

  const undo = useCallback(() => {
    const entry = undoStack.current.pop()
    if (!entry) return
    redoStack.current.push({ cells: cellsRef.current, cursor: cursorRef.current })
    setCells(entry.cells)
    setCursorRaw(entry.cursor)
    setSelection(null)
  }, [])

  const redo = useCallback(() => {
    const entry = redoStack.current.pop()
    if (!entry) return
    undoStack.current.push({ cells: cellsRef.current, cursor: cursorRef.current })
    setCells(entry.cells)
    setCursorRaw(entry.cursor)
    setSelection(null)
  }, [])

  const setCursor = useCallback((i: number) => {
    setCursorRaw(clamp(i))
    setSelection(null)
  }, [])

  // Linear selection (keyboard Shift+Arrow, Shift+click-drag without rect mode).
  const extendSelectionTo = useCallback((i: number, anchor?: number) => {
    const head = clamp(i)
    setCursorRaw(head)
    setSelection(prev => ({
      anchor: anchor ?? prev?.anchor ?? cursor,
      head,
      // no rect field → linear
    }))
  }, [cursor])

  // Rectangular selection — started by Shift+pointer-down on the grid.
  const startRectSelection = useCallback((i: number) => {
    const idx = clamp(i)
    setCursorRaw(idx)
    setSelection({ anchor: idx, head: idx, rect: true })
  }, [])

  const extendRectSelectionTo = useCallback((i: number) => {
    const head = clamp(i)
    setCursorRaw(head)
    setSelection(prev => ({
      anchor: prev?.anchor ?? head,
      head,
      rect: true,
    }))
  }, [])

  const applyFormat = useCallback((format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    if (!selection) return
    const indices = selectionIndices(selection)
    const allHave = indices.every(i => cells[i][format])
    snapshot()
    setCells(prev => {
      const next = [...prev]
      for (const i of indices) next[i] = { ...next[i], [format]: !allHave }
      return next
    })
  }, [cells, selection, snapshot])

  const applyBg = useCallback((color: string) => {
    if (!selection) return
    const indices = selectionIndices(selection)
    snapshot()
    setCells(prev => {
      const next = [...prev]
      for (const i of indices) next[i] = { ...next[i], bg: color }
      return next
    })
  }, [selection, snapshot])

  const applyColor = useCallback((color: string) => {
    if (!selection) return
    const indices = selectionIndices(selection)
    snapshot()
    setCells(prev => {
      const next = [...prev]
      for (const i of indices) next[i] = { ...next[i], color }
      return next
    })
  }, [selection, snapshot])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const row = Math.floor(cursor / COLS)
    const shift = e.shiftKey

    if (e.key === 'Escape') {
      setSelection(null)
      return
    }

    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key === 'z') {
      e.preventDefault()
      if (shift) redo(); else undo()
      return
    }
    if (mod && e.key === 'b') { e.preventDefault(); applyFormat('bold');          return }
    if (mod && e.key === 'i') { e.preventDefault(); applyFormat('italic');        return }
    if (mod && e.key === 'u') { e.preventDefault(); applyFormat('underline');     return }
    if (mod && shift && e.key === 'x') { e.preventDefault(); applyFormat('strikethrough'); return }
    if (mod && e.key === 'c' && selection) {
      e.preventDefault()
      let text = ''
      if (selection.rect) {
        const aRow = Math.floor(selection.anchor / COLS), aCol = selection.anchor % COLS
        const hRow = Math.floor(selection.head   / COLS), hCol = selection.head   % COLS
        const r0 = Math.min(aRow, hRow), r1 = Math.max(aRow, hRow)
        const c0 = Math.min(aCol, hCol), c1 = Math.max(aCol, hCol)
        for (let r = r0; r <= r1; r++) {
          if (r > r0) text += '\n'
          for (let c = c0; c <= c1; c++) text += cells[r * COLS + c].char
        }
      } else {
        const { start, end } = selectionRange(selection)
        for (let i = start; i <= end; i++) {
          if (i > start && i % COLS === 0) text += '\n'
          text += cells[i].char
        }
      }
      navigator.clipboard.writeText(text.trimEnd())
      return
    }
    if (mod && !shift && e.key === 'x' && selection) {
      e.preventDefault()
      let text = ''
      if (selection.rect) {
        const aRow = Math.floor(selection.anchor / COLS), aCol = selection.anchor % COLS
        const hRow = Math.floor(selection.head   / COLS), hCol = selection.head   % COLS
        const r0 = Math.min(aRow, hRow), r1 = Math.max(aRow, hRow)
        const c0 = Math.min(aCol, hCol), c1 = Math.max(aCol, hCol)
        for (let r = r0; r <= r1; r++) {
          if (r > r0) text += '\n'
          for (let c = c0; c <= c1; c++) text += cells[r * COLS + c].char
        }
        navigator.clipboard.writeText(text.trimEnd())
        const indices = selectionIndices(selection)
        snapshot()
        setCells(prev => {
          const next = [...prev]
          for (const i of indices) next[i] = { ...next[i], char: '' }
          return next
        })
      } else {
        const { start, end } = selectionRange(selection)
        for (let i = start; i <= end; i++) {
          if (i > start && i % COLS === 0) text += '\n'
          text += cells[i].char
        }
        navigator.clipboard.writeText(text.trimEnd())
        snapshot()
        setCells(prev => deleteRangeAndShiftLeft(prev, start, end))
        setCursorRaw(start)
      }
      setSelection(null)
      return
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      shift ? extendSelectionTo(cursor - 1) : setCursor(clamp(cursor - 1))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      shift ? extendSelectionTo(cursor + 1) : setCursor(clamp(cursor + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      shift ? extendSelectionTo(cursor - COLS) : setCursor(clamp(cursor - COLS))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      shift ? extendSelectionTo(cursor + COLS) : setCursor(clamp(cursor + COLS))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      setSelection(null)
      const rowEnd = row * COLS + COLS - 1
      const nextRowStart = (row + 1) * COLS
      if (nextRowStart < TOTAL_CELLS) {
        snapshot()
        setCells(prev => {
          const next = [...prev]
          for (let i = TOTAL_CELLS - 1; i >= nextRowStart + COLS; i--) next[i] = next[i - COLS]
          for (let i = nextRowStart; i < nextRowStart + COLS; i++) next[i] = makeCell()
          for (let i = cursor; i <= rowEnd; i++) {
            next[nextRowStart + (i - cursor)] = prev[i]
            next[i] = makeCell()
          }
          return next
        })
        setCursorRaw(nextRowStart)
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      setSelection(null)
      if (cells[cursor].char !== '') {
        snapshot()
        setCells(prev => {
          const next = shiftRunRightN(prev, cursor, 2)
          next[cursor] = { ...next[cursor], char: ' ' }
          if (cursor + 1 < TOTAL_CELLS) next[cursor + 1] = { ...next[cursor + 1], char: ' ' }
          return next
        })
      }
      setCursorRaw(c => Math.min(c + 2, TOTAL_CELLS - 1))
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      if (selection && selection.rect) {
        // Rect selection: clear chars inside the rectangle
        const indices = selectionIndices(selection)
        snapshot()
        setCells(prev => {
          const next = [...prev]
          for (const i of indices) next[i] = { ...next[i], char: '' }
          return next
        })
        setSelection(null)
      } else if (selection) {
        const { start, end } = selectionRange(selection)
        snapshot()
        setCells(prev => deleteRangeAndShiftLeft(prev, start, end))
        setCursorRaw(start)
        setSelection(null)
      } else if (cursor > 0 && cursor % COLS === 0) {
        const prevRowStart = cursor - COLS
        const insertAt = findRunEnd(cells, prevRowStart)
        snapshot()
        setCells(prev => {
          const next = [...prev]
          const space = cursor - insertAt
          for (let i = 0; i < space; i++) next[insertAt + i] = prev[cursor + i]
          for (let i = cursor; i < TOTAL_CELLS - COLS; i++) next[i] = prev[i + COLS]
          for (let i = TOTAL_CELLS - COLS; i < TOTAL_CELLS; i++) next[i] = makeCell()
          return next
        })
        setCursorRaw(insertAt)
      } else if (cursor > 0) {
        snapshot()
        setCells(prev => deleteAndShiftLeft(prev, cursor - 1))
        setCursorRaw(c => c - 1)
      }
    } else if (e.key === 'Delete') {
      e.preventDefault()
      snapshot()
      setCells(prev => {
        const next = [...prev]
        next[cursor] = { ...next[cursor], char: '' }
        return next
      })
    } else if (e.key === 'Home') {
      e.preventDefault()
      shift ? extendSelectionTo(row * COLS) : setCursor(row * COLS)
    } else if (e.key === 'End') {
      e.preventDefault()
      shift ? extendSelectionTo(row * COLS + COLS - 1) : setCursor(row * COLS + COLS - 1)
    } else if (e.key === ' ') {
      e.preventDefault()
      setSelection(null)
      snapshot()
      if (selection && !selection.rect) {
        const { start, end } = selectionRange(selection)
        setCells(prev => {
          const after = deleteRangeAndShiftLeft(prev, start, end)
          const next = shiftRunRight(after, start)
          next[start] = { ...next[start], char: ' ' }
          return next
        })
        setCursorRaw(start + 1)
      } else {
        setCells(prev => {
          const next = shiftRunRight(prev, cursor)
          next[cursor] = { ...next[cursor], char: ' ' }
          return next
        })
        setCursorRaw(c => Math.min(c + 1, TOTAL_CELLS - 1))
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      setSelection(null)
      snapshot()
      if (selection && !selection.rect) {
        const { start, end } = selectionRange(selection)
        setCells(prev => {
          const after = deleteRangeAndShiftLeft(prev, start, end)
          const next = shiftRunRight(after, start)
          next[start] = { ...next[start], char: e.key }
          return next
        })
        setCursorRaw(start + 1)
      } else {
        setCells(prev => {
          const next = shiftRunRight(prev, cursor)
          next[cursor] = { ...next[cursor], char: e.key }
          return next
        })
        setCursorRaw(c => Math.min(c + 1, TOTAL_CELLS - 1))
      }
    }
  }, [cursor, cells, selection, snapshot, undo, redo, applyFormat, extendSelectionTo, setCursor])

  const pasteText = useCallback((text: string) => {
    snapshot()
    setSelection(null)
    setCells(prev => {
      const next = [...prev]
      let pos = cursor
      for (const ch of text) {
        if (pos >= TOTAL_CELLS) break
        if (ch === '\n') {
          pos = clamp((Math.floor(pos / COLS) + 1) * COLS)
        } else if (ch !== '\r') {
          next[pos] = { ...next[pos], char: ch }
          const col = pos % COLS
          pos = col < COLS - 1 ? pos + 1 : clamp((Math.floor(pos / COLS) + 1) * COLS)
        }
      }
      setCursorRaw(Math.min(pos, TOTAL_CELLS - 1))
      return next
    })
  }, [cursor, snapshot])

  return {
    cells, cursor, setCursor, extendSelectionTo,
    startRectSelection, extendRectSelectionTo,
    selection, setSelection, applyFormat, applyBg, applyColor, pasteText, handleKeyDown,
  }
}
