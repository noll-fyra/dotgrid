import { useCallback, useState } from 'react'
import type { BlockCellData } from '../constants'

function makeCell(): BlockCellData {
  return { char: '', bold: false, italic: false }
}

export function makeEmptyBlockCells(count: number): BlockCellData[] {
  return Array(count).fill(null).map(() => makeCell())
}

// Re-maps cells when a text block is resized. Copies characters that still fit.
export function remapBlockCells(
  cells: BlockCellData[],
  oldCols: number,
  oldRows: number,
  newCols: number,
  newRows: number,
): BlockCellData[] {
  const next = makeEmptyBlockCells(newCols * newRows)
  for (let r = 0; r < Math.min(oldRows, newRows); r++) {
    for (let c = 0; c < Math.min(oldCols, newCols); c++) {
      next[r * newCols + c] = cells[r * oldCols + c]
    }
  }
  return next
}

function findRunEnd(cells: BlockCellData[], from: number, total: number): number {
  let i = from
  while (i < total && cells[i].char !== '') i++
  return i
}

function shiftRunRight(cells: BlockCellData[], from: number, total: number): BlockCellData[] {
  const next = [...cells]
  const runEnd = Math.min(findRunEnd(next, from, total), total - 1)
  for (let i = runEnd; i > from; i--) next[i] = next[i - 1]
  next[from] = makeCell()
  return next
}

function deleteAndShiftLeft(cells: BlockCellData[], from: number, total: number): BlockCellData[] {
  const next = [...cells]
  const runEnd = findRunEnd(next, from + 1, total)
  for (let i = from; i < runEnd - 1; i++) next[i] = next[i + 1]
  if (runEnd > from + 1) next[runEnd - 1] = makeCell()
  else next[from] = makeCell()
  return next
}

export function useBlockText(
  cols: number,
  rows: number,
  initialCells: BlockCellData[],
  onChange: (cells: BlockCellData[]) => void,
) {
  const total = cols * rows
  const [cells, setCellsRaw] = useState<BlockCellData[]>(() =>
    initialCells.length === total ? initialCells : makeEmptyBlockCells(total)
  )
  const [cursor, setCursor] = useState(0)

  const setCells = useCallback((next: BlockCellData[]) => {
    setCellsRaw(next)
    onChange(next)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const row = Math.floor(cursor / cols)
    const col = cursor % cols

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setCursor(c => Math.max(0, c - 1))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setCursor(c => Math.min(total - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(0, c - cols))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(total - 1, c + cols))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCursor(row * cols)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCursor(row * cols + cols - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Jump to start of next row, clamped
      const nextRow = row + 1
      if (nextRow < rows) setCursor(nextRow * cols)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      if (cursor > 0) {
        setCells(deleteAndShiftLeft(cells, cursor - 1, total))
        setCursor(c => c - 1)
      }
    } else if (e.key === 'Delete') {
      e.preventDefault()
      const next = [...cells]
      next[cursor] = { ...next[cursor], char: '' }
      setCells(next)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Insert 2 spaces
      let next = shiftRunRight(cells, cursor, total)
      next[cursor] = { ...next[cursor], char: ' ' }
      if (cursor + 1 < total) {
        next = shiftRunRight(next, cursor + 1, total)
        next[cursor + 1] = { ...next[cursor + 1], char: ' ' }
      }
      setCells(next)
      setCursor(c => Math.min(c + 2, total - 1))
    } else if (e.key === ' ') {
      e.preventDefault()
      const next = shiftRunRight(cells, cursor, total)
      next[cursor] = { ...next[cursor], char: ' ' }
      setCells(next)
      setCursor(c => Math.min(c + 1, total - 1))
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      const next = shiftRunRight(cells, cursor, total)
      next[cursor] = { ...next[cursor], char: e.key }
      setCells(next)
      // Advance, but wrap to next row if at end of col
      if (col < cols - 1) {
        setCursor(c => c + 1)
      } else if (row < rows - 1) {
        setCursor((row + 1) * cols)
      }
    }
  }, [cursor, cells, cols, rows, total, setCells])

  // Sync external cell changes (e.g. resize remap)
  const resetCells = useCallback((newCells: BlockCellData[], newTotal: number) => {
    setCellsRaw(newCells)
    setCursor(c => Math.min(c, newTotal - 1))
  }, [])

  return { cells, cursor, setCursor, handleKeyDown, resetCells }
}
