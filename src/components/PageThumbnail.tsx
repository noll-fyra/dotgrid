import type React from 'react'
import { COLS, ROWS, type CellData } from '../hooks/useGrid'
import { CELL_W, CELL_H } from './Page'
import { type Block } from '../constants'

const PAGE_W = (COLS + 2) * CELL_W   // 720
const PAGE_H = (ROWS + 2) * CELL_H   // 1440

export const THUMB_SCALE = 0.22
export const THUMB_W = Math.round(PAGE_W * THUMB_SCALE)  // 158
export const THUMB_H = Math.round(PAGE_H * THUMB_SCALE)  // 317

interface Props {
  cells: CellData[]
  pageBg: string
  blocks: Block[]
}

export default function PageThumbnail({ cells, pageBg, blocks }: Props) {
  return (
    <div className="page-thumb-clip" style={{ width: THUMB_W, height: THUMB_H }}>
      <div
        className="page-thumb-inner"
        style={{
          width: PAGE_W,
          height: PAGE_H,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: 'top left',
          backgroundColor: pageBg,
          backgroundImage: 'radial-gradient(circle, var(--dot-color) 1.5px, transparent 1.5px)',
          backgroundSize: '9px 24px',
        }}
      >
        {cells.map((cell, idx) => {
          if (!cell.char && !cell.bg) return null
          const col = idx % COLS
          const row = Math.floor(idx / COLS)
          return (
            <span
              key={idx}
              style={{
                position: 'absolute',
                left: (col + 1) * CELL_W,
                top:  (row + 1) * CELL_H,
                width: CELL_W,
                height: CELL_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font)',
                fontSize: 13,
                lineHeight: 1,
                fontWeight:     cell.bold          ? 700 : 400,
                fontStyle:      cell.italic        ? 'italic' : 'normal',
                textDecoration: [
                  cell.underline     ? 'underline'    : '',
                  cell.strikethrough ? 'line-through' : '',
                ].filter(Boolean).join(' ') || undefined,
                color:      cell.color || 'var(--text-color)',
                background: cell.bg    || undefined,
              }}
            >
              {cell.char}
            </span>
          )
        })}

        {blocks.map(block => {
          const left   = (block.col + 1) * CELL_W
          const top    = (block.row + 1) * CELL_H
          const width  = block.colSpan * CELL_W
          const height = block.rowSpan * CELL_H
          const base: React.CSSProperties = { position: 'absolute', left, top, width, height }

          if (block.type === 'text') {
            return (
              <div key={block.id} style={{ ...base, background: 'rgba(255,255,255,0.7)', display: 'grid', gridTemplateColumns: `repeat(${block.colSpan}, ${CELL_W}px)` }}>
                {(block.cells ?? []).map((cell, i) => cell.char ? (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', fontSize: 13, fontWeight: cell.bold ? 700 : 400, fontStyle: cell.italic ? 'italic' : 'normal', color: 'var(--text-color)' }}>
                    {cell.char}
                  </span>
                ) : null)}
              </div>
            )
          }
          if (block.type === 'shape') {
            return <div key={block.id} style={{ ...base, border: '1.5px solid rgba(80,75,65,0.4)' }} />
          }
          if (block.type === 'stars') {
            const starCount  = block.starCount  ?? 5
            const starRating = block.starRating ?? 0
            return (
              <div key={block.id} style={{ ...base, display: 'grid', gridTemplateColumns: `repeat(${starCount}, 1fr)`, alignItems: 'center' }}>
                {Array.from({ length: starCount }, (_, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: starRating > i ? '#f59e0b' : 'rgba(100,96,88,0.45)' }}>★</span>
                ))}
              </div>
            )
          }
          if (block.type === 'progress') {
            const barColor    = block.barColor    ?? '#4a90e2'
            const barProgress = block.barProgress ?? 50
            return (
              <div key={block.id} style={{ ...base, border: '1.5px solid rgba(80,75,65,0.35)', background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${barProgress}%`, background: barColor, opacity: 0.7 }} />
              </div>
            )
          }
          return null
        })}

      </div>
    </div>
  )
}
