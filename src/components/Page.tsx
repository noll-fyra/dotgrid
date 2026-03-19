import { useRef, useEffect, useCallback, useState } from 'react'
import { useGrid, COLS, ROWS, isInSelection, type CellData } from '../hooks/useGrid'
import FormatToolbar from './FormatToolbar'

export const CELL_W = 9
export const CELL_H = 24

interface Props {
  pageBg: string
  pageNumber: number
  initialCells?: CellData[]
  onCellsChange?: (cells: CellData[]) => void
}

export default function Page({ pageBg, pageNumber, initialCells, onCellsChange }: Props) {
  const {
    cells, cursor, setCursor, extendSelectionTo,
    startRectSelection, extendRectSelectionTo,
    selection, applyFormat, applyBg, applyColor, pasteText, handleKeyDown,
  } = useGrid(initialCells)

  useEffect(() => {
    onCellsChange?.(cells)
  }, [cells, onCellsChange])

  const inputRef       = useRef<HTMLInputElement>(null)
  const isDragging     = useRef(false)
  const isRectDragging = useRef(false)
  const [rectSelecting, setRectSelecting] = useState(false)

  useEffect(() => {
    const refocus = () => inputRef.current?.focus()
    window.addEventListener('focus', refocus)
    inputRef.current?.focus()
    return () => window.removeEventListener('focus', refocus)
  }, [])

  useEffect(() => {
    const onUp = () => {
      isDragging.current     = false
      isRectDragging.current = false
      setRectSelecting(false)
    }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [])

  const pageWidth  = (COLS + 2) * CELL_W
  const pageHeight = (ROWS + 2) * CELL_H

  const handleCellPointerDown = useCallback((e: React.PointerEvent, i: number) => {
    e.preventDefault()
    inputRef.current?.focus()
    if (e.shiftKey) {
      // Shift+click extends the existing linear selection
      extendSelectionTo(i)
    } else if (cells[i].char === '') {
      // Empty cell → rectangular selection
      startRectSelection(i)
      isRectDragging.current = true
      isDragging.current     = false
      setRectSelecting(true)
    } else {
      // Cell with content → move cursor, enable linear drag-select
      setCursor(i)
      isDragging.current     = true
      isRectDragging.current = false
    }
  }, [cells, setCursor, extendSelectionTo, startRectSelection])

  const handleCellPointerEnter = useCallback((e: React.PointerEvent, i: number) => {
    if (!e.buttons) return
    if (isRectDragging.current) {
      extendRectSelectionTo(i)
    } else if (isDragging.current) {
      extendSelectionTo(i)
    }
  }, [extendSelectionTo, extendRectSelectionTo])

  return (
    <div
      className="page"
      style={{ width: pageWidth, height: pageHeight, background: pageBg }}
    >
      <div className="page-title">Dot Journal</div>

      <input
        ref={inputRef}
        className="hidden-input"
        onKeyDown={handleKeyDown}
        onPaste={e => { e.preventDefault(); pasteText(e.clipboardData.getData('text/plain')) }}
        readOnly
        aria-hidden="true"
      />

      <div className="grid-area">
        {selection && selection.anchor !== selection.head && (
          <FormatToolbar
            selection={selection}
            onFormat={applyFormat}
            onBg={applyBg}
            onColor={applyColor}
            onMouseDown={e => e.preventDefault()}
          />
        )}

        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`,
            gridTemplateRows:    `repeat(${ROWS}, ${CELL_H}px)`,
            cursor: rectSelecting ? 'crosshair' : undefined,
          }}
        >
          {cells.map((cell, i) => {
            const isCursor     = i === cursor
            const cellSelected = selection ? isInSelection(i, selection) : false

            return (
              <div
                key={i}
                className={[
                  'cell',
                  cellSelected      ? 'cell--selected' : '',
                  !cell.char        ? 'cell--empty'    : '',
                ].join(' ').trim()}
                style={cell.bg ? { background: cell.bg } : undefined}
                onPointerDown={e => handleCellPointerDown(e, i)}
                onPointerEnter={e => handleCellPointerEnter(e, i)}
              >
                <span className="dot" />
                {isCursor && <span className="cursor-caret" />}
                {cell.char && (
                  <span
                    className="char"
                    style={{
                      fontWeight:     cell.bold          ? 700 : 400,
                      fontStyle:      cell.italic        ? 'italic' : 'normal',
                      textDecoration: [
                        cell.underline     ? 'underline'    : '',
                        cell.strikethrough ? 'line-through' : '',
                      ].filter(Boolean).join(' ') || undefined,
                      color: cell.color || undefined,
                    }}
                  >
                    {cell.char}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="page-number">{pageNumber}</div>
    </div>
  )
}
