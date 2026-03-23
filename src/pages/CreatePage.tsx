import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../components/Page'
import Settings from '../components/Settings'
import BlockToolbar from '../components/BlockToolbar'
import { type Theme, type BgKey, type FontKey, type Block, type BlockType } from '../constants'
import type { CellData } from '../hooks/useGrid'

interface Props {
  pages: CellData[][]
  currentPage: number
  onCellsChange: (cells: CellData[]) => void
  title: string
  onTitleChange: (title: string) => void
  theme: Theme
  onToggleTheme: () => void
  bgKey: BgKey
  onChangeBg: (key: BgKey) => void
  font: FontKey
  onChangeFont: (key: FontKey) => void
  pageBg: string
  bookmarks: Set<number>
  toggleBookmark: (i: number) => void
  onDeletePage: (index: number) => void
  // Block props
  blocks: Block[]
  onBlocksChange: (blocks: Block[]) => void
}

export default function CreatePage({
  pages, currentPage, onCellsChange,
  title, onTitleChange,
  theme, onToggleTheme, bgKey, onChangeBg, font, onChangeFont, pageBg,
  bookmarks, toggleBookmark, onDeletePage,
  blocks, onBlocksChange,
}: Props) {
  const navigate      = useNavigate()
  const bookmarked    = bookmarks.has(currentPage)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)

  const [pendingBlockType, setPendingBlockType] = useState<BlockType | null>(null)

  const searchHighlight = useMemo<Set<number>>(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return new Set()
    const cells = pages[currentPage]
    const matches = new Set<number>()
    const n = cells.length
    const ql = q.length
    for (let i = 0; i <= n - ql; i++) {
      let hit = true
      for (let j = 0; j < ql; j++) {
        if (cells[i + j].char.toLowerCase() !== q[j]) { hit = false; break }
      }
      if (hit) {
        for (let j = 0; j < ql; j++) matches.add(i + j)
      }
    }
    return matches
  }, [pages, currentPage, searchQuery])

  const matchCount = searchQuery.length
    ? searchHighlight.size / searchQuery.length
    : 0

  // Handle toolbar drag-to-create: toggle or activate tool on pointerdown
  const handleToolPointerDown = useCallback((type: BlockType) => {
    setPendingBlockType(prev => prev === type ? null : type)
  }, [])

  // Cancel pending block if pointer is released outside the page
  // (covers both click-outside and drag-from-toolbar that misses the page)
  useEffect(() => {
    if (!pendingBlockType) return
    const onGlobalPointerUp = (e: PointerEvent) => {
      const pageEl = pageContainerRef.current?.querySelector('.page')
      if (!pageEl?.contains(e.target as Node)) setPendingBlockType(null)
    }
    window.addEventListener('pointerup', onGlobalPointerUp)
    return () => window.removeEventListener('pointerup', onGlobalPointerUp)
  }, [pendingBlockType])

  // Cancel pending block if clicking outside the page (e.g. keyboard nav)
  const onPageAreaPointerDown = useCallback((e: React.PointerEvent) => {
    if (!pendingBlockType) return
    const pageEl = pageContainerRef.current?.querySelector('.page')
    if (pageEl && !pageEl.contains(e.target as Node)) setPendingBlockType(null)
  }, [pendingBlockType])

  return (
    <div className="page-wrapper" onPointerDown={onPageAreaPointerDown}>
      {/* Left — Index home + bookmark */}
      <div className="create-sidebar-left">
        <button
          className="index-home-btn"
          onClick={() => navigate('/')}
          aria-label="Back to index"
        >
          <span>⌂</span>
          <span>Index</span>
        </button>
        <button
          className={`create-bookmark-btn${bookmarked ? ' create-bookmark-btn--active' : ''}`}
          onClick={() => toggleBookmark(currentPage)}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this page'}
          aria-pressed={bookmarked}
        >
          {bookmarked ? '★' : '☆'}
        </button>
        {pages.length > 1 && (
          <button
            className="create-delete-btn"
            onClick={() => {
              const label = title.trim() || `Page ${currentPage + 1}`
              if (window.confirm(`Delete "${label}"? This cannot be undone.`)) {
                onDeletePage(currentPage)
                navigate('/')
              }
            }}
            aria-label="Delete this page"
          >
            Delete
          </button>
        )}

        <div className="create-search">
          <input
            ref={searchInputRef}
            className="create-search-input"
            type="search"
            placeholder="Find"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setSearchQuery('') }}
            aria-label="Search in page"
          />
          {searchQuery && (
            <span className="create-search-count">
              {matchCount > 0 ? matchCount : 'none'}
            </span>
          )}
        </div>
      </div>

      {/* Center — page editor */}
      <div className="page-center">
        <div className="page-container" ref={pageContainerRef}>
          <div className="page-enter-right">
            <Page
              key={currentPage}
              pageBg={pageBg}
              pageNumber={currentPage + 1}
              title={title}
              onTitleChange={onTitleChange}
              initialCells={pages[currentPage]}
              onCellsChange={onCellsChange}
              searchHighlight={searchHighlight}
              blocks={blocks}
              onBlocksChange={onBlocksChange}
              pendingBlockType={pendingBlockType}
              onBlockPlaced={() => setPendingBlockType(null)}
              onBlockCancel={() => setPendingBlockType(null)}
            />
          </div>
        </div>
      </div>

      {/* Block toolbar */}
      <BlockToolbar
        activeTool={pendingBlockType}
        onToolPointerDown={handleToolPointerDown}
      />

      {/* Right — settings */}
      <Settings
        theme={theme}
        onToggleTheme={onToggleTheme}
        bgKey={bgKey}
        onChangeBg={onChangeBg}
        font={font}
        onChangeFont={onChangeFont}
      />
    </div>
  )
}
