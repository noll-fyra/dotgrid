import { useRef, useEffect, useCallback, useState } from 'react'
import { useGrid, COLS, ROWS, isInSelection, type CellData } from '../hooks/useGrid'
import FormatToolbar from './FormatToolbar'
import BlockLayer from './BlockLayer'
import type { Block, BlockType } from '../constants'

export const CELL_W = 9
export const CELL_H = 24

interface Props {
  pageBg: string
  pageNumber: number
  title?: string
  onTitleChange?: (title: string) => void
  initialCells?: CellData[]
  onCellsChange?: (cells: CellData[]) => void
  searchHighlight?: Set<number>
  // Block props
  blocks?: Block[]
  onBlocksChange?: (blocks: Block[]) => void
  pendingBlockType?: BlockType | null
  onBlockPlaced?: () => void
  onBlockCancel?: () => void
}

export default function Page({
  pageBg, pageNumber, title, onTitleChange, initialCells, onCellsChange, searchHighlight,
  blocks = [], onBlocksChange, pendingBlockType = null, onBlockPlaced, onBlockCancel,
}: Props) {
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

  // Block state
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const blockKeyHandlers = useRef<Map<string, (e: React.KeyboardEvent) => void>>(new Map())

  const registerKeyHandler = useCallback((id: string, handler: (e: React.KeyboardEvent) => void) => {
    blockKeyHandlers.current.set(id, handler)
  }, [])

  const unregisterKeyHandler = useCallback((id: string) => {
    blockKeyHandlers.current.delete(id)
  }, [])

  // Routed key handler: active block gets first crack, then falls through to main grid
  const routedKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (activeBlockId) {
      const handler = blockKeyHandlers.current.get(activeBlockId)
      if (handler) {
        if (e.key === 'Escape') {
          setActiveBlockId(null)
          return
        }
        handler(e)
        return
      }
    }
    handleKeyDown(e)
  }, [activeBlockId, handleKeyDown])

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
    setActiveBlockId(null)  // clicking main grid deactivates any active block
    if (e.shiftKey) {
      extendSelectionTo(i)
    } else if (cells[i].char === '') {
      startRectSelection(i)
      isRectDragging.current = true
      isDragging.current     = false
      setRectSelecting(true)
    } else {
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
      <input
        className="page-title-input"
        value={title ?? ''}
        onChange={e => onTitleChange?.(e.target.value.slice(0, 40))}
        placeholder={`Page ${pageNumber}`}
        maxLength={40}
        aria-label="Page title"
        onMouseDown={e => e.stopPropagation()}
      />

      <input
        ref={inputRef}
        className="hidden-input"
        onKeyDown={routedKeyDown}
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
            const isMatch      = searchHighlight ? searchHighlight.has(i) : false

            return (
              <div
                key={i}
                className={[
                  'cell',
                  cellSelected ? 'cell--selected' : '',
                  isMatch      ? 'cell--search'   : '',
                  !cell.char   ? 'cell--empty'    : '',
                ].join(' ').trim()}
                style={cell.bg ? { background: cell.bg } : undefined}
                onPointerDown={e => handleCellPointerDown(e, i)}
                onPointerEnter={e => handleCellPointerEnter(e, i)}
              >
                <span className="dot" />
                {isCursor && !activeBlockId && !selection && <span className="cursor-caret" />}
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

      <BlockLayer
        blocks={blocks}
        onBlocksChange={blocks => { onBlocksChange?.(blocks); inputRef.current?.focus() }}
        pendingBlockType={pendingBlockType}
        onPlaced={() => { onBlockPlaced?.(); inputRef.current?.focus() }}
        onCancel={() => { onBlockCancel?.(); inputRef.current?.focus() }}
        activeBlockId={activeBlockId}
        onSetActiveBlock={id => { setActiveBlockId(id); inputRef.current?.focus() }}
        registerKeyHandler={registerKeyHandler}
        unregisterKeyHandler={unregisterKeyHandler}
      />
    </div>
  )
}
