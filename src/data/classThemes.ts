// Per-class colour skins. The whole sheet is built on Tailwind's amber-* scale,
// which in Tailwind v4 resolves to CSS variables (--color-amber-50 … -950).
// By overriding those variables on a root container we re-tint the ENTIRE sheet
// for a class, while preserving amber's hand-tuned lightness/chroma curve so the
// dark theme and contrast stay intact — we only shift the hue (and, for greys,
// reduce the chroma).

export interface ClassTheme {
  name: string
  hue: number          // oklch hue to shift the amber scale to
  chroma: number       // chroma multiplier (1 = same as amber, <1 = greyer)
  accent: string       // resolved primary accent for inline use (header etc.)
  accentSoft: string   // translucent accent for gradients/glows
  glyph: string
}

// Amber's own oklch stops: [key, L%, C]. Hue is replaced per theme.
const AMBER_STOPS: [number, number, number][] = [
  [50,  98.7, 0.022],
  [100, 96.2, 0.059],
  [200, 92.4, 0.120],
  [300, 87.9, 0.169],
  [400, 82.8, 0.189],
  [500, 76.9, 0.188],
  [600, 66.6, 0.179],
  [700, 55.5, 0.163],
  [800, 47.3, 0.137],
  [900, 41.4, 0.112],
  [950, 27.9, 0.077],
]

const THEMES: Record<string, ClassTheme> = {
  barbarian: { name: 'Barbarian', hue: 28,  chroma: 1,    accent: '#dc2626', accentSoft: 'rgba(220,38,38,0.18)',  glyph: '🪓' },
  bard:      { name: 'Bard',      hue: 330, chroma: 1,    accent: '#d946ef', accentSoft: 'rgba(217,70,239,0.16)', glyph: '🎵' },
  cleric:    { name: 'Cleric',    hue: 95,  chroma: 1,    accent: '#eab308', accentSoft: 'rgba(234,179,8,0.16)',  glyph: '☀️' },
  druid:     { name: 'Druid',     hue: 148, chroma: 0.95, accent: '#16a34a', accentSoft: 'rgba(22,163,74,0.16)',  glyph: '🍃' },
  fighter:   { name: 'Fighter',   hue: 50,  chroma: 1,    accent: '#b45309', accentSoft: 'rgba(180,83,9,0.18)',   glyph: '⚔️' },
  monk:      { name: 'Monk',      hue: 232, chroma: 0.9,  accent: '#0ea5e9', accentSoft: 'rgba(14,165,233,0.16)', glyph: '✊' },
  paladin:   { name: 'Paladin',   hue: 100, chroma: 1,    accent: '#facc15', accentSoft: 'rgba(250,204,21,0.16)', glyph: '🛡️' },
  ranger:    { name: 'Ranger',    hue: 152, chroma: 0.9,  accent: '#15803d', accentSoft: 'rgba(21,128,61,0.18)',  glyph: '🏹' },
  rogue:     { name: 'Rogue',     hue: 265, chroma: 0.35, accent: '#94a3b8', accentSoft: 'rgba(148,163,184,0.16)',glyph: '🗡️' },
  sorcerer:  { name: 'Sorcerer',  hue: 18,  chroma: 1,    accent: '#e11d48', accentSoft: 'rgba(225,29,72,0.16)',  glyph: '🔥' },
  warlock:   { name: 'Warlock',   hue: 305, chroma: 1,    accent: '#9333ea', accentSoft: 'rgba(147,51,234,0.18)', glyph: '👁️' },
  wizard:    { name: 'Wizard',    hue: 262, chroma: 0.95, accent: '#3b82f6', accentSoft: 'rgba(59,130,246,0.18)', glyph: '✨' },
  artificer: { name: 'Artificer', hue: 188, chroma: 0.9,  accent: '#14b8a6', accentSoft: 'rgba(20,184,166,0.18)', glyph: '⚙️' },
}

export const DEFAULT_THEME: ClassTheme = {
  name: 'Adventurer',
  hue: 70,
  chroma: 1,
  accent: '#d97706',
  accentSoft: 'rgba(217,119,6,0.18)',
  glyph: '⚔',
}

export function themeForClass(className?: string): ClassTheme {
  if (!className) return DEFAULT_THEME
  const key = className.trim().toLowerCase().split(/[\s/(]/)[0]
  return THEMES[key] ?? DEFAULT_THEME
}

// Produce the CSS-variable overrides that re-tint the whole amber scale.
// Applied via inline style on the sheet's root container.
export function themeVars(theme: ClassTheme): React.CSSProperties {
  if (theme === DEFAULT_THEME) return {}   // leave amber untouched
  const vars: Record<string, string> = {}
  for (const [key, l, c] of AMBER_STOPS) {
    vars[`--color-amber-${key}`] = `oklch(${l}% ${(c * theme.chroma).toFixed(3)} ${theme.hue})`
  }
  return vars as React.CSSProperties
}
