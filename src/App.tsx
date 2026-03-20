import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import IndexPage from './pages/IndexPage'
import CreatePage from './pages/CreatePage'
import { type Theme, type BgKey, type FontKey, FONTS, PAGE_BG } from './constants'
import { makeEmptyGrid, type CellData } from './hooks/useGrid'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => load('dg_theme', 'light'))
  const [bgKey, setBgKey] = useState<BgKey>(() => load('dg_bgKey', 'white'))
  const [font,  setFont]  = useState<FontKey>(() => load('dg_font', 'jetbrains'))

  const [pages, setPages]             = useState<CellData[][]>(() => load('dg_pages', [makeEmptyGrid()]))
  const [titles, setTitles]           = useState<string[]>(() => load('dg_titles', []))
  const [currentPage, setCurrentPage] = useState(0)
  const [bookmarks, setBookmarks]     = useState<Set<number>>(() => new Set(load<number[]>('dg_bookmarks', [])))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dg_theme', JSON.stringify(theme))
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--font', FONTS[font].family)
    localStorage.setItem('dg_font', JSON.stringify(font))
  }, [font])

  useEffect(() => {
    localStorage.setItem('dg_bgKey', JSON.stringify(bgKey))
  }, [bgKey])

  useEffect(() => {
    localStorage.setItem('dg_pages', JSON.stringify(pages))
  }, [pages])

  useEffect(() => {
    localStorage.setItem('dg_titles', JSON.stringify(titles))
  }, [titles])

  const handleTitleChange = useCallback((title: string) => {
    setTitles(prev => {
      const next = [...prev]
      next[currentPage] = title
      return next
    })
  }, [currentPage])

  useEffect(() => {
    localStorage.setItem('dg_bookmarks', JSON.stringify([...bookmarks]))
  }, [bookmarks])

  const toggleBookmark = useCallback((index: number) => {
    setBookmarks(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }, [])

  const handleCellsChange = useCallback((cells: CellData[]) => {
    setPages(prev => {
      const next = [...prev]
      next[currentPage] = cells
      return next
    })
  }, [currentPage])

  const addPage = useCallback(() => {
    const newIndex = pages.length
    setPages(prev => [...prev, makeEmptyGrid()])
    setCurrentPage(newIndex)
  }, [pages.length])

  const deletePage = useCallback((index: number) => {
    setPages(prev => prev.filter((_, i) => i !== index))
    setTitles(prev => prev.filter((_, i) => i !== index))
    setBookmarks(prev => {
      const next = new Set<number>()
      prev.forEach(b => {
        if (b < index) next.add(b)
        else if (b > index) next.add(b - 1)
      })
      return next
    })
    setCurrentPage(prev => Math.min(prev, pages.length - 2))
  }, [pages.length])

  const pageBg = PAGE_BG[theme][bgKey]

  return (
    <Routes>
      <Route
        path="/"
        element={
          <IndexPage
            pages={pages}
            titles={titles}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            addPage={addPage}
            pageBg={pageBg}
            bookmarks={bookmarks}
            toggleBookmark={toggleBookmark}
          />
        }
      />
      <Route
        path="/create"
        element={
          <CreatePage
            pages={pages}
            currentPage={currentPage}
            onCellsChange={handleCellsChange}
            title={titles[currentPage] ?? ''}
            onTitleChange={handleTitleChange}
            theme={theme}
            onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            bgKey={bgKey}
            onChangeBg={setBgKey}
            font={font}
            onChangeFont={setFont}
            pageBg={pageBg}
            bookmarks={bookmarks}
            toggleBookmark={toggleBookmark}
            onDeletePage={deletePage}
          />
        }
      />
    </Routes>
  )
}
