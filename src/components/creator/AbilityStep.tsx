import type { AbilityKey } from '../../types'
import type { Grants } from '../../data/creator2014'
import type { Picks } from '../../data/creatorBuild'
import { racialBonus } from '../../data/creatorBuild'
import { ABILITY_INFO, CLASS_PITCH } from '../../data/creatorPitches'
import { ABILITY_KEYS, modifier } from '../../utils'
import {
  POINT_BUDGET, POINT_COST, baseScores, pointsSpent, roll4d6, suggestAssignment, switchMethod,
  type AbilityMethod, type AbilityState,
} from './abilityMath'
import { SectionLabel } from './ui'

interface Props {
  state: AbilityState
  onChange: (s: AbilityState) => void
  race: Grants
  picks: Picks
  onPick: (choiceId: string, values: string[]) => void
  className: string | null
}

const METHODS: Array<{ key: AbilityMethod; label: string; blurb: string }> = [
  { key: 'array', label: 'Standard Array', blurb: 'Everyone gets the same six numbers — 15, 14, 13, 12, 10, 8 — and you decide where each one goes. Recommended for new players.' },
  { key: 'pointbuy', label: 'Point Buy', blurb: `Every ability starts at 8. Spend ${POINT_BUDGET} points to raise them (up to 15 before racial bonuses). Good for fine-tuning.` },
  { key: 'roll', label: 'Roll', blurb: 'Roll 4d6 and drop the lowest die, six times, then assign the results. Exciting but swingy — check that your DM allows it. Rolled real dice? Type your six numbers in.' },
]

const selectStyle = { background: 'var(--color-amber-950)', color: 'var(--color-amber-200)' }
const ROW = 'px-3 sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_3rem_3.5rem_3rem] sm:gap-x-4 sm:items-center'
const CELLS = 'grid grid-cols-[6rem_3rem_3.5rem_3rem] gap-x-2 items-center sm:contents'
const fmtMod = (score: number) => { const m = modifier(score); return m >= 0 ? `+${m}` : `${m}` }

export default function AbilityStep({ state, onChange, race, picks, onPick, className }: Props) {
  const base = baseScores(state)
  const bonus = racialBonus(race, picks)
  const pitch = className ? CLASS_PITCH[className] : undefined
  const keyAbilities = new Set(pitch?.priority.slice(0, 2) ?? [])
  const spent = pointsSpent(state)
  const usesPool = state.method !== 'pointbuy'
  const poolFull = state.pool.every(v => v != null)

  function setAssign(k: AbilityKey, idx: number | null) {
    const assign = { ...state.assign }
    // Taking a value another ability holds moves it here.
    if (idx != null) for (const other of ABILITY_KEYS) if (assign[other] === idx) assign[other] = null
    assign[k] = idx
    onChange({ ...state, assign })
  }

  function rollAll() {
    const results = Array.from({ length: 6 }, roll4d6)
    onChange({ ...state, pool: results.map(r => r.total), dice: results.map(r => r.dice), assign: Object.fromEntries(ABILITY_KEYS.map(k => [k, null])) as AbilityState['assign'] })
  }

  function setPoolValue(i: number, raw: string) {
    const n = raw === '' ? null : Math.max(3, Math.min(18, Number(raw)))
    const pool = [...state.pool]
    pool[i] = Number.isFinite(n as number) ? n : null
    onChange({ ...state, pool, dice: [] })
  }

  return (
    <div className="space-y-5">
      {/* Method picker */}
      <div>
        <div className="flex flex-wrap gap-1.5">
          {METHODS.map(m => (
            <button
              key={m.key}
              onClick={() => onChange(switchMethod(state, m.key))}
              className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${
                state.method === m.key ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-500/70 hover:text-amber-300'
              }`}
            >
              {m.label}{m.key === 'array' && <span className="ml-1 text-[10px] text-green-400/90">★</span>}
            </button>
          ))}
        </div>
        <p className="text-xs text-amber-400/70 mt-2 max-w-2xl">{METHODS.find(m => m.key === state.method)?.blurb}</p>
      </div>

      {/* Roll pool */}
      {state.method === 'roll' && (
        <div className="rounded-lg border border-amber-800/40 bg-amber-950/40 p-3">
          <div className="flex flex-wrap items-end gap-2">
            {state.pool.map((v, i) => (
              <div key={i} className="flex flex-col items-center">
                <input
                  type="number" min={3} max={18}
                  value={v ?? ''}
                  onChange={e => setPoolValue(i, e.target.value)}
                  className="w-14 bg-amber-950/70 border border-amber-800/50 rounded-lg py-1.5 text-center text-lg font-bold text-amber-100 focus:outline-none focus:border-amber-500"
                />
                {state.dice[i] && (
                  <span className="text-[10px] text-amber-600/80 mt-0.5 font-mono">
                    {state.dice[i].slice(0, 3).join(' ')} <s className="text-amber-800">{state.dice[i][3]}</s>
                  </span>
                )}
              </div>
            ))}
            <button onClick={rollAll} className="ml-auto px-3 py-2 rounded-lg bg-amber-700/50 hover:bg-amber-600/60 text-amber-100 text-sm font-bold">
              🎲 {poolFull ? 'Reroll all' : 'Roll 4d6 ×6'}
            </button>
          </div>
        </div>
      )}

      {/* Points left */}
      {state.method === 'pointbuy' && (
        <div className={`text-sm font-bold ${spent > POINT_BUDGET ? 'text-red-400' : 'text-amber-300'}`}>
          Points left: {POINT_BUDGET - spent} / {POINT_BUDGET}
        </div>
      )}

      {pitch && usesPool && poolFull && (
        <button
          onClick={() => onChange({ ...state, assign: suggestAssignment(state.pool, pitch.priority) })}
          className="text-xs px-3 py-1 rounded-full border border-green-700/50 text-green-300/90 hover:bg-green-900/30"
        >
          ✨ Suggest an assignment for a {className}
        </button>
      )}

      {/* Score table */}
      {/* Phones: name on its own line, controls beneath. sm+: one row (the inner
          grid becomes `contents`, so its cells join the row's grid). */}
      <div className="rounded-xl border border-amber-800/30 overflow-hidden">
        <div className={`${ROW} py-2 bg-amber-950/70 text-[10px] uppercase tracking-widest text-amber-600/80`}>
          <span className="hidden sm:block">Ability</span>
          <div className={CELLS}>
            <span className="text-center">Base</span><span className="text-center">Race</span><span className="text-center">Total</span><span className="text-center">Mod</span>
          </div>
        </div>
        {ABILITY_KEYS.map(k => {
          const b = base[k]
          const total = b == null ? null : b + bonus[k]
          return (
            <div key={k} className={`${ROW} py-2 border-t border-amber-900/40`}>
              <div className="min-w-0 mb-1 sm:mb-0">
                <div className="text-sm font-bold text-amber-100">
                  {ABILITY_INFO[k].name}
                  {keyAbilities.has(k) && <span title={`Important for a ${className}`} className="ml-1 text-amber-400">★</span>}
                </div>
                <div className="text-[11px] text-amber-500/60 leading-snug">{ABILITY_INFO[k].blurb}</div>
              </div>
              <div className={CELLS}>
              <div className="w-24 flex justify-center">
                {usesPool ? (
                  <select
                    value={state.assign[k] ?? ''}
                    onChange={e => setAssign(k, e.target.value === '' ? null : Number(e.target.value))}
                    style={selectStyle}
                    className="w-20 border border-amber-800/50 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="">—</option>
                    {state.pool.map((v, i) => v != null && (
                      <option key={i} value={i}>
                        {v}{Object.entries(state.assign).some(([o, idx]) => o !== k && idx === i) ? ' (in use)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onChange({ ...state, pointBuy: { ...state.pointBuy, [k]: state.pointBuy[k] - 1 } })}
                      disabled={state.pointBuy[k] <= 8}
                      className="w-6 h-6 rounded border border-amber-800/50 text-amber-300 disabled:opacity-25"
                    >−</button>
                    <span className="w-7 text-center text-sm font-bold text-amber-100">{state.pointBuy[k]}</span>
                    <button
                      onClick={() => onChange({ ...state, pointBuy: { ...state.pointBuy, [k]: state.pointBuy[k] + 1 } })}
                      disabled={state.pointBuy[k] >= 15 || POINT_COST[state.pointBuy[k] + 1] - POINT_COST[state.pointBuy[k]] > POINT_BUDGET - spent}
                      className="w-6 h-6 rounded border border-amber-800/50 text-amber-300 disabled:opacity-25"
                    >+</button>
                  </div>
                )}
              </div>
              <span className={`text-center text-sm ${bonus[k] ? 'text-green-400 font-bold' : 'text-amber-800'}`}>{bonus[k] ? `+${bonus[k]}` : '—'}</span>
              <span className="text-center text-lg font-bold text-amber-100">{total ?? '—'}</span>
              <span className="text-center text-sm font-mono text-amber-300">{total == null ? '' : fmtMod(total)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Racial bonus choices */}
      {(Object.keys(race.abilityFixed).length > 0 || race.abilityChoices.length > 0) && (
        <div className="rounded-xl border border-purple-800/40 bg-purple-950/20 p-3 space-y-3">
          <SectionLabel>From your race — {race.sourceLabel}</SectionLabel>
          {Object.keys(race.abilityFixed).length > 0 && (
            <p className="text-xs text-purple-200/80">
              Fixed: {Object.entries(race.abilityFixed).map(([k, v]) => `+${v} ${ABILITY_INFO[k as AbilityKey].name}`).join(', ')}
            </p>
          )}
          {race.abilityChoices.map(ch => {
            const picked = picks[ch.id] ?? []
            return (
              <div key={ch.id}>
                <p className="text-xs text-purple-200/90 mb-1.5">
                  Choose {ch.count} different abilit{ch.count === 1 ? 'y' : 'ies'} to get +{ch.amount}
                  <span className="ml-2 text-purple-400/80">{picked.length} / {ch.count}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ch.from.map(k => {
                    const on = picked.includes(k)
                    const full = picked.length >= ch.count
                    return (
                      <button
                        key={k}
                        disabled={!on && full}
                        onClick={() => onPick(ch.id, on ? picked.filter(x => x !== k) : [...picked, k])}
                        className={`px-2.5 py-1 rounded-full border text-xs font-bold transition-colors disabled:opacity-30 ${
                          on ? 'bg-purple-600/40 border-purple-400/70 text-purple-50' : 'border-purple-800/50 text-purple-300/80 hover:border-purple-500/60'
                        }`}
                      >
                        {on ? '✓ ' : ''}{ABILITY_INFO[k].name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
