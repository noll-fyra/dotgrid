import type { Selection } from '../hooks/useGrid'
import { COLS } from '../hooks/useGrid'
import { CELL_W, CELL_H } from './Page'
import { HIGHLIGHT_COLORS, TEXT_COLORS } from '../constants'

interface Props {
  selection: Selection
  onFormat: (f: 'bold' | 'italic' | 'underline' | 'strikethrough') => void
  onBg: (color: string) => void
  onColor: (color: string) => void
  onMouseDown: (e: React.MouseEvent) => void
}

const ROW_GAP = 8
// btn-row (28) + gap + bg-row (20) + gap + text-row (20) + top+bottom padding (20)
const TOOLBAR_H = 28 + ROW_GAP + 20 + ROW_GAP + 20 + 20
const GAP       = 6

const BTN_ROW_W    = 4 * 32 + 3 * 3
const SWATCH_ROW_W = HIGHLIGHT_COLORS.length * 20 + (HIGHLIGHT_COLORS.length - 1) * 3
const TOOLBAR_W    = Math.max(BTN_ROW_W, SWATCH_ROW_W) + 24

export default function FormatToolbar({ selection, onFormat, onBg, onColor, onMouseDown }: Props) {
  const minIdx = Math.min(selection.anchor, selection.head)
  const maxIdx = Math.max(selection.anchor, selection.head)

  const topRow         = Math.floor(minIdx / COLS)
  const startCol       = minIdx % COLS
  const endColOnTopRow = topRow === Math.floor(maxIdx / COLS) ? maxIdx % COLS : COLS - 1

  const selMidX = (startCol + endColOnTopRow + 1) / 2 * CELL_W
  const x = Math.max(0, Math.min(COLS * CELL_W - TOOLBAR_W, selMidX - TOOLBAR_W / 2))
  const y = topRow * CELL_H - TOOLBAR_H - GAP

  return (
    <div
      className="format-toolbar"
      style={{ left: x, top: y }}
      onMouseDown={onMouseDown}
    >
      {/* Row 1: format toggles */}
      <div className="fmt-row">
        <button className="fmt-btn" onClick={() => onFormat('bold')}>
          <strong>B</strong>
        </button>
        <button className="fmt-btn fmt-btn--italic" onClick={() => onFormat('italic')}>
          <em>I</em>
        </button>
        <button className="fmt-btn fmt-btn--underline" onClick={() => onFormat('underline')}>
          <u>U</u>
        </button>
        <button className="fmt-btn fmt-btn--strike" onClick={() => onFormat('strikethrough')}>
          <s>S</s>
        </button>
      </div>

      {/* Row 2: text colour — "A" in each colour */}
      <div className="fmt-row">
        {TEXT_COLORS.map(({ label, value }) => (
          <button
            key={label}
            className="fmt-color fmt-color--text"
            style={value ? { color: value } : undefined}
            onClick={() => onColor(value)}
            title={`Text: ${label}`}
            aria-label={`Text: ${label}`}
          >
            A
          </button>
        ))}
      </div>

      {/* Row 3: background colour — rounded squares */}
      <div className="fmt-row">
        {HIGHLIGHT_COLORS.map(({ label, value }) => (
          <button
            key={label}
            className={`fmt-color${value === '' ? ' fmt-color--clear' : ''}`}
            style={value ? { background: value } : undefined}
            onClick={() => onBg(value)}
            title={`Background: ${label}`}
            aria-label={`Background: ${label}`}
          />
        ))}
      </div>
    </div>
  )
}
