import { useEffect, useState } from 'react'
import type { Character, ClassOptionPick } from '../types'
import { v4 as uuid } from '../uuid'
import { fetchOptionalFeatures, optionSlotsAt, type OptionalFeature } from '../data/classOptions'
import { OptionPicker } from './creator/ChoicePickers'

// PHB Sorcerer Metamagic: 2 options at level 3, 3 at 10, 4 at 17.
const METAMAGIC = [{ name: 'Metamagic', featureType: ['MM'], progression: { 3: 2, 10: 3, 17: 4 } }]

interface Props {
  char: Character
  onChange: (updates: Partial<Character>) => void
}

// PHB Font of Magic: sorcery-point cost to create a slot of each level (max 5th).
const CREATE_COST: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 }
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
export const SORCERY_POINTS = 'Sorcery Points'

export function isSorcerer(char: Character): boolean {
  return /sorcerer/i.test(char.class)
}

/** Twinned Spell costs the spell's level (1 for a cantrip); others have a fixed cost. */
function MetamagicRow({ opt, description, points, onSpend }: {
  opt: ClassOptionPick
  description?: string
  points: number
  onSpend: (n: number) => void
}) {
  const variable = opt.cost?.includes('-')
  const [lvl, setLvl] = useState(1)
  const cost = variable ? lvl : Number(opt.cost ?? 0)
  return (
    <div className="rounded-lg border border-fuchsia-900/50 bg-fuchsia-950/20">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <details className="flex-1 min-w-0">
          <summary className="cursor-pointer text-sm font-semibold text-fuchsia-100">
            {opt.name} <span className="text-[10px] text-fuchsia-300/70">{variable ? 'cost = spell level (cantrip: 1)' : `${opt.cost} pt`}</span>
          </summary>
          {description && <p className="text-xs text-amber-300/70 whitespace-pre-wrap mt-1">{description}</p>}
        </details>
        {variable && (
          <select value={lvl} onChange={e => setLvl(Number(e.target.value))}
            className="text-xs rounded border border-fuchsia-800/50 px-1 py-0.5"
            style={{ background: 'var(--color-amber-950)', color: 'var(--color-amber-200)' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <option key={n} value={n}>{n === 1 ? 'Cantrip / 1st' : ORD[n]}</option>)}
          </select>
        )}
        <button
          disabled={cost > points || cost <= 0}
          onClick={() => onSpend(cost)}
          className="shrink-0 px-2 py-0.5 rounded border border-fuchsia-700/60 text-fuchsia-200 text-xs font-bold hover:bg-fuchsia-800/40 disabled:opacity-30"
        >Spend {cost}</button>
      </div>
    </div>
  )
}

/** Catch-up picker for sorcerers whose Metamagic isn't on the sheet yet (e.g. made before it was tracked). */
function MetamagicCatchUp({ char, onChange, need, count }: Props & { need: number; count: number }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<OptionalFeature[] | null>(null)
  const [picks, setPicks] = useState<string[]>([])
  useEffect(() => { if (open && !opts) fetchOptionalFeatures().then(setOpts).catch(() => {}) }, [open, opts])
  const owned = (char.classOptions ?? []).filter(o => o.featureType === 'MM').map(o => `${o.name}|${o.source}`)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full px-3 py-2 rounded-lg border border-dashed border-fuchsia-600/60 text-fuchsia-200 text-xs font-bold hover:bg-fuchsia-900/30">
        ✦ Choose your Metamagic ({need} to pick: a level-{char.level} Sorcerer knows {count})
      </button>
    )
  }
  if (!opts) return <p className="text-xs text-fuchsia-300/70 animate-pulse">Loading Metamagic options…</p>
  return (
    <div className="space-y-2">
      <OptionPicker slot={{ name: 'Metamagic', featureTypes: ['MM'], count }} need={need} options={opts}
        picked={picks} owned={owned} onChange={setPicks}
        ctx={{ className: 'Sorcerer', level: char.level, subclass: char.subclass, pact: null, spells: [] }} />
      <div className="flex justify-end gap-2">
        <button onClick={() => { setOpen(false); setPicks([]) }} className="text-xs text-fuchsia-300/70 px-2">Cancel</button>
        <button disabled={picks.length < need}
          onClick={() => {
            const chosen = picks.map(k => opts.find(o => o.key === k)!)
            onChange({
              classOptions: [...(char.classOptions ?? []), ...chosen.map((o): ClassOptionPick => ({ featureType: 'MM', name: o.name, source: o.source, cost: o.cost }))],
              passiveTraits: [...char.passiveTraits, ...chosen.map(o => ({ id: uuid(), name: o.name, description: o.description }))],
            })
            setOpen(false); setPicks([])
          }}
          className="px-3 py-1 rounded bg-fuchsia-700/70 text-white text-xs font-bold disabled:opacity-30">Add to sheet</button>
      </div>
    </div>
  )
}

export default function SorceryPanel({ char, onChange }: Props) {
  if (!isSorcerer(char)) return null
  const tracker = char.activeFeatures.find(f => f.name === SORCERY_POINTS)
  const metamagic = (char.classOptions ?? []).filter(o => o.featureType === 'MM')
  const metamagicCount = optionSlotsAt(METAMAGIC, char.level)[0]?.count ?? 0

  if (!tracker) {
    if (char.level < 2) return null
    return (
      <div className="rounded-lg border border-fuchsia-800/50 bg-fuchsia-950/20 p-3 text-xs text-fuchsia-100/90 flex items-center justify-between gap-3">
        <span>Sorcerers get Sorcery Points from level 2 (one per Sorcerer level). This sheet doesn't track them yet.</span>
        <button
          onClick={() => onChange({ activeFeatures: [...char.activeFeatures, {
            id: uuid(), name: SORCERY_POINTS, actionType: 'special', maxUses: char.level, usesLeft: char.level, recharge: 'long',
            description: 'Font of Magic: you have sorcery points equal to your Sorcerer level. Spend them on Metamagic or convert them to and from spell slots. They return after a long rest.',
          }] })}
          className="shrink-0 px-2.5 py-1 rounded bg-fuchsia-700/60 hover:bg-fuchsia-600/70 text-white font-bold"
        >Add Sorcery Points tracker</button>
      </div>
    )
  }

  const points = tracker.usesLeft
  const max = tracker.maxUses
  const setPoints = (n: number) => onChange({
    activeFeatures: char.activeFeatures.map(f => f.id === tracker.id ? { ...f, usesLeft: Math.max(0, Math.min(max, n)) } : f),
  })

  function createSlot(level: number) {
    const s = char.spellSlots[level] ?? { max: 0, used: 0 }
    onChange({
      spellSlots: { ...char.spellSlots, [level]: { ...s, bonus: (s.bonus ?? 0) + 1 } },
      activeFeatures: char.activeFeatures.map(f => f.id === tracker!.id ? { ...f, usesLeft: points - CREATE_COST[level] } : f),
    })
  }
  function slotToPoints(level: number) {
    const s = char.spellSlots[level]
    onChange({
      spellSlots: { ...char.spellSlots, [level]: { ...s, used: s.used + 1 } },
      activeFeatures: char.activeFeatures.map(f => f.id === tracker!.id ? { ...f, usesLeft: points + level } : f),
    })
  }
  const available = (l: number) => {
    const s = char.spellSlots[l]
    return s ? s.max + (s.bonus ?? 0) - s.used : 0
  }
  const slotLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => available(l) > 0)

  return (
    <div className="rounded-xl border border-fuchsia-800/50 bg-fuchsia-950/15 p-3 space-y-3">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-fuchsia-300/80 font-bold">Sorcery Points</div>
          <div className="text-2xl font-bold text-fuchsia-100">{points}<span className="text-sm text-fuchsia-300/60"> / {max}</span></div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setPoints(points - 1)} disabled={points <= 0} className="w-7 h-7 rounded border border-fuchsia-700/60 text-fuchsia-200 disabled:opacity-30">−</button>
          <button onClick={() => setPoints(points + 1)} disabled={points >= max} className="w-7 h-7 rounded border border-fuchsia-700/60 text-fuchsia-200 disabled:opacity-30">+</button>
        </div>
        <div className="flex-1 h-2 bg-fuchsia-950 rounded-full overflow-hidden border border-fuchsia-900/60">
          <div className="h-full bg-fuchsia-500/70" style={{ width: `${max ? (points / max) * 100 : 0}%` }} />
        </div>
        <span className="text-[10px] text-fuchsia-300/60">Long rest refills</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-fuchsia-300/80 font-bold mb-1">Create a spell slot</div>
          <div className="flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5].map(l => (
              <button key={l} disabled={points < CREATE_COST[l]} onClick={() => createSlot(l)}
                title={`Spend ${CREATE_COST[l]} points for a ${ORD[l]}-level slot (gone after a long rest)`}
                className="px-2 py-1 rounded border border-fuchsia-700/50 text-xs text-fuchsia-100 hover:bg-fuchsia-800/40 disabled:opacity-25">
                {ORD[l]} <span className="text-fuchsia-300/70">−{CREATE_COST[l]}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-fuchsia-300/80 font-bold mb-1">Turn a slot into points</div>
          <div className="flex flex-wrap gap-1">
            {slotLevels.length === 0 && <span className="text-xs text-fuchsia-300/50">No slots left to convert.</span>}
            {slotLevels.map(l => (
              <button key={l} disabled={points + l > max} onClick={() => slotToPoints(l)}
                title={points + l > max ? `Would go over your maximum of ${max}` : `Expend a ${ORD[l]}-level slot for ${l} point${l > 1 ? 's' : ''}`}
                className="px-2 py-1 rounded border border-fuchsia-700/50 text-xs text-fuchsia-100 hover:bg-fuchsia-800/40 disabled:opacity-25">
                {ORD[l]} <span className="text-fuchsia-300/70">+{l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-fuchsia-300/80 font-bold mb-1">Metamagic</div>
        {metamagicCount === 0 && <p className="text-xs text-fuchsia-300/60">Sorcerers learn Metamagic at level 3.</p>}
        <div className="space-y-1">
          {metamagic.map(o => (
            <MetamagicRow key={o.name} opt={o} points={points} onSpend={n => setPoints(points - n)}
              description={char.passiveTraits.find(t => t.name === o.name)?.description} />
          ))}
          {metamagic.length < metamagicCount && (
            <MetamagicCatchUp char={char} onChange={onChange} need={metamagicCount - metamagic.length} count={metamagicCount} />
          )}
        </div>
      </div>
    </div>
  )
}
