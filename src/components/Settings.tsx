import { type Theme, type BgKey, type FontKey, FONTS, PAGE_BG } from '../constants'

interface Props {
  theme: Theme
  onToggleTheme: () => void
  bgKey: BgKey
  onChangeBg: (bg: BgKey) => void
  font: FontKey
  onChangeFont: (f: FontKey) => void
}

const BG_KEYS: BgKey[] = ['white', 'cream', 'gray']
const FONT_KEYS = Object.keys(FONTS) as FontKey[]

export default function Settings({ theme, onToggleTheme, bgKey, onChangeBg, font, onChangeFont }: Props) {
  return (
    <div className="settings">
      <div className="settings-group">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? '☽' : '☀'}
        </button>
      </div>

      <div className="settings-group">
        {BG_KEYS.map(key => (
          <button
            key={key}
            className={`swatch${bgKey === key ? ' swatch--active' : ''}`}
            style={{ background: PAGE_BG[theme][key] }}
            onClick={() => onChangeBg(key)}
            title={key}
            aria-label={`${key} page background`}
          />
        ))}
      </div>

      <div className="settings-group">
        {FONT_KEYS.map(f => (
          <button
            key={f}
            className={`font-btn${font === f ? ' font-btn--active' : ''}`}
            style={{ fontFamily: FONTS[f].family }}
            onClick={() => onChangeFont(f)}
            title={FONTS[f].label}
          >
            Ag
          </button>
        ))}
      </div>
    </div>
  )
}
