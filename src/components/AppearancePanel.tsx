import { useState, useEffect, useRef } from 'react'
import { DEFAULT_THEME } from '../data/classThemes'
import type { ClassTheme } from '../data/classThemes'

// ── Colour math ───────────────────────────────────────────────────────────────

// Hex → { h (0-360), s (0-1), l (0-1) }
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.replace(/^#?([0-9a-f]{3})$/i, (_, c) =>
    c.split('').map((x: string) => x + x).join('')))
  if (!m) return null
  const r = parseInt(m[1].slice(0, 2), 16) / 255
  const g = parseInt(m[1].slice(2, 4), 16) / 255
  const b = parseInt(m[1].slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s, l }
}

// Rough HSL hue → oklch hue mapping (class themes use oklch so we need to
// approximate; this isn't perfect but gives a very reasonable result).
function hslHueToOklch(h: number): number {
  // Piecewise linear map derived from comparing oklch hue values of class themes
  // against their perceived HSL hue. Good enough for a colour picker.
  const map: [number, number][] = [
    [0, 30], [30, 60], [60, 100], [120, 148], [180, 195],
    [240, 262], [270, 300], [300, 330], [360, 390],
  ]
  for (let i = 0; i < map.length - 1; i++) {
    const [h0, o0] = map[i]
    const [h1, o1] = map[i + 1]
    if (h >= h0 && h <= h1) {
      return o0 + ((h - h0) / (h1 - h0)) * (o1 - o0)
    }
  }
  return h
}

function hexToAccentSoft(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 'rgba(217,119,6,0.18)'
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  return `rgba(${r},${g},${b},0.18)`
}

export function hexToThemeOverride(hex: string): { hue: number; chroma: number; accent: string } | null {
  const norm = hex.startsWith('#') ? hex : `#${hex}`
  const hsl = hexToHsl(norm)
  if (!hsl) return null
  const hue = hslHueToOklch(hsl.h)
  // Lower chroma for very desaturated colours
  const chroma = 0.6 + hsl.s * 0.4
  return { hue, chroma, accent: norm }
}

// Build a full ClassTheme from an override object
export function overrideToTheme(o: { hue: number; chroma: number; accent: string }): ClassTheme {
  return {
    name: 'Custom',
    hue: o.hue,
    chroma: o.chroma,
    accent: o.accent,
    accentSoft: hexToAccentSoft(o.accent),
    glyph: '🎨',
  }
}

// ── Preset catalogue (all class themes + default) ─────────────────────────────

export const PRESETS: { key: string; theme: ClassTheme }[] = [
  { key: 'default',   theme: { ...DEFAULT_THEME } },
  { key: 'barbarian', theme: { name:'Barbarian', hue:28,  chroma:1,    accent:'#dc2626', accentSoft:'rgba(220,38,38,0.18)',  glyph:'🪓' } },
  { key: 'bard',      theme: { name:'Bard',      hue:330, chroma:1,    accent:'#d946ef', accentSoft:'rgba(217,70,239,0.16)', glyph:'🎵' } },
  { key: 'cleric',    theme: { name:'Cleric',    hue:95,  chroma:1,    accent:'#eab308', accentSoft:'rgba(234,179,8,0.16)',  glyph:'☀️' } },
  { key: 'druid',     theme: { name:'Druid',     hue:148, chroma:0.95, accent:'#16a34a', accentSoft:'rgba(22,163,74,0.16)',  glyph:'🍃' } },
  { key: 'fighter',   theme: { name:'Fighter',   hue:50,  chroma:1,    accent:'#b45309', accentSoft:'rgba(180,83,9,0.18)',   glyph:'⚔️' } },
  { key: 'monk',      theme: { name:'Monk',      hue:232, chroma:0.9,  accent:'#0ea5e9', accentSoft:'rgba(14,165,233,0.16)', glyph:'✊' } },
  { key: 'paladin',   theme: { name:'Paladin',   hue:100, chroma:1,    accent:'#facc15', accentSoft:'rgba(250,204,21,0.16)', glyph:'🛡️' } },
  { key: 'ranger',    theme: { name:'Ranger',    hue:152, chroma:0.9,  accent:'#15803d', accentSoft:'rgba(21,128,61,0.18)',  glyph:'🏹' } },
  { key: 'rogue',     theme: { name:'Rogue',     hue:265, chroma:0.35, accent:'#94a3b8', accentSoft:'rgba(148,163,184,0.16)',glyph:'🗡️' } },
  { key: 'sorcerer',  theme: { name:'Sorcerer',  hue:18,  chroma:1,    accent:'#e11d48', accentSoft:'rgba(225,29,72,0.16)',  glyph:'🔥' } },
  { key: 'warlock',   theme: { name:'Warlock',   hue:305, chroma:1,    accent:'#9333ea', accentSoft:'rgba(147,51,234,0.18)', glyph:'👁️' } },
  { key: 'wizard',    theme: { name:'Wizard',    hue:262, chroma:0.95, accent:'#3b82f6', accentSoft:'rgba(59,130,246,0.18)', glyph:'✨' } },
  { key: 'artificer', theme: { name:'Artificer', hue:188, chroma:0.9,  accent:'#14b8a6', accentSoft:'rgba(20,184,166,0.18)', glyph:'⚙️' } },
]

// ── Solid dark colour presets ─────────────────────────────────────────────────

export const BG_PRESETS: { label: string; hex: string }[] = [
  { label: 'Obsidian',  hex: '#130e06' },
  { label: 'Midnight',  hex: '#07091a' },
  { label: 'Forest',    hex: '#061409' },
  { label: 'Void',      hex: '#0d0712' },
  { label: 'Crimson',   hex: '#140608' },
  { label: 'Slate',     hex: '#090d14' },
  { label: 'Pure Black',hex: '#000000' },
]

// ── CSS gradient presets (used as background-image) ───────────────────────────

export const GRADIENT_PRESETS: { label: string; emoji: string; css: string }[] = [
  { label: 'Candlelight',    emoji: '🕯️', css: 'radial-gradient(ellipse at 35% 75%, #2a1404 0%, #120800 55%, #050200 100%)' },
  { label: 'Deep Forest',    emoji: '🌲', css: 'radial-gradient(ellipse at 50% 100%, #0b2010 0%, #061008 55%, #010402 100%)' },
  { label: 'Graveyard Mist', emoji: '⚰️', css: 'radial-gradient(ellipse at 50% 80%, #0e1812 0%, #070d09 45%, #020503 100%), linear-gradient(to top, #0a1209 0%, #030705 100%)' },
  { label: 'Arcane Void',    emoji: '🔮', css: 'radial-gradient(ellipse at 50% 30%, #18082a 0%, #0b0318 60%, #030008 100%)' },
  { label: 'Blood Moon',     emoji: '🌑', css: 'radial-gradient(ellipse at 50% 5%, #2a0505 0%, #140202 55%, #040000 100%)' },
  { label: 'Storm Clouds',   emoji: '⛈️', css: 'radial-gradient(ellipse at 70% 15%, #08101e 0%, #040810 60%, #010204 100%)' },
  { label: 'Frozen Wastes',  emoji: '❄️', css: 'radial-gradient(ellipse at 50% 0%, #06101e 0%, #040c1a 60%, #010408 100%)' },
  { label: 'Ancient Parchment',emoji:'📜',css: 'radial-gradient(ellipse at 50% 50%, #1c1407 0%, #100b03 60%, #050300 100%)' },
]

// ── Component ─────────────────────────────────────────────────────────────────

type Override = { hue: number; chroma: number; accent: string; bgHex?: string; bgGradient?: string; bgBlur?: number; bgOverlay?: number }

interface Props {
  override: Override | null | undefined
  onChangeOverride: (o: Override | null) => void
  currentClassTheme: ClassTheme
  bgImage: string | null
  onBgImage: (img: string | null) => void
}

export default function AppearancePanel({ override, onChangeOverride, currentClassTheme, bgImage, onBgImage }: Props) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(override?.accent ?? '')
  const [hexError, setHexError] = useState(false)
  const [bgInput, setBgInput] = useState(override?.bgHex ?? '')
  const [bgError, setBgError] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Sync inputs when override changes externally
  useEffect(() => {
    setHexInput(override?.accent ?? '')
    setBgInput(override?.bgHex ?? '')
  }, [override?.accent, override?.bgHex])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Merge a partial change into the existing override, preserving other fields
  function mergeOverride(patch: Partial<Override>) {
    const base = override ?? { hue: currentClassTheme.hue, chroma: currentClassTheme.chroma, accent: currentClassTheme.accent }
    onChangeOverride({ ...base, ...patch })
  }

  function applyHex(raw: string) {
    const hex = raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`
    const result = hexToThemeOverride(hex)
    if (result) { setHexError(false); mergeOverride(result) }
    else setHexError(true)
  }

  function applyBg(raw: string) {
    const hex = raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`
    if (/^#[0-9a-f]{6}$/i.test(hex)) { setBgError(false); mergeOverride({ bgHex: hex }) }
    else setBgError(true)
  }

  // Preview swatch for custom input
  const previewOverride = hexToThemeOverride(hexInput.startsWith('#') ? hexInput : `#${hexInput}`)
  const previewTheme = previewOverride ? overrideToTheme(previewOverride) : null

  const activeAccent = override?.accent ?? currentClassTheme.accent
  const activeBg = override?.bgHex ?? '#130e06'

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        title="Appearance"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-900/50 text-amber-700/40 hover:border-amber-700/50 hover:text-amber-500 text-xs font-bold uppercase tracking-widest transition-colors"
      >
        🎨
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 z-[500] w-72 bg-[#1a0f05] border border-amber-800/40 rounded-xl shadow-2xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-amber-600/60 font-bold">Appearance</span>
            {override && (
              <button
                onClick={() => { onChangeOverride(null); setHexInput('') }}
                className="text-[9px] text-amber-700/50 hover:text-amber-400 underline decoration-dotted"
              >
                Reset to class theme
              </button>
            )}
          </div>

          {/* Preset swatches */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-amber-700/50 mb-2">Presets</p>
            <div className="grid grid-cols-7 gap-1.5">
              {PRESETS.map(({ key, theme }) => {
                  const isActive = activeAccent === theme.accent
                return (
                  <button
                    key={key}
                    title={theme.name}
                    onClick={() => {
                      if (key === 'default') {
                        onChangeOverride(null); setHexInput(''); setBgInput('')
                      } else {
                        mergeOverride({ hue: theme.hue, chroma: theme.chroma, accent: theme.accent })
                        setHexInput(theme.accent)
                      }
                    }}
                    className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center text-sm ${
                      isActive ? 'border-white/60 scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: theme.accent,
                      boxShadow: isActive ? `0 0 8px ${theme.accent}` : undefined,
                    }}
                  >
                    <span style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}>{theme.glyph}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Accent colour ── */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-amber-700/50 mb-2">Accent colour</p>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={override?.accent ?? '#d97706'}
                onChange={e => {
                  setHexInput(e.target.value)
                  const result = hexToThemeOverride(e.target.value)
                  if (result) { setHexError(false); mergeOverride(result) }
                }}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                value={hexInput}
                onChange={e => { setHexInput(e.target.value); setHexError(false) }}
                onBlur={() => hexInput && applyHex(hexInput)}
                onKeyDown={e => e.key === 'Enter' && applyHex(hexInput)}
                placeholder="#d97706"
                maxLength={7}
                className={`flex-1 bg-amber-950/40 border rounded px-2 py-1 text-xs font-mono text-amber-200 focus:outline-none transition-colors ${
                  hexError ? 'border-red-500/60 text-red-400' : 'border-amber-800/40 focus:border-amber-600/60'
                }`}
              />
              {previewTheme && (
                <div className="w-6 h-6 rounded-md border border-white/20 flex-shrink-0" style={{ backgroundColor: previewTheme.accent }} />
              )}
            </div>
            {hexError && <p className="text-[10px] text-red-400/70 mt-1">Enter a valid hex colour, e.g. #ff6b35</p>}
          </div>

          {/* ── Background colour (solid) ── */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-amber-700/50 mb-2">Base background colour</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {BG_PRESETS.map(({ label, hex }) => (
                <button key={hex} title={label}
                  onClick={() => { mergeOverride({ bgHex: hex }); setBgInput(hex) }}
                  className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${activeBg === hex ? 'border-white/60 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input type="color" value={activeBg}
                onChange={e => { setBgInput(e.target.value); mergeOverride({ bgHex: e.target.value }) }}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input value={bgInput} onChange={e => { setBgInput(e.target.value); setBgError(false) }}
                onBlur={() => bgInput && applyBg(bgInput)} onKeyDown={e => e.key === 'Enter' && applyBg(bgInput)}
                placeholder="#130e06" maxLength={7}
                className={`flex-1 bg-amber-950/40 border rounded px-2 py-1 text-xs font-mono text-amber-200 focus:outline-none transition-colors ${bgError ? 'border-red-500/60 text-red-400' : 'border-amber-800/40 focus:border-amber-600/60'}`}
              />
            </div>
            {bgError && <p className="text-[10px] text-red-400/70 mt-1">Enter a valid hex colour, e.g. #07091a</p>}
          </div>

          {/* ── Background image / gradient ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] uppercase tracking-widest text-amber-700/50">Background scene</p>
              {(bgImage || override?.bgGradient) && (
                <button onClick={() => { onBgImage(null); mergeOverride({ bgGradient: undefined }) }}
                  className="text-[9px] text-amber-700/50 hover:text-red-400 underline decoration-dotted">
                  Clear
                </button>
              )}
            </div>

            {/* Gradient presets */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {GRADIENT_PRESETS.map(({ label, emoji, css }) => {
                const active = override?.bgGradient === css && !bgImage
                return (
                  <button key={label} title={label}
                    onClick={() => { onBgImage(null); mergeOverride({ bgGradient: css }) }}
                    className={`h-10 rounded-lg border-2 text-sm transition-all hover:scale-105 overflow-hidden ${active ? 'border-white/60 scale-105' : 'border-transparent'}`}
                    style={{ backgroundImage: css }}
                  >
                    <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>{emoji}</span>
                  </button>
                )
              })}
            </div>

            {/* Image upload */}
            <label className="flex items-center gap-2 px-3 py-2 bg-amber-950/40 border border-dashed border-amber-800/40 rounded-lg cursor-pointer hover:border-amber-600/50 transition-colors">
              <span className="text-xs text-amber-600/60">{bgImage ? '✓ Image set — click to replace' : '↑ Upload your own image'}</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => {
                    onBgImage(ev.target?.result as string)
                    mergeOverride({ bgGradient: undefined })
                  }
                  reader.readAsDataURL(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          {/* ── Blur & overlay sliders ── */}
          {(bgImage || override?.bgGradient) && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-widest text-amber-700/50">Blur</span>
                  <span className="text-[9px] text-amber-700/40">{override?.bgBlur ?? 12}px</span>
                </div>
                <input type="range" min={0} max={20} step={1} value={override?.bgBlur ?? 12}
                  onChange={e => mergeOverride({ bgBlur: Number(e.target.value) })}
                  className="w-full accent-amber-500 h-1"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-widest text-amber-700/50">Darkness overlay</span>
                  <span className="text-[9px] text-amber-700/40">{Math.round((override?.bgOverlay ?? 0.6) * 100)}%</span>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={override?.bgOverlay ?? 0.6}
                  onChange={e => mergeOverride({ bgOverlay: Number(e.target.value) })}
                  className="w-full accent-amber-500 h-1"
                />
              </div>
            </div>
          )}

          <p className="text-[9px] text-amber-800/50">Use colour picker or type any hex code. Press Enter to apply.</p>
        </div>
      )}
    </div>
  )
}
