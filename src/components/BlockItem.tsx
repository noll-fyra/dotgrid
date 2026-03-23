import { useRef, useEffect } from 'react'
import { CELL_W, CELL_H } from './Page'
import { COLS, ROWS } from '../hooks/useGrid'
import { useBlockText, remapBlockCells, makeEmptyBlockCells } from '../hooks/useBlockText'
import { PROGRESS_COLORS, type Block, type BlockCellData } from '../constants'

interface Props {
  block: Block
  isActive: boolean
  onActivate: () => void
  onChange: (updated: Block) => void
  onDelete: (id: string) => void
  registerKeyHandler: (id: string, handler: (e: React.KeyboardEvent) => void) => void
  unregisterKeyHandler: (id: string) => void
}

// Corners for most blocks; 'w'/'e' for stars (height-locked, width-only resize)
type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'w' | 'e'

interface DragState { startX: number; startY: number; origCol: number; origRow: number; initialTarget: EventTarget | null }
interface ResizeState {
  handle: Handle
  startX: number; startY: number
  origCol: number; origRow: number; origColSpan: number; origRowSpan: number
}

export default function BlockItem({
  block, isActive, onActivate, onChange, onDelete,
  registerKeyHandler, unregisterKeyHandler,
}: Props) {
  const dragState   = useRef<DragState | null>(null)
  const resizeState = useRef<ResizeState | null>(null)

  const initialCells = block.cells ?? makeEmptyBlockCells(block.colSpan * block.rowSpan)
  const { cells, cursor, setCursor, handleKeyDown, resetCells } = useBlockText(
    block.colSpan, block.rowSpan, initialCells,
    (newCells) => onChange({ ...block, cells: newCells }),
  )

  useEffect(() => {
    if (isActive) registerKeyHandler(block.id, handleKeyDown)
    else          unregisterKeyHandler(block.id)
    return () => unregisterKeyHandler(block.id)
  }, [isActive, block.id, handleKeyDown, registerKeyHandler, unregisterKeyHandler])

  const left   = (block.col + 1) * CELL_W
  const top    = (block.row + 1) * CELL_H
  const width  = block.colSpan * CELL_W
  const height = block.rowSpan * CELL_H

  // ── Drag ───────────────────────────────────────────────────────────────
  const onBlockPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onActivate()
    dragState.current = { startX: e.clientX, startY: e.clientY, origCol: block.col, origRow: block.row, initialTarget: e.target }
  }

  const onBlockPointerMove = (e: React.PointerEvent) => {
    const s = dragState.current
    if (!s) return
    const newCol = Math.max(0, Math.min(COLS - block.colSpan, s.origCol + Math.round((e.clientX - s.startX) / CELL_W)))
    const newRow = Math.max(0, Math.min(ROWS - block.rowSpan, s.origRow + Math.round((e.clientY - s.startY) / CELL_H)))
    if (newCol !== block.col || newRow !== block.row) onChange({ ...block, col: newCol, row: newRow })
  }

  const onBlockPointerUp = (e: React.PointerEvent) => {
    const s = dragState.current
    dragState.current = null
    if (!s) return
    const dx = Math.abs(e.clientX - s.startX)
    const dy = Math.abs(e.clientY - s.startY)
    if (dx < 5 && dy < 5) {
      const target = s.initialTarget as Element | null
      if (block.type === 'stars') {
        const starEl = target?.closest('.block-star')
        if (starEl) {
          const idx = Array.from(starEl.parentElement!.children).indexOf(starEl)
          if (idx >= 0) onChange({ ...block, starRating: starRating === idx + 1 ? 0 : idx + 1 })
        }
      }
      if (block.type === 'progress') {
        const progressEl = target?.closest('.block-progress')
        if (progressEl) {
          const rect = progressEl.getBoundingClientRect()
          const clickedCell = Math.max(0, Math.min(block.colSpan - 1, Math.floor((s.startX - rect.left) / CELL_W)))
          const newFilledCells = clickedCell + 1
          const currentFilledCells = Math.round(barProgress / 100 * block.colSpan)
          const newProgress = newFilledCells === currentFilledCells ? 0 : Math.round(newFilledCells / block.colSpan * 100)
          onChange({ ...block, barProgress: newProgress })
        }
      }
    }
  }

  // ── Resize ─────────────────────────────────────────────────────────────
  const onResizePointerDown = (e: React.PointerEvent, handle: Handle) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    resizeState.current = {
      handle, startX: e.clientX, startY: e.clientY,
      origCol: block.col, origRow: block.row,
      origColSpan: block.colSpan, origRowSpan: block.rowSpan,
    }
  }

  const onResizePointerMove = (e: React.PointerEvent) => {
    const s = resizeState.current
    if (!s) return
    const dx = Math.round((e.clientX - s.startX) / CELL_W)
    const dy = Math.round((e.clientY - s.startY) / CELL_H)
    let col = s.origCol, row = s.origRow, colSpan = s.origColSpan, rowSpan = s.origRowSpan

    if (s.handle === 'nw' || s.handle === 'sw' || s.handle === 'w') {
      const newCol = Math.max(0, Math.min(s.origCol + s.origColSpan - 1, s.origCol + dx))
      colSpan = s.origColSpan - (newCol - s.origCol)
      col = newCol
    }
    if (s.handle === 'ne' || s.handle === 'se' || s.handle === 'e') {
      colSpan = Math.max(1, Math.min(COLS - s.origCol, s.origColSpan + dx))
    }
    // Stars: height is locked — skip row/rowSpan changes
    if (block.type !== 'stars') {
      if (s.handle === 'nw' || s.handle === 'ne') {
        const newRow = Math.max(0, Math.min(s.origRow + s.origRowSpan - 1, s.origRow + dy))
        rowSpan = s.origRowSpan - (newRow - s.origRow)
        row = newRow
      }
      if (s.handle === 'sw' || s.handle === 'se') {
        rowSpan = Math.max(1, Math.min(ROWS - s.origRow, s.origRowSpan + dy))
      }
    }

    if (col !== block.col || row !== block.row || colSpan !== block.colSpan || rowSpan !== block.rowSpan) {
      let nextCells = block.cells
      if (block.type === 'text' && block.cells) {
        nextCells = remapBlockCells(block.cells, block.colSpan, block.rowSpan, colSpan, rowSpan)
        resetCells(nextCells, colSpan * rowSpan)
      }
      // Stars: keep colSpan in sync with starCount minimum (1 cell per star)
      const safeColSpan = block.type === 'stars' ? Math.max(block.starCount ?? 1, colSpan) : colSpan
      onChange({ ...block, col, row, colSpan: safeColSpan, rowSpan, cells: nextCells })
    }
  }

  const onResizePointerUp = () => { resizeState.current = null }

  // ── Resize handle layout ────────────────────────────────────────────────
  const handles: Handle[] = block.type === 'stars' ? [] : ['nw', 'ne', 'sw', 'se']

  // ── Star interaction ────────────────────────────────────────────────────
  const starCount  = block.starCount  ?? 5
  const starRating = block.starRating ?? 0

  // ── Progress bar defaults ───────────────────────────────────────────────
  const barColor    = block.barColor    ?? PROGRESS_COLORS[0]
  const barProgress = block.barProgress ?? 50

  return (
    <div
      className={['block', `block--${block.type}`, isActive ? 'block--active' : ''].join(' ').trim()}
      style={{ left, top, width, height }}
      onPointerDown={onBlockPointerDown}
      onPointerMove={onBlockPointerMove}
      onPointerUp={onBlockPointerUp}
    >
      {/* ── Config toolbar (above block, shown when active) ── */}
      {isActive && block.type === 'stars' && (
        <div className="block-config-toolbar">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className={`block-config-count-btn${starCount === n ? ' block-config-count-btn--active' : ''}`}
              onPointerDown={e => { e.preventDefault(); e.stopPropagation() }}
              onClick={() => onChange({ ...block, starCount: n, colSpan: n * 2 })}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      {isActive && block.type === 'progress' && (
        <div className="block-config-toolbar">
          {PROGRESS_COLORS.map(c => (
            <button
              key={c}
              className={`block-config-swatch${barColor === c ? ' block-config-swatch--active' : ''}`}
              style={{ background: c }}
              onPointerDown={e => { e.preventDefault(); e.stopPropagation() }}
              onClick={() => onChange({ ...block, barColor: c })}
            />
          ))}
          <span className="block-config-sep" />
          <button
            className="block-config-step-btn"
            onPointerDown={e => { e.preventDefault(); e.stopPropagation() }}
            onClick={() => onChange({ ...block, barProgress: Math.max(0, barProgress - 10) })}
          >−</button>
          <span className="block-config-value">{barProgress}%</span>
          <button
            className="block-config-step-btn"
            onPointerDown={e => { e.preventDefault(); e.stopPropagation() }}
            onClick={() => onChange({ ...block, barProgress: Math.min(100, barProgress + 10) })}
          >+</button>
        </div>
      )}

      {/* ── Block content ── */}
      {block.type === 'text' && (
        <div
          className="block-text-grid"
          style={{
            gridTemplateColumns: `repeat(${block.colSpan}, ${CELL_W}px)`,
            gridTemplateRows:    `repeat(${block.rowSpan}, ${CELL_H}px)`,
          }}
        >
          {cells.map((cell: BlockCellData, i: number) => (
            <div
              key={i}
              className="block-cell"
              onPointerDown={e => { e.preventDefault(); setCursor(i) }}
            >
              {isActive && i === cursor && <span className="cursor-caret" />}
              {cell.char && (
                <span className="char" style={{ fontWeight: cell.bold ? 700 : 400, fontStyle: cell.italic ? 'italic' : 'normal' }}>
                  {cell.char}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {block.type === 'stars' && (
        <div
          className="block-stars"
          style={{ gridTemplateColumns: `repeat(${starCount}, 1fr)` }}
        >
          {Array.from({ length: starCount }, (_, i) => (
            <span
              key={i}
              className={`block-star${starRating > i ? ' block-star--filled' : ''}`}
            >
              ★
            </span>
          ))}
        </div>
      )}

      {block.type === 'progress' && (
        <div className="block-progress">
          <div
            className="block-progress-fill"
            style={{ width: `${barProgress}%`, background: barColor }}
          />
        </div>
      )}

      {/* ── Resize handles ── */}
      {handles.map(handle => (
        <div
          key={handle}
          className={`block-resize-handle block-resize-handle--${handle}`}
          onPointerDown={e => onResizePointerDown(e, handle)}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        />
      ))}

      {/* ── Delete button ── */}
      <button
        className="block-delete-btn"
        onPointerDown={e => { e.preventDefault(); e.stopPropagation() }}
        onClick={e => { e.stopPropagation(); onDelete(block.id) }}
        aria-label="Delete block"
      >
        ×
      </button>
    </div>
  )
}
