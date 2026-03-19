import { useState, useEffect, useCallback } from 'react'
import Page from './components/Page'
import Settings from './components/Settings'
import { type Theme, type BgKey, type FontKey, FONTS, PAGE_BG } from './constants'
import { makeEmptyGrid, type CellData } from './hooks/useGrid'

export default function App() {
  const [theme,  setTheme]  = useState<Theme>('light')
  const [bgKey,  setBgKey]  = useState<BgKey>('white')
  const [font,   setFont]   = useState<FontKey>('jetbrains')

  const [pages, setPages]             = useState<CellData[][]>(() => [makeEmptyGrid()])
  const [currentPage, setCurrentPage] = useState(0)
  const [direction, setDirection]     = useState<'left' | 'right'>('right')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--font', FONTS[font].family)
  }, [font])

  const handleCellsChange = useCallback((cells: CellData[]) => {
    setPages(prev => {
      const next = [...prev]
      next[currentPage] = cells
      return next
    })
  }, [currentPage])

  const goLeft = useCallback(() => {
    setDirection('left')
    setCurrentPage(p => Math.max(0, p - 1))
  }, [])

  const goRight = useCallback(() => {
    setDirection('right')
    setCurrentPage(p => Math.min(pages.length - 1, p + 1))
  }, [pages.length])

  const addPage = useCallback(() => {
    setDirection('right')
    setPages(prev => [...prev, makeEmptyGrid()])
    setCurrentPage(pages.length)
  }, [pages.length])

  const isFirst   = currentPage === 0
  const isLast    = currentPage === pages.length - 1
  const hasContent = pages[currentPage].some(c => c.char !== '')

  return (
    <div className="page-wrapper">
      <Settings
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        bgKey={bgKey}
        onChangeBg={setBgKey}
        font={font}
        onChangeFont={setFont}
      />
      <div className="page-container">
          {!isFirst && (
            <button className="nav-btn nav-btn--left" onClick={goLeft} aria-label="Previous page">
              ‹
            </button>
          )}

          <div key={currentPage} className={direction === 'right' ? 'page-enter-right' : 'page-enter-left'}>
            <Page
              key={currentPage}
              pageBg={PAGE_BG[theme][bgKey]}
              pageNumber={currentPage + 1}
              initialCells={pages[currentPage]}
              onCellsChange={handleCellsChange}
            />
          </div>

          {isLast ? (
            <button
              className="nav-btn nav-btn--right nav-btn--add"
              onClick={hasContent ? addPage : undefined}
              aria-label="Add page"
              aria-disabled={!hasContent}
              style={{ opacity: hasContent ? undefined : 0.08, cursor: hasContent ? 'pointer' : 'default' }}
            >
              +
            </button>
          ) : (
            <button className="nav-btn nav-btn--right" onClick={goRight} aria-label="Next page">
              ›
            </button>
          )}
        </div>
    </div>
  )
}
