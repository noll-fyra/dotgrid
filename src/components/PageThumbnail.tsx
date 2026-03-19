import { COLS, ROWS, type CellData } from '../hooks/useGrid'
import { CELL_W, CELL_H } from './Page'

const PAGE_W = (COLS + 2) * CELL_W   // 720
const PAGE_H = (ROWS + 2) * CELL_H   // 1440

export const THUMB_SCALE = 0.22
export const THUMB_W = Math.round(PAGE_W * THUMB_SCALE)  // 158
export const THUMB_H = Math.round(PAGE_H * THUMB_SCALE)  // 317

interface Props {
  cells: CellData[]
  pageBg: string
}

export default function PageThumbnail({ cells, pageBg }: Props) {
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

      </div>
    </div>
  )
}
