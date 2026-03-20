import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../components/Page'
import Settings from '../components/Settings'
import { type Theme, type BgKey, type FontKey } from '../constants'
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
}

export default function CreatePage({
  pages, currentPage, onCellsChange,
  title, onTitleChange,
  theme, onToggleTheme, bgKey, onChangeBg, font, onChangeFont, pageBg,
  bookmarks, toggleBookmark, onDeletePage,
}: Props) {
  const navigate      = useNavigate()
  const bookmarked    = bookmarks.has(currentPage)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="page-wrapper">
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
        <div className="page-container">
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
            />
          </div>
        </div>
      </div>

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
