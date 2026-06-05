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

// Subclass overrides — keyed by lowercase subclass name fragments.
// Only thematically distinct subclasses need entries; others fall back to class theme.
const SUBCLASS_THEMES: Record<string, ClassTheme> = {
  // ── Cleric ──────────────────────────────────────────────────────────────────
  'death':        { name:'Death Domain',    hue:148, chroma:0.45, accent:'#4ade80', accentSoft:'rgba(74,222,128,0.14)', glyph:'💀' },
  'grave':        { name:'Grave Domain',    hue:200, chroma:0.35, accent:'#94a3b8', accentSoft:'rgba(148,163,184,0.14)',glyph:'⚰️' },
  'trickery':     { name:'Trickery Domain', hue:275, chroma:0.8,  accent:'#a855f7', accentSoft:'rgba(168,85,247,0.16)', glyph:'🎭' },
  'tempest':      { name:'Tempest Domain',  hue:220, chroma:0.9,  accent:'#60a5fa', accentSoft:'rgba(96,165,250,0.16)', glyph:'⛈️' },
  'war':          { name:'War Domain',      hue:15,  chroma:1,    accent:'#dc2626', accentSoft:'rgba(220,38,38,0.18)',  glyph:'⚔️' },
  'light':        { name:'Light Domain',    hue:75,  chroma:1,    accent:'#fde68a', accentSoft:'rgba(253,230,138,0.2)', glyph:'☀️' },
  'nature':       { name:'Nature Domain',   hue:148, chroma:0.95, accent:'#16a34a', accentSoft:'rgba(22,163,74,0.16)',  glyph:'🌿' },
  'knowledge':    { name:'Knowledge Domain',hue:240, chroma:0.85, accent:'#818cf8', accentSoft:'rgba(129,140,248,0.16)',glyph:'📚' },
  'arcana':       { name:'Arcana Domain',   hue:262, chroma:0.95, accent:'#3b82f6', accentSoft:'rgba(59,130,246,0.18)', glyph:'✨' },
  'forge':        { name:'Forge Domain',    hue:30,  chroma:0.9,  accent:'#f97316', accentSoft:'rgba(249,115,22,0.18)', glyph:'🔨' },
  'order':        { name:'Order Domain',    hue:210, chroma:0.8,  accent:'#38bdf8', accentSoft:'rgba(56,189,248,0.16)', glyph:'⚖️' },
  'twilight':     { name:'Twilight Domain', hue:255, chroma:0.7,  accent:'#c084fc', accentSoft:'rgba(192,132,252,0.16)',glyph:'🌙' },
  'peace':        { name:'Peace Domain',    hue:340, chroma:0.7,  accent:'#f9a8d4', accentSoft:'rgba(249,168,212,0.16)',glyph:'🕊️' },

  // ── Paladin ──────────────────────────────────────────────────────────────────
  'vengeance':    { name:'Oath of Vengeance', hue:220, chroma:0.5,  accent:'#64748b', accentSoft:'rgba(100,116,139,0.18)',glyph:'⚖️' },
  'conquest':     { name:'Oath of Conquest',  hue:10,  chroma:0.9,  accent:'#b91c1c', accentSoft:'rgba(185,28,28,0.18)',  glyph:'🗡️' },
  'oathbreaker':  { name:'Oathbreaker',        hue:285, chroma:0.4,  accent:'#7c3aed', accentSoft:'rgba(124,58,237,0.18)', glyph:'💔' },
  'ancients':     { name:'Oath of Ancients',   hue:148, chroma:0.95, accent:'#22c55e', accentSoft:'rgba(34,197,94,0.18)',  glyph:'🌳' },
  'glory':        { name:'Oath of Glory',      hue:55,  chroma:1,    accent:'#fbbf24', accentSoft:'rgba(251,191,36,0.18)', glyph:'🏆' },
  'watchers':     { name:'Oath of the Watchers',hue:200,chroma:0.8,  accent:'#38bdf8', accentSoft:'rgba(56,189,248,0.16)', glyph:'👁️' },

  // ── Warlock ──────────────────────────────────────────────────────────────────
  'fiend':        { name:'The Fiend',          hue:15,  chroma:1,    accent:'#dc2626', accentSoft:'rgba(220,38,38,0.2)',   glyph:'😈' },
  'great old one':{ name:'Great Old One',      hue:175, chroma:0.6,  accent:'#2dd4bf', accentSoft:'rgba(45,212,191,0.16)', glyph:'🐙' },
  'archfey':      { name:'The Archfey',        hue:330, chroma:0.9,  accent:'#e879f9', accentSoft:'rgba(232,121,249,0.16)',glyph:'🧚' },
  'undying':      { name:'The Undying',        hue:140, chroma:0.3,  accent:'#6b7280', accentSoft:'rgba(107,114,128,0.16)',glyph:'💀' },
  'hexblade':     { name:'The Hexblade',       hue:240, chroma:0.3,  accent:'#94a3b8', accentSoft:'rgba(148,163,184,0.16)',glyph:'🗡️' },
  'celestial':    { name:'The Celestial',      hue:70,  chroma:1,    accent:'#fde68a', accentSoft:'rgba(253,230,138,0.2)', glyph:'☀️' },
  'fathomless':   { name:'The Fathomless',     hue:210, chroma:0.85, accent:'#0ea5e9', accentSoft:'rgba(14,165,233,0.18)', glyph:'🌊' },
  'genie':        { name:'The Genie',          hue:45,  chroma:1,    accent:'#f59e0b', accentSoft:'rgba(245,158,11,0.18)', glyph:'🧞' },

  // ── Wizard ──────────────────────────────────────────────────────────────────
  'necromancy':   { name:'School of Necromancy', hue:148, chroma:0.4, accent:'#4ade80', accentSoft:'rgba(74,222,128,0.12)',glyph:'💀' },
  'illusion':     { name:'School of Illusion',   hue:285, chroma:0.9, accent:'#c084fc', accentSoft:'rgba(192,132,252,0.18)',glyph:'🔮' },
  'evocation':    { name:'School of Evocation',  hue:55,  chroma:1,   accent:'#fbbf24', accentSoft:'rgba(251,191,36,0.2)', glyph:'⚡' },
  'abjuration':   { name:'School of Abjuration', hue:220, chroma:0.6, accent:'#93c5fd', accentSoft:'rgba(147,197,253,0.16)',glyph:'🛡️' },
  'conjuration':  { name:'School of Conjuration',hue:195, chroma:0.9, accent:'#22d3ee', accentSoft:'rgba(34,211,238,0.16)',glyph:'🌀' },
  'enchantment':  { name:'School of Enchantment',hue:340, chroma:0.8, accent:'#fb7185', accentSoft:'rgba(251,113,133,0.16)',glyph:'💕' },
  'divination':   { name:'School of Divination', hue:255, chroma:0.85,accent:'#a78bfa', accentSoft:'rgba(167,139,250,0.18)',glyph:'🔭' },
  'transmutation':{ name:'School of Transmutation',hue:35,chroma:1,   accent:'#fb923c', accentSoft:'rgba(251,146,60,0.18)', glyph:'⚗️' },
  'chronurgy':    { name:'Chronurgy Magic',      hue:200, chroma:0.7, accent:'#67e8f9', accentSoft:'rgba(103,232,249,0.16)',glyph:'⏳' },
  'graviturgy':   { name:'Graviturgy Magic',     hue:270, chroma:0.5, accent:'#a855f7', accentSoft:'rgba(168,85,247,0.16)', glyph:'🌌' },

  // ── Druid ────────────────────────────────────────────────────────────────────
  'moon':         { name:'Circle of the Moon',  hue:225, chroma:0.7, accent:'#93c5fd', accentSoft:'rgba(147,197,253,0.16)',glyph:'🌙' },
  'spores':       { name:'Circle of Spores',    hue:90,  chroma:0.5, accent:'#a3e635', accentSoft:'rgba(163,230,53,0.16)', glyph:'🍄' },
  'stars':        { name:'Circle of Stars',     hue:240, chroma:0.8, accent:'#818cf8', accentSoft:'rgba(129,140,248,0.18)',glyph:'⭐' },
  'wildfire':     { name:'Circle of Wildfire',  hue:20,  chroma:1,   accent:'#f97316', accentSoft:'rgba(249,115,22,0.18)', glyph:'🔥' },

  // ── Ranger ───────────────────────────────────────────────────────────────────
  'gloom stalker':{ name:'Gloom Stalker',        hue:265, chroma:0.35,accent:'#94a3b8', accentSoft:'rgba(148,163,184,0.14)',glyph:'🌑' },
  'fey wanderer': { name:'Fey Wanderer',         hue:330, chroma:0.85,accent:'#e879f9', accentSoft:'rgba(232,121,249,0.16)',glyph:'🧚' },
  'swarmkeeper':  { name:'Swarmkeeper',           hue:80,  chroma:0.8, accent:'#a3e635', accentSoft:'rgba(163,230,53,0.16)', glyph:'🐝' },
  'drakewarden':  { name:'Drakewarden',           hue:25,  chroma:0.9, accent:'#fb923c', accentSoft:'rgba(251,146,60,0.18)', glyph:'🐉' },

  // ── Sorcerer ─────────────────────────────────────────────────────────────────
  'draconic':     { name:'Draconic Bloodline',   hue:35,  chroma:1,   accent:'#f59e0b', accentSoft:'rgba(245,158,11,0.18)', glyph:'🐉' },
  'shadow magic': { name:'Shadow Magic',         hue:270, chroma:0.25,accent:'#6b7280', accentSoft:'rgba(107,114,128,0.14)',glyph:'🌑' },
  'storm sorcery':{ name:'Storm Sorcery',        hue:220, chroma:0.9, accent:'#60a5fa', accentSoft:'rgba(96,165,250,0.18)', glyph:'⛈️' },
  'wild magic':   { name:'Wild Magic',           hue:330, chroma:1,   accent:'#f472b6', accentSoft:'rgba(244,114,182,0.18)',glyph:'🎲' },
  'aberrant mind':{ name:'Aberrant Mind',        hue:175, chroma:0.6, accent:'#2dd4bf', accentSoft:'rgba(45,212,191,0.16)', glyph:'🧠' },
  'clockwork soul':{ name:'Clockwork Soul',      hue:200, chroma:0.6, accent:'#67e8f9', accentSoft:'rgba(103,232,249,0.16)',glyph:'⚙️' },

  // ── Monk ─────────────────────────────────────────────────────────────────────
  'shadow':       { name:'Way of Shadow',        hue:265, chroma:0.3, accent:'#6b7280', accentSoft:'rgba(107,114,128,0.14)',glyph:'🌑' },
  'sun soul':     { name:'Way of the Sun Soul',  hue:40,  chroma:1,   accent:'#fbbf24', accentSoft:'rgba(251,191,36,0.2)', glyph:'☀️' },
  'long death':   { name:'Way of the Long Death',hue:140, chroma:0.35,accent:'#4ade80', accentSoft:'rgba(74,222,128,0.12)',glyph:'💀' },
  'astral self':  { name:'Way of the Astral Self',hue:255,chroma:0.75,accent:'#a78bfa', accentSoft:'rgba(167,139,250,0.18)',glyph:'✨' },
  'four elements':{ name:'Way of Four Elements', hue:35,  chroma:0.9, accent:'#f97316', accentSoft:'rgba(249,115,22,0.18)', glyph:'🔥' },

  // ── Barbarian ────────────────────────────────────────────────────────────────
  'berserker':    { name:'Path of the Berserker',hue:10,  chroma:1,   accent:'#dc2626', accentSoft:'rgba(220,38,38,0.2)',   glyph:'😡' },
  'totem warrior':{ name:'Path of the Totem',    hue:30,  chroma:0.7, accent:'#92400e', accentSoft:'rgba(146,64,14,0.2)',   glyph:'🐻' },
  'zealot':       { name:'Path of the Zealot',   hue:55,  chroma:1,   accent:'#fbbf24', accentSoft:'rgba(251,191,36,0.2)',  glyph:'⚡' },
  'ancestral guardian':{ name:'Ancestral Guardian',hue:200,chroma:0.7,accent:'#38bdf8', accentSoft:'rgba(56,189,248,0.16)', glyph:'👻' },

  // ── Rogue ────────────────────────────────────────────────────────────────────
  'assassin':     { name:'Assassin',             hue:10,  chroma:0.6, accent:'#dc2626', accentSoft:'rgba(220,38,38,0.16)',  glyph:'🗡️' },
  'arcane trickster':{ name:'Arcane Trickster',  hue:275, chroma:0.75,accent:'#a855f7', accentSoft:'rgba(168,85,247,0.16)', glyph:'🔮' },
  'phantom':      { name:'Phantom',              hue:200, chroma:0.3, accent:'#67e8f9', accentSoft:'rgba(103,232,249,0.14)',glyph:'👻' },
  'soulknife':    { name:'Soulknife',            hue:310, chroma:0.7, accent:'#e879f9', accentSoft:'rgba(232,121,249,0.16)',glyph:'🔪' },

  // ── Fighter ──────────────────────────────────────────────────────────────────
  'eldritch knight':{ name:'Eldritch Knight',    hue:240, chroma:0.8, accent:'#60a5fa', accentSoft:'rgba(96,165,250,0.18)', glyph:'⚔️' },
  'psi warrior':  { name:'Psi Warrior',          hue:255, chroma:0.75,accent:'#a78bfa', accentSoft:'rgba(167,139,250,0.18)',glyph:'🧠' },
  'rune knight':  { name:'Rune Knight',          hue:200, chroma:0.7, accent:'#38bdf8', accentSoft:'rgba(56,189,248,0.16)', glyph:'🔮' },

  // ── Bard ─────────────────────────────────────────────────────────────────────
  'glamour':      { name:'College of Glamour',   hue:340, chroma:0.9, accent:'#f472b6', accentSoft:'rgba(244,114,182,0.18)',glyph:'💃' },
  'whispers':     { name:'College of Whispers',  hue:275, chroma:0.5, accent:'#a855f7', accentSoft:'rgba(168,85,247,0.14)', glyph:'🤫' },
  'spirits':      { name:'College of Spirits',   hue:200, chroma:0.4, accent:'#67e8f9', accentSoft:'rgba(103,232,249,0.14)',glyph:'👻' },
  'creation':     { name:'College of Creation',  hue:330, chroma:0.7, accent:'#e879f9', accentSoft:'rgba(232,121,249,0.16)',glyph:'🎨' },
}

export function themeForClass(className?: string): ClassTheme {
  if (!className) return DEFAULT_THEME
  const key = className.trim().toLowerCase().split(/[\s/(]/)[0]
  return THEMES[key] ?? DEFAULT_THEME
}

export function themeForClassAndSubclass(className?: string, subclassName?: string): ClassTheme {
  const baseTheme = themeForClass(className)
  if (!subclassName) return baseTheme
  const sub = subclassName.trim().toLowerCase()
  // Try progressively shorter prefix matches so "School of Evocation" matches "evocation"
  for (const [key, theme] of Object.entries(SUBCLASS_THEMES)) {
    if (sub === key || sub.includes(key) || key.includes(sub)) return theme
  }
  return baseTheme
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

// Dark-stop overrides from a background hex colour.
// Replaces only the 700-950 stops so dark panels shift independently of accent.
export function bgVars(bgHex: string): React.CSSProperties {
  const m = /^#?([0-9a-f]{6})$/i.exec(bgHex)
  if (!m) return {}
  const r = parseInt(m[1].slice(0, 2), 16) / 255
  const g = parseInt(m[1].slice(2, 4), 16) / 255
  const b = parseInt(m[1].slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  const hslHue = h * 360
  const map: [number, number][] = [
    [0,30],[30,60],[60,100],[120,148],[180,195],[240,262],[270,300],[300,330],[360,390],
  ]
  let oklchHue = hslHue
  for (let i = 0; i < map.length - 1; i++) {
    const [h0, o0] = map[i]; const [h1, o1] = map[i + 1]
    if (hslHue >= h0 && hslHue <= h1) { oklchHue = o0 + ((hslHue - h0) / (h1 - h0)) * (o1 - o0); break }
  }
  const sat = max === 0 ? 0 : d / max
  const chroma = sat * 0.08  // keep dark stops subtly tinted, never vivid
  const darkStops: [number, number, number][] = [
    [700, 55.5, chroma], [800, 47.3, chroma * 0.9],
    [900, 41.4, chroma * 0.8], [950, 27.9, chroma * 0.6],
  ]
  const vars: Record<string, string> = {}
  for (const [key, l, c] of darkStops) {
    vars[`--color-amber-${key}`] = `oklch(${l}% ${c.toFixed(3)} ${oklchHue})`
  }
  return vars as React.CSSProperties
}
