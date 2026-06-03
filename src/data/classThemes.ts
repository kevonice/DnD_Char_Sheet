// Per-class colour accents. The base sheet stays amber; these tint the most
// visible chrome (header banner, portrait ring, active tab) to match the class.

export interface ClassTheme {
  name: string
  accent: string       // primary accent (hex)
  accentSoft: string   // translucent version for gradients/glows
  glyph: string        // small emblem shown by the class name
}

// Keyed by lowercase class name. Falls back to the default amber theme.
const THEMES: Record<string, ClassTheme> = {
  barbarian: { name: 'Barbarian', accent: '#dc2626', accentSoft: 'rgba(220,38,38,0.18)',  glyph: '🪓' },
  bard:      { name: 'Bard',      accent: '#d946ef', accentSoft: 'rgba(217,70,239,0.16)', glyph: '🎵' },
  cleric:    { name: 'Cleric',    accent: '#eab308', accentSoft: 'rgba(234,179,8,0.16)',  glyph: '☀️' },
  druid:     { name: 'Druid',     accent: '#16a34a', accentSoft: 'rgba(22,163,74,0.16)',  glyph: '🍃' },
  fighter:   { name: 'Fighter',   accent: '#b45309', accentSoft: 'rgba(180,83,9,0.18)',   glyph: '⚔️' },
  monk:      { name: 'Monk',      accent: '#0ea5e9', accentSoft: 'rgba(14,165,233,0.16)', glyph: '✊' },
  paladin:   { name: 'Paladin',   accent: '#facc15', accentSoft: 'rgba(250,204,21,0.16)', glyph: '🛡️' },
  ranger:    { name: 'Ranger',    accent: '#15803d', accentSoft: 'rgba(21,128,61,0.18)',  glyph: '🏹' },
  rogue:     { name: 'Rogue',     accent: '#64748b', accentSoft: 'rgba(100,116,139,0.18)',glyph: '🗡️' },
  sorcerer:  { name: 'Sorcerer',  accent: '#e11d48', accentSoft: 'rgba(225,29,72,0.16)',  glyph: '🔥' },
  warlock:   { name: 'Warlock',   accent: '#9333ea', accentSoft: 'rgba(147,51,234,0.18)', glyph: '👁️' },
  wizard:    { name: 'Wizard',    accent: '#2563eb', accentSoft: 'rgba(37,99,235,0.18)',  glyph: '✨' },
  artificer: { name: 'Artificer', accent: '#0d9488', accentSoft: 'rgba(13,148,136,0.18)', glyph: '⚙️' },
}

export const DEFAULT_THEME: ClassTheme = {
  name: 'Adventurer',
  accent: '#d97706',
  accentSoft: 'rgba(217,119,6,0.18)',
  glyph: '⚔',
}

export function themeForClass(className?: string): ClassTheme {
  if (!className) return DEFAULT_THEME
  // Match on the first word so "Wizard (Evocation)" or "Fighter / Rogue" still resolve.
  const key = className.trim().toLowerCase().split(/[\s/(]/)[0]
  return THEMES[key] ?? DEFAULT_THEME
}
