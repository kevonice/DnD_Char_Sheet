import { useState } from 'react'
import type { CasterInfo, SpellOption } from '../../data/creatorLevels'
import { SectionLabel } from './ui'

export interface SpellPicks { cantrips: string[]; spells: string[]; racial: string[] }

interface Props {
  className: string
  level: number
  info: CasterInfo
  options: SpellOption[] | null
  error: string | null
  alwaysPrepared: string[]                     // lowercase names (domain / oath spells)
  racialChoice: { label: string; options: SpellOption[] } | null
  racialFixed: string[]
  picks: SpellPicks
  onPicks: (p: SpellPicks) => void
}

const ORD = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

function SpellList({ title, hint, count, options, picked, onChange, locked }: {
  title: string
  hint: string
  count: number
  options: SpellOption[]
  picked: string[]
  onChange: (keys: string[]) => void
  locked?: Set<string>
}) {
  const [query, setQuery] = useState('')
  const [lvl, setLvl] = useState<number | 'all'>('all')
  const levels = [...new Set(options.map(o => o.level))].sort((a, b) => a - b)
  const shown = options
    .filter(o => lvl === 'all' || o.level === lvl)
    .filter(o => !query || o.name.toLowerCase().includes(query.toLowerCase()))
  const full = picked.length >= count
  const remaining = count - picked.length

  return (
    <section className={`rounded-xl border p-3 md:p-4 ${remaining > 0 ? 'border-amber-500/50 bg-amber-900/10' : 'border-green-800/40 bg-green-950/10'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-bold text-amber-100">{title}</span>
        <span className={`text-sm font-bold ${remaining > 0 ? 'text-amber-400' : 'text-green-400'}`}>{remaining > 0 ? `${picked.length} / ${count}` : '✓ Done'}</span>
      </div>
      <p className="text-xs text-amber-400/70 mb-2">{hint}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
          className="flex-1 min-w-32 bg-amber-950/60 border border-amber-800/40 rounded-lg px-2 py-1 text-xs text-amber-100 placeholder:text-amber-800/60 focus:outline-none focus:border-amber-600" />
        {levels.length > 1 && (['all', ...levels] as const).map(l => (
          <button key={l} onClick={() => setLvl(l)}
            className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${lvl === l ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-500/70'}`}>
            {l === 'all' ? 'All' : ORD[l]}
          </button>
        ))}
      </div>
      <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
        {shown.map(o => {
          const isLocked = locked?.has(o.name.toLowerCase())
          const on = picked.includes(o.key)
          const disabled = isLocked || (!on && full)
          return (
            <div key={o.key} className={`rounded-lg border ${on || isLocked ? 'border-amber-500/60 bg-amber-600/15' : 'border-amber-900/40'}`}>
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <button
                  disabled={disabled}
                  onClick={() => onChange(on ? picked.filter(k => k !== o.key) : [...picked, o.key])}
                  className={`w-5 h-5 shrink-0 rounded border text-xs font-bold ${on || isLocked ? 'bg-amber-500/80 border-amber-400 text-amber-950' : 'border-amber-700/60 text-transparent'} disabled:cursor-not-allowed ${!on && !isLocked && full ? 'opacity-30' : ''}`}
                  title={isLocked ? 'Always prepared from your subclass' : undefined}
                >{isLocked ? '🔒' : '✓'}</button>
                <details className="flex-1 min-w-0">
                  <summary className="cursor-pointer list-none flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-amber-100">{o.name}</span>
                    <span className="text-[10px] text-amber-500/80">{ORD[o.level]}{o.school ? ` · ${o.school}` : ''}</span>
                    {o.concentration && <span className="text-[10px] text-blue-300/80">Concentration</span>}
                    {o.tag && <span className="text-[10px] px-1 rounded bg-purple-900/50 text-purple-200">{o.tag}</span>}
                    {o.source !== 'PHB' && <span className="text-[10px] text-amber-700/80 font-mono">{o.source}</span>}
                    <span className="text-[10px] text-amber-700/70">▾ details</span>
                  </summary>
                  <div className="text-xs text-amber-300/75 mt-1 space-y-1">
                    <p className="text-amber-500/80">{[o.castingTime, o.range, o.components, o.duration].filter(Boolean).join(' · ')}</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{o.description}</p>
                  </div>
                </details>
              </div>
            </div>
          )
        })}
        {shown.length === 0 && <p className="text-xs text-amber-600/70 text-center py-4">No spells match.</p>}
      </div>
    </section>
  )
}

export default function SpellStep(p: Props) {
  if (p.error) return <p className="text-red-400/80 text-sm">Couldn't load spells: {p.error}</p>
  if (!p.options) return <p className="text-amber-600/70 text-sm text-center py-10 animate-pulse">Loading the {p.className} spell list…</p>

  const locked = new Set(p.alwaysPrepared)
  const cantrips = p.options.filter(o => o.level === 0)
  const levelled = p.options.filter(o => o.level > 0 && !locked.has(o.name.toLowerCase()))
  // Domain/oath spells are often not on the class list itself, so name them directly.
  const alwaysNames = p.alwaysPrepared.map(n => n.replace(/\b\w/g, c => c.toUpperCase()))
  const { info } = p

  const spellTitle = info.mode === 'known' ? 'Spells known'
    : info.mode === 'spellbook' ? 'Spellbook'
    : 'Prepared spells'
  const spellHint = info.mode === 'known'
    ? `A ${p.className} knows a fixed set of spells and can swap one out each time they level up.`
    : info.mode === 'spellbook'
      ? `Wizards copy spells into a spellbook: 6 at level 1, plus 2 each level. Each day you prepare ${info.preparedLimit} of them; mark which on the Spells tab.`
      : `A ${p.className} can swap prepared spells after each long rest, so this is just today's choice. You can prepare ${info.spells} at level ${p.level}.`

  return (
    <div className="space-y-4">
      {info.maxSpellLevel > 0 && <p className="text-sm text-amber-300/80">
        At level {p.level} your {p.className} can cast spells up to <b className="text-amber-100">{ORD[info.maxSpellLevel]} level</b>
        {' '}({Object.entries(info.slots).filter(([, s]) => s.max).map(([l, s]) => `${s.max}× ${ORD[Number(l)]}`).join(', ')} slots).
      </p>}

      {(alwaysNames.length > 0 || p.racialFixed.length > 0) && (
        <div className="rounded-lg border border-purple-800/40 bg-purple-950/20 p-3">
          <SectionLabel>Already yours</SectionLabel>
          <p className="text-xs text-purple-100/90">{[...alwaysNames.map(n => `${n} (subclass, always prepared)`), ...p.racialFixed.map(n => `${n} (race)`)].join(', ')}</p>
        </div>
      )}

      {p.racialChoice && (
        <SpellList title={p.racialChoice.label} hint="A spell from your race, on top of your class spells."
          count={1} options={p.racialChoice.options} picked={p.picks.racial}
          onChange={racial => p.onPicks({ ...p.picks, racial })} />
      )}

      {info.cantrips > 0 && (
        <SpellList title="Cantrips" hint="Cantrips can be cast as often as you like, no spell slot needed."
          count={Math.min(info.cantrips, cantrips.length)} options={cantrips} picked={p.picks.cantrips}
          onChange={c => p.onPicks({ ...p.picks, cantrips: c })} />
      )}

      {info.spells > 0 && (
        <SpellList title={spellTitle} hint={spellHint}
          count={Math.min(info.spells, levelled.length)} options={levelled} picked={p.picks.spells}
          onChange={s => p.onPicks({ ...p.picks, spells: s })} />
      )}
    </div>
  )
}
