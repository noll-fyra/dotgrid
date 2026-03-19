import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageThumbnail, { THUMB_W, THUMB_H } from '../components/PageThumbnail'
import type { CellData } from '../hooks/useGrid'

interface Props {
  pages: CellData[][]
  titles: string[]
  currentPage: number
  setCurrentPage: (i: number) => void
  addPage: () => void
  pageBg: string
  bookmarks: Set<number>
  toggleBookmark: (i: number) => void
}

const truncate = (s: string, max = 20) => s.length > max ? s.slice(0, max) + '…' : s

/** Extract unique lowercase tags (#word) from a page's cells. */
function extractTags(cells: CellData[]): string[] {
  const tags = new Set<string>()
  const n = cells.length
  for (let i = 0; i < n; i++) {
    if (cells[i].char !== '#') continue
    // Require word boundary before #
    const prev = i > 0 ? cells[i - 1].char : ''
    if (prev !== '' && prev !== ' ') continue
    let tag = ''
    let j = i + 1
    while (j < n && /^[a-zA-Z0-9_-]$/.test(cells[j].char)) {
      tag += cells[j].char
      j++
    }
    if (tag.length > 0) tags.add('#' + tag.toLowerCase())
  }
  return [...tags]
}

export default function IndexPage({ pages, titles, currentPage, setCurrentPage, addPage, pageBg, bookmarks, toggleBookmark }: Props) {
  const navigate = useNavigate()
  const [searchQuery,    setSearchQuery]    = useState('')
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)
  const [showTagPanel,   setShowTagPanel]   = useState(false)
  const [selectedTag,    setSelectedTag]    = useState<string | null>(null)

  // Build tag → Set<pageIndex> map and sorted tag list
  const { allTags, tagToPages } = useMemo(() => {
    const tagToPages = new Map<string, Set<number>>()
    pages.forEach((page, i) => {
      for (const tag of extractTags(page)) {
        if (!tagToPages.has(tag)) tagToPages.set(tag, new Set())
        tagToPages.get(tag)!.add(i)
      }
    })
    const allTags = [...tagToPages.keys()].sort()
    return { allTags, tagToPages }
  }, [pages])

  const matchingIndices = useMemo(() => {
    const hasSearch    = searchQuery.trim() !== ''
    const q            = hasSearch ? searchQuery.toLowerCase() : null
    const hasTagFilter = selectedTag !== null

    if (!hasSearch && !onlyBookmarked && !hasTagFilter) return null

    return new Set(pages.reduce<number[]>((acc, page, i) => {
      const matchesSearch   = !q || page.map(c => c.char).join('').toLowerCase().includes(q)
      const matchesBookmark = !onlyBookmarked || bookmarks.has(i)
      const matchesTag      = !hasTagFilter || (tagToPages.get(selectedTag!)?.has(i) ?? false)
      if (matchesSearch && matchesBookmark && matchesTag) acc.push(i)
      return acc
    }, []))
  }, [pages, searchQuery, onlyBookmarked, bookmarks, selectedTag, tagToPages])

  const toggleTagPanel = () => {
    setShowTagPanel(v => {
      if (v) setSelectedTag(null)  // clear selection when closing
      return !v
    })
  }

  const handleSelectTag = (tag: string) => {
    setSelectedTag(prev => prev === tag ? null : tag)
  }

  const openPage = (i: number) => {
    setCurrentPage(i)
    navigate('/create')
  }

  const handleAddPage = () => {
    addPage()
    navigate('/create')
  }

  const filtersActive = searchQuery.trim() || onlyBookmarked || selectedTag

  return (
    <div className="index-page">
      <header className="index-header">
        <h1 className="index-title">Dot Journal</h1>
        <div className="index-search-row">
          <input
            className="index-search"
            type="search"
            placeholder="Search pages…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search pages"
          />
          <button
            className={`index-filter-btn${onlyBookmarked ? ' index-filter-btn--active' : ''}`}
            onClick={() => setOnlyBookmarked(v => !v)}
            aria-label="Show bookmarked pages only"
            aria-pressed={onlyBookmarked}
          >
            {onlyBookmarked ? '★' : '☆'}
          </button>
          <button
            className={`index-filter-btn${showTagPanel ? ' index-filter-btn--active' : ''}`}
            onClick={toggleTagPanel}
            aria-label="Filter by tag"
            aria-pressed={showTagPanel}
          >
            #
          </button>
        </div>

        {showTagPanel && (
          <div className="index-tag-panel">
            {allTags.length === 0 ? (
              <span className="index-tag-empty">No tags yet — type #word in any page</span>
            ) : (
              allTags.map(tag => (
                <button
                  key={tag}
                  className={`index-tag-chip${selectedTag === tag ? ' index-tag-chip--active' : ''}`}
                  onClick={() => handleSelectTag(tag)}
                >
                  {tag}
                  <span className="index-tag-count">{tagToPages.get(tag)!.size}</span>
                </button>
              ))
            )}
          </div>
        )}
      </header>

      <div className="index-grid">
        {pages.map((_, i) => {
          const hidden     = matchingIndices !== null && !matchingIndices.has(i)
          const bookmarked = bookmarks.has(i)
          return (
            <div
              key={i}
              className="index-thumb-wrap"
              style={{ visibility: hidden ? 'hidden' : undefined }}
            >
              <button
                className={`index-thumb-btn${i === currentPage ? ' index-thumb-btn--active' : ''}`}
                onClick={() => openPage(i)}
                aria-label={`Open page ${i + 1}`}
              >
                <PageThumbnail cells={pages[i]} pageBg={pageBg} />
                <span className="index-thumb-label">{truncate(titles[i] || `Page ${i + 1}`)}</span>
              </button>
              <button
                className={`thumb-bookmark-btn${bookmarked ? ' thumb-bookmark-btn--active' : ''}`}
                onClick={() => toggleBookmark(i)}
                aria-label={bookmarked ? `Remove bookmark from page ${i + 1}` : `Bookmark page ${i + 1}`}
                aria-pressed={bookmarked}
              >
                {bookmarked ? '★' : '☆'}
              </button>
            </div>
          )
        })}

        {!filtersActive && (
          <button
            className="index-new-btn"
            onClick={handleAddPage}
            aria-label="New page"
            style={{ width: THUMB_W, height: THUMB_H }}
          >
            <span className="index-new-plus">+</span>
            <span className="index-new-label">New page</span>
          </button>
        )}
      </div>
    </div>
  )
}
