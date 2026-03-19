import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGrid, COLS } from './useGrid'
import type { CellData } from './useGrid'

// ── Helpers ────────────────────────────────────────────────────────────────

type HookResult = { current: ReturnType<typeof useGrid> }

// Always reads result.current.handleKeyDown fresh so stale closures are never an issue.
function press(
  result: HookResult,
  key: string,
  opts: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean } = {},
) {
  act(() => {
    result.current.handleKeyDown({
      key,
      shiftKey:  opts.shiftKey  ?? false,
      ctrlKey:   opts.ctrlKey   ?? false,
      metaKey:   opts.metaKey   ?? false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent)
  })
}

function type(result: HookResult, text: string) {
  for (const ch of text) press(result, ch)
}

/** Extract chars from the flat cell array as a plain string */
function str(cells: CellData[], from: number, length: number) {
  return cells.slice(from, from + length).map(c => c.char).join('')
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with an empty grid and cursor at 0', () => {
    const { result } = renderHook(() => useGrid())
    expect(result.current.cursor).toBe(0)
    expect(result.current.cells.every(c => c.char === '')).toBe(true)
    expect(result.current.selection).toBeNull()
  })
})

// ── Typing (insert mode) ───────────────────────────────────────────────────

describe('typing', () => {
  it('inserts characters and advances the cursor', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'abc')
    expect(str(result.current.cells, 0, 3)).toBe('abc')
    expect(result.current.cursor).toBe(3)
  })

  it('inserts at cursor, shifting existing text right', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'ac')
    press(result, 'ArrowLeft')
    press(result, 'ArrowLeft')
    press(result, 'ArrowRight')
    type(result, 'b')
    expect(str(result.current.cells, 0, 3)).toBe('abc')
  })

  it('does not shift text that is disconnected', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hello')
    act(() => result.current.setCursor(10))
    type(result, 'world')
    act(() => result.current.setCursor(2))
    type(result, 'X')
    // 'world' (disconnected at 10-14) must not have moved
    expect(str(result.current.cells, 10, 5)).toBe('world')
  })
})

// ── Space ──────────────────────────────────────────────────────────────────

describe('space', () => {
  it('inserts a space character (stored, not empty)', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'ab')
    act(() => result.current.setCursor(1))
    press(result, ' ')
    expect(result.current.cells[1].char).toBe(' ')
  })

  it('shifts the connected run right on space, not disconnected text', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hello')
    act(() => result.current.setCursor(20))
    type(result, 'world')
    act(() => result.current.setCursor(2))
    press(result, ' ')
    // 'world' (disconnected at 20-24) stays put
    expect(str(result.current.cells, 20, 5)).toBe('world')
    // 'hello' run shifted around the space
    expect(result.current.cells[0].char).toBe('h')
    expect(result.current.cells[1].char).toBe('e')
    expect(result.current.cells[2].char).toBe(' ')
    expect(result.current.cells[3].char).toBe('l')
  })
})

// ── Backspace ──────────────────────────────────────────────────────────────

describe('backspace', () => {
  it('deletes the character before the cursor and shifts the run left', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'abcd')
    press(result, 'ArrowLeft')
    press(result, 'ArrowLeft')
    press(result, 'Backspace')
    expect(str(result.current.cells, 0, 3)).toBe('acd')
    expect(result.current.cursor).toBe(1)
  })

  it('does nothing at cursor 0', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hi')
    act(() => result.current.setCursor(0))
    press(result, 'Backspace')
    expect(str(result.current.cells, 0, 2)).toBe('hi')
    expect(result.current.cursor).toBe(0)
  })

  it('joins lines when cursor is at the start of a row', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hello')
    press(result, 'Enter')
    type(result, 'world')
    act(() => result.current.setCursor(COLS))
    press(result, 'Backspace')
    // 'world' should follow 'hello' on row 0
    expect(str(result.current.cells, 0, 10)).toBe('helloworld')
    // cursor should be at position 5 (right after 'hello')
    expect(result.current.cursor).toBe(5)
  })

  it('shifts all rows up when joining lines', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'line1')
    press(result, 'Enter')
    type(result, 'line2')
    press(result, 'Enter')
    type(result, 'line3')
    act(() => result.current.setCursor(COLS))
    press(result, 'Backspace')
    // row 0 now has 'line1line2', row 1 has 'line3'
    expect(str(result.current.cells, 0, 10)).toBe('line1line2')
    expect(str(result.current.cells, COLS, 5)).toBe('line3')
  })
})

// ── Delete ─────────────────────────────────────────────────────────────────

describe('delete key', () => {
  it('clears the cell at the cursor without shifting', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'abc')
    act(() => result.current.setCursor(1))
    press(result, 'Delete')
    expect(result.current.cells[0].char).toBe('a')
    expect(result.current.cells[1].char).toBe('')
    expect(result.current.cells[2].char).toBe('c')
    expect(result.current.cursor).toBe(1) // cursor stays
  })
})

// ── Enter ──────────────────────────────────────────────────────────────────

describe('enter', () => {
  it('moves cursor to the start of the next row', () => {
    const { result } = renderHook(() => useGrid())
    press(result, 'Enter')
    expect(result.current.cursor).toBe(COLS)
  })

  it('moves the tail of the current line to the next row', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hello world')
    act(() => result.current.setCursor(5)) // between 'hello' and ' world'
    press(result, 'Enter')
    expect(str(result.current.cells, 0, 5)).toBe('hello')
    expect(result.current.cells[5].char).toBe('') // cleared
    expect(str(result.current.cells, COLS, 6)).toBe(' world')
    expect(result.current.cursor).toBe(COLS)
  })

  it('shifts subsequent rows down', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'row1')
    press(result, 'Enter')
    type(result, 'row2')
    act(() => result.current.setCursor(0))
    press(result, 'Enter') // insert blank line before row1
    // row 0 is now empty, row 1 has 'row1', row 2 has 'row2'
    expect(str(result.current.cells, 0, 4)).toBe('')
    expect(str(result.current.cells, COLS, 4)).toBe('row1')
    expect(str(result.current.cells, COLS * 2, 4)).toBe('row2')
  })
})

// ── Tab ────────────────────────────────────────────────────────────────────

describe('tab', () => {
  it('moves cursor +2 on empty cell without inserting', () => {
    const { result } = renderHook(() => useGrid())
    press(result, 'Tab')
    expect(result.current.cursor).toBe(2)
    expect(result.current.cells[0].char).toBe('')
    expect(result.current.cells[1].char).toBe('')
  })

  it('inserts two spaces and shifts the run when cursor is on content', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'abc')
    act(() => result.current.setCursor(0))
    press(result, 'Tab')
    expect(result.current.cells[0].char).toBe(' ')
    expect(result.current.cells[1].char).toBe(' ')
    expect(str(result.current.cells, 2, 3)).toBe('abc')
    expect(result.current.cursor).toBe(2)
  })
})

// ── Navigation ─────────────────────────────────────────────────────────────

describe('arrow key navigation', () => {
  it('ArrowRight advances the cursor', () => {
    const { result } = renderHook(() => useGrid())
    press(result, 'ArrowRight')
    expect(result.current.cursor).toBe(1)
  })

  it('ArrowLeft moves the cursor back', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(5))
    press(result, 'ArrowLeft')
    expect(result.current.cursor).toBe(4)
  })

  it('ArrowDown moves down one row', () => {
    const { result } = renderHook(() => useGrid())
    press(result, 'ArrowDown')
    expect(result.current.cursor).toBe(COLS)
  })

  it('ArrowUp moves up one row', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(COLS + 3))
    press(result, 'ArrowUp')
    expect(result.current.cursor).toBe(3)
  })

  it('Home jumps to start of current row', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(COLS + 5))
    press(result, 'Home')
    expect(result.current.cursor).toBe(COLS)
  })

  it('End jumps to last cell of current row', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(COLS + 5))
    press(result, 'End')
    expect(result.current.cursor).toBe(COLS * 2 - 1)
  })

  it('arrow keys clear the selection', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(5))
    act(() => result.current.extendSelectionTo(10))
    press(result, 'ArrowLeft')
    expect(result.current.selection).toBeNull()
  })
})

// ── Selection ──────────────────────────────────────────────────────────────

describe('selection', () => {
  it('Shift+ArrowRight extends selection to the right', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(0))
    press(result, 'ArrowRight', { shiftKey: true })
    press(result, 'ArrowRight', { shiftKey: true })
    expect(result.current.selection).toEqual({ anchor: 0, head: 2 })
  })

  it('Shift+ArrowLeft extends selection to the left', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(5))
    press(result, 'ArrowLeft', { shiftKey: true })
    press(result, 'ArrowLeft', { shiftKey: true })
    expect(result.current.selection).toEqual({ anchor: 5, head: 3 })
  })

  it('Escape clears the selection', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.extendSelectionTo(5))
    press(result, 'Escape')
    expect(result.current.selection).toBeNull()
  })

  it('setCursor clears the selection', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.extendSelectionTo(5))
    act(() => result.current.setCursor(3))
    expect(result.current.selection).toBeNull()
  })

  it('Shift+Home selects to start of row', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(COLS + 5))
    press(result, 'Home', { shiftKey: true })
    expect(result.current.selection).toEqual({ anchor: COLS + 5, head: COLS })
  })

  it('Shift+End selects to end of row', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(COLS + 5))
    press(result, 'End', { shiftKey: true })
    expect(result.current.selection).toEqual({ anchor: COLS + 5, head: COLS * 2 - 1 })
  })

  it('backspace on selection deletes range and closes gap', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hello world')
    act(() => result.current.setCursor(5))
    act(() => result.current.extendSelectionTo(9)) // select ' worl' (5-9), leaving 'd' at 10
    press(result, 'Backspace')
    expect(str(result.current.cells, 0, 6)).toBe('hellod')
    expect(result.current.cursor).toBe(5)
    expect(result.current.selection).toBeNull()
  })
})

// ── Formatting ─────────────────────────────────────────────────────────────

describe('formatting', () => {
  it('Cmd+B toggles bold on the selected range', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hello')
    act(() => result.current.setCursor(1))
    act(() => result.current.extendSelectionTo(3))
    press(result, 'b', { metaKey: true })
    expect(result.current.cells[1].bold).toBe(true)
    expect(result.current.cells[2].bold).toBe(true)
    expect(result.current.cells[3].bold).toBe(true)
    expect(result.current.cells[0].bold).toBe(false) // untouched
  })

  it('Cmd+B toggles bold off when all selected cells are already bold', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hi')
    act(() => result.current.setCursor(0))
    act(() => result.current.extendSelectionTo(1))
    press(result, 'b', { metaKey: true })
    // all selected are bold — toggle off
    act(() => result.current.setCursor(0))
    act(() => result.current.extendSelectionTo(1))
    press(result, 'b', { metaKey: true })
    expect(result.current.cells[0].bold).toBe(false)
    expect(result.current.cells[1].bold).toBe(false)
  })

  it('Cmd+I toggles italic on the selected range', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hello')
    act(() => result.current.setCursor(0))
    act(() => result.current.extendSelectionTo(4))
    press(result, 'i', { metaKey: true })
    expect(result.current.cells.slice(0, 5).every(c => c.italic)).toBe(true)
  })

  it('formatting does nothing without a selection', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hi')
    act(() => result.current.setCursor(0))
    press(result, 'b', { metaKey: true })
    expect(result.current.cells[0].bold).toBe(false)
  })
})

// ── Copy ───────────────────────────────────────────────────────────────────

describe('copy', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('Cmd+C copies selected chars to clipboard', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hello')
    act(() => result.current.setCursor(0))
    act(() => result.current.extendSelectionTo(4))
    press(result, 'c', { metaKey: true })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello')
  })

  it('Cmd+C inserts newlines at row boundaries', () => {
    const { result } = renderHook(() => useGrid())
    // Place 'a' at the last cell of row 0 and 'b' at the first cell of row 1
    act(() => result.current.setCursor(COLS - 1))
    type(result, 'ab') // 'a' at COLS-1, 'b' at COLS
    act(() => result.current.setCursor(COLS - 1))
    act(() => result.current.extendSelectionTo(COLS)) // select across row boundary
    press(result, 'c', { metaKey: true })
    const written = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(written).toContain('\n')
  })

  it('does not copy when there is no selection', () => {
    const { result } = renderHook(() => useGrid())
    type(result, 'hello')
    act(() => result.current.setCursor(0))
    press(result, 'c', { metaKey: true })
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })
})

// ── Paste ──────────────────────────────────────────────────────────────────

describe('pasteText', () => {
  it('inserts text at the cursor position', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.pasteText('hello'))
    expect(str(result.current.cells, 0, 5)).toBe('hello')
    expect(result.current.cursor).toBe(5)
  })

  it('handles newlines by advancing to the next row', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.pasteText('hi\nthere'))
    expect(str(result.current.cells, 0, 2)).toBe('hi')
    expect(str(result.current.cells, COLS, 5)).toBe('there')
  })

  it('inserts at the cursor position, not always at 0', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.setCursor(3))
    act(() => result.current.pasteText('abc'))
    expect(str(result.current.cells, 3, 3)).toBe('abc')
    expect(result.current.cursor).toBe(6)
  })

  it('clears the selection after pasting', () => {
    const { result } = renderHook(() => useGrid())
    act(() => result.current.extendSelectionTo(5))
    act(() => result.current.pasteText('hello'))
    expect(result.current.selection).toBeNull()
  })
})
