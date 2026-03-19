export type Theme   = 'light' | 'dark'
export type BgKey   = 'white' | 'cream' | 'gray'
export type FontKey = 'jetbrains' | 'firacode' | 'sourcecode' | 'ibmplex' | 'inconsolata'

export const FONTS: Record<FontKey, { label: string; family: string }> = {
  jetbrains:   { label: 'JetBrains Mono',  family: "'JetBrains Mono', monospace" },
  firacode:    { label: 'Fira Code',        family: "'Fira Code', monospace" },
  sourcecode:  { label: 'Source Code Pro',  family: "'Source Code Pro', monospace" },
  ibmplex:     { label: 'IBM Plex Mono',    family: "'IBM Plex Mono', monospace" },
  inconsolata: { label: 'Inconsolata',      family: "'Inconsolata', monospace" },
}

// Text colour palette — first entry resets to default; others are dark versions of the bg hues
export const TEXT_COLORS: Array<{ label: string; value: string }> = [
  { label: 'Default', value: '' },
  { label: 'Amber',   value: '#92400e' },
  { label: 'Green',   value: '#15803d' },
  { label: 'Blue',    value: '#1d4ed8' },
  { label: 'Pink',    value: '#be185d' },
  { label: 'Orange',  value: '#c2410c' },
  { label: 'Purple',  value: '#7c3aed' },
]

// Highlighter palette — first entry is "clear"
export const HIGHLIGHT_COLORS: Array<{ label: string; value: string }> = [
  { label: 'Clear',  value: '' },
  { label: 'Yellow', value: 'rgba(253, 224, 71,  0.55)' },
  { label: 'Green',  value: 'rgba(134, 239, 172, 0.6)'  },
  { label: 'Blue',   value: 'rgba(147, 197, 253, 0.6)'  },
  { label: 'Pink',   value: 'rgba(249, 168, 212, 0.65)' },
  { label: 'Orange', value: 'rgba(254, 215, 170, 0.7)'  },
  { label: 'Purple', value: 'rgba(216, 180, 254, 0.65)' },
]

export const PAGE_BG: Record<Theme, Record<BgKey, string>> = {
  light: { white: '#ffffff', cream: '#FAF7F0', gray: '#F5F5F5' },
  dark:  { white: '#1e1e1e', cream: '#1c1a14', gray: '#252422' },
}
