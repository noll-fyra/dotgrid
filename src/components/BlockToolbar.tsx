import type { BlockType } from '../constants'

interface Props {
  activeTool: BlockType | null
  onToolPointerDown: (type: BlockType) => void
}

const TOOLS: { type: BlockType; label: string; title: string }[] = [
  { type: 'text',     label: 'T',  title: 'Text block'     },
  { type: 'shape',    label: '□',  title: 'Shape block'    },
  { type: 'stars',    label: '★',  title: 'Star rating'    },
  { type: 'progress', label: '▬',  title: 'Progress bar'   },
]

export default function BlockToolbar({ activeTool, onToolPointerDown }: Props) {
  return (
    <div className="block-toolbar">
      {TOOLS.map(({ type, label, title }) => (
        <button
          key={type}
          className={`block-tool-btn${activeTool === type ? ' block-tool-btn--active' : ''}`}
          onPointerDown={e => { e.preventDefault(); onToolPointerDown(type) }}
          aria-label={title}
          title={title}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
