import { useState, useEffect, useRef } from 'react'
import { CELL_W, CELL_H } from './Page'
import { COLS, ROWS } from '../hooks/useGrid'
import { makeEmptyBlockCells } from '../hooks/useBlockText'
import { BLOCK_DEFAULTS, PROGRESS_COLORS, type Block, type BlockType } from '../constants'
import BlockItem from './BlockItem'

interface Props {
  blocks: Block[]
  onBlocksChange: (blocks: Block[]) => void
  pendingBlockType: BlockType | null
  onPlaced: () => void
  onCancel: () => void
  activeBlockId: string | null
  onSetActiveBlock: (id: string | null) => void
  registerKeyHandler: (id: string, handler: (e: React.KeyboardEvent) => void) => void
  unregisterKeyHandler: (id: string) => void
}

interface GhostPos { col: number; row: number }

export default function BlockLayer({
  blocks, onBlocksChange,
  pendingBlockType, onPlaced, onCancel,
  activeBlockId, onSetActiveBlock,
  registerKeyHandler, unregisterKeyHandler,
}: Props) {
  const [ghostPos, setGhostPos] = useState<GhostPos | null>(null)
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pendingBlockType) { setGhostPos(null); return }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingBlockType, onCancel])

  const toGridPos = (offsetX: number, offsetY: number, type: BlockType): GhostPos => {
    const { colSpan, rowSpan } = BLOCK_DEFAULTS[type]
    return {
      col: Math.max(0, Math.min(COLS - colSpan, Math.floor(offsetX / CELL_W))),
      row: Math.max(0, Math.min(ROWS - rowSpan, Math.floor(offsetY / CELL_H))),
    }
  }

  const getOffsets = (e: React.PointerEvent) => {
    const rect = layerRef.current!.getBoundingClientRect()
    return { offsetX: e.clientX - rect.left - CELL_W, offsetY: e.clientY - rect.top - CELL_H }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pendingBlockType) return
    const { offsetX, offsetY } = getOffsets(e)
    setGhostPos(toGridPos(offsetX, offsetY, pendingBlockType))
  }

  // Place on pointerUp — works for both click-then-release and drag-from-toolbar
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pendingBlockType || !ghostPos) return
    e.stopPropagation()
    const { colSpan, rowSpan } = BLOCK_DEFAULTS[pendingBlockType]
    const newBlock: Block = {
      id: crypto.randomUUID(),
      type: pendingBlockType,
      col: ghostPos.col,
      row: ghostPos.row,
      colSpan,
      rowSpan,
      cells:       pendingBlockType === 'text'     ? makeEmptyBlockCells(colSpan * rowSpan) : undefined,
      starCount:   pendingBlockType === 'stars'    ? 5                    : undefined,
      starRating:  pendingBlockType === 'stars'    ? 0                    : undefined,
      barColor:    pendingBlockType === 'progress' ? PROGRESS_COLORS[0]  : undefined,
      barProgress: pendingBlockType === 'progress' ? 50                  : undefined,
    }
    onBlocksChange([...blocks, newBlock])
    onSetActiveBlock(newBlock.id)
    onPlaced()
  }

  const onPointerLeave = () => { if (pendingBlockType) setGhostPos(null) }

  const updateBlock  = (updated: Block) => onBlocksChange(blocks.map(b => b.id === updated.id ? updated : b))
  const deleteBlock  = (id: string) => {
    onBlocksChange(blocks.filter(b => b.id !== id))
    if (activeBlockId === id) onSetActiveBlock(null)
  }

  return (
    <div
      ref={layerRef}
      className={`block-layer${pendingBlockType ? ' block-layer--placing' : ''}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {/* Ghost preview */}
      {pendingBlockType && ghostPos && (() => {
        const { colSpan, rowSpan } = BLOCK_DEFAULTS[pendingBlockType]
        return (
          <div
            className={`block-ghost block-ghost--${pendingBlockType}`}
            style={{
              left:   (ghostPos.col + 1) * CELL_W,
              top:    (ghostPos.row + 1) * CELL_H,
              width:  colSpan * CELL_W,
              height: rowSpan * CELL_H,
            }}
          />
        )
      })()}

      {blocks.map(block => (
        <BlockItem
          key={block.id}
          block={block}
          isActive={activeBlockId === block.id}
          onActivate={() => onSetActiveBlock(block.id)}
          onChange={updateBlock}
          onDelete={deleteBlock}
          registerKeyHandler={registerKeyHandler}
          unregisterKeyHandler={unregisterKeyHandler}
        />
      ))}
    </div>
  )
}
