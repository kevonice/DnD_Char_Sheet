// Pickers shared by the character creator and the sheet's Level-up screen.

import { useState } from 'react'
import type { AbilityScores } from '../../types'
import { ABILITY_KEYS, ABILITY_LABELS, SKILL_ABILITIES } from '../../utils'
import {
  checkFeatPrereq, checkPrereq,
  type AsiChoice, type FeatContext, type FeatOption, type OptionalFeature, type OptionSlot, type PrereqContext,
} from '../../data/classOptions'

const box = (done: boolean) =>
  `rounded-xl border p-3 md:p-4 ${done ? 'border-green-800/40 bg-green-950/10' : 'border-amber-500/50 bg-amber-900/10'}`

function Counter({ done, n, of }: { done: boolean; n: number; of: number }) {
  return <span className={`text-sm font-bold ${done ? 'text-green-400' : 'text-amber-400'}`}>{done ? '✓ Done' : `${n} / ${of}`}</span>
}

// ── Ability Score Improvement or feat ─────────────────────────────────────────

export function AsiPicker({ title, choice, onChange, scores, feats, featCtx, takenFeats, featOnly }: {
  title: string
  choice: AsiChoice
  onChange: (c: AsiChoice) => void
  scores: AbilityScores            // scores before this choice (cap at 20)
  feats: FeatOption[] | null
  featCtx: FeatContext
  takenFeats: string[]             // feat keys already chosen elsewhere
  featOnly?: boolean               // Variant Human / Custom Lineage
}) {
  const [query, setQuery] = useState('')
  const feat = feats?.find(f => f.key === choice.feat) ?? null
  const done = choice.mode === 'plus2' ? choice.abilities.length === 1
    : choice.mode === 'plus1x2' ? choice.abilities.length === 2
    : !!feat && (!feat.abilityChoice || !!choice.featAbility)
  const amount = choice.mode === 'plus2' ? 2 : 1
  const need = choice.mode === 'plus2' ? 1 : 2

  return (
    <section className={box(done)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-bold text-amber-100">{title}</span>
        <Counter done={done} n={0} of={1} />
      </div>
      {!featOnly && (
        <>
          <p className="text-xs text-amber-400/70 mb-2">Raise your scores (max 20), or trade the increase for a feat: a special talent.</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {([['plus2', '+2 to one ability'], ['plus1x2', '+1 to two abilities'], ['feat', 'Take a feat']] as const).map(([m, label]) => (
              <button key={m} onClick={() => onChange({ ...choice, mode: m, abilities: [] })}
                className={`px-3 py-1 rounded-lg border text-sm font-bold ${choice.mode === m ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-500/70'}`}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {choice.mode !== 'feat' ? (
        <div className="flex flex-wrap gap-1.5">
          {ABILITY_KEYS.map(k => {
            const on = choice.abilities.includes(k)
            const capped = scores[k] + amount > 20
            return (
              <button key={k}
                disabled={!on && (capped || choice.abilities.length >= need)}
                title={capped ? 'Already at 20' : undefined}
                onClick={() => onChange({ ...choice, abilities: on ? choice.abilities.filter(a => a !== k) : [...choice.abilities, k] })}
                className={`px-2.5 py-1 rounded-full border text-xs font-bold disabled:opacity-30 ${on ? 'bg-amber-600/40 border-amber-400/70 text-amber-50' : 'border-amber-700/50 text-amber-300/90'}`}>
                {on && '✓ '}{ABILITY_LABELS[k]} <span className="opacity-70">{scores[k]}{on ? ` → ${scores[k] + amount}` : ''}</span>
              </button>
            )
          })}
        </div>
      ) : !feats ? (
        <p className="text-xs text-amber-600/70 animate-pulse">Loading feats…</p>
      ) : (
        <>
          {feat?.abilityChoice && (
            <div className="mb-2">
              <div className="text-xs text-amber-200 mb-1">{feat.name}: +1 to one of these</div>
              <div className="flex flex-wrap gap-1.5">
                {feat.abilityChoice.map(k => (
                  <button key={k} disabled={scores[k] >= 20} onClick={() => onChange({ ...choice, featAbility: k })}
                    className={`px-2.5 py-1 rounded-full border text-xs font-bold disabled:opacity-30 ${choice.featAbility === k ? 'bg-amber-600/40 border-amber-400/70 text-amber-50' : 'border-amber-700/50 text-amber-300/90'}`}>
                    {choice.featAbility === k && '✓ '}{ABILITY_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search feats…"
            className="w-full mb-2 bg-amber-950/60 border border-amber-800/40 rounded-lg px-2 py-1 text-xs text-amber-100 placeholder:text-amber-800/60 focus:outline-none focus:border-amber-600" />
          <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
            {feats.filter(f => !query || f.name.toLowerCase().includes(query.toLowerCase())).map(f => {
              const pre = checkFeatPrereq(f, featCtx)
              const taken = takenFeats.includes(f.key) && f.key !== choice.feat
              const on = f.key === choice.feat
              const bonus = [...Object.entries(f.abilityFixed).map(([a, v]) => `+${v} ${a.toUpperCase()}`), ...(f.abilityChoice ? [`+1 ${f.abilityChoice.map(a => a.toUpperCase()).join('/')}`] : [])]
              return (
                <div key={f.key} className={`rounded-lg border ${on ? 'border-amber-500/60 bg-amber-600/15' : 'border-amber-900/40'}`}>
                  <div className="flex items-center gap-2 px-2.5 py-1.5">
                    <button disabled={(!pre.ok || taken) && !on}
                      onClick={() => onChange({ ...choice, feat: on ? null : f.key, featAbility: null })}
                      className={`w-5 h-5 shrink-0 rounded border text-xs font-bold disabled:opacity-25 ${on ? 'bg-amber-500/80 border-amber-400 text-amber-950' : 'border-amber-700/60 text-transparent'}`}>✓</button>
                    <details className="flex-1 min-w-0">
                      <summary className="cursor-pointer list-none flex flex-wrap items-baseline gap-x-2">
                        <span className={`text-sm font-semibold ${pre.ok ? 'text-amber-100' : 'text-amber-700'}`}>{f.name}</span>
                        {bonus.length > 0 && <span className="text-[10px] text-green-400/90">{bonus.join(', ')}</span>}
                        {f.source !== 'PHB' && <span className="text-[10px] text-amber-700/80 font-mono">{f.source}</span>}
                        {pre.text && <span className={`text-[10px] ${pre.ok ? 'text-amber-500/80' : 'text-red-400/80'}`}>Requires {pre.text}</span>}
                        {taken && <span className="text-[10px] text-amber-600">already taken</span>}
                      </summary>
                      <p className="text-xs text-amber-300/75 whitespace-pre-wrap leading-relaxed mt-1">{f.description}</p>
                    </details>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

// ── Class options: Metamagic, Invocations, Pact Boon, Fighting Style, Ranger ─

export function OptionPicker({ slot, need, options, picked, owned, onChange, ctx, intro }: {
  slot: OptionSlot
  need: number                     // how many to pick now
  options: OptionalFeature[]
  picked: string[]                 // keys picked now
  owned: string[]                  // keys the character already has (shown locked)
  onChange: (keys: string[]) => void
  ctx: PrereqContext
  intro?: string
}) {
  const list = options.filter(o => o.featureTypes.some(t => slot.featureTypes.includes(t)))
  const done = picked.length >= need
  return (
    <section className={box(done)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-bold text-amber-100">{slot.name}</span>
        <Counter done={done} n={picked.length} of={need} />
      </div>
      <p className="text-xs text-amber-400/70 mb-2">{intro ?? `Choose ${need}. Click a name to read what it does.`}</p>
      <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
        {list.map(o => {
          const isOwned = owned.includes(o.key)
          const on = picked.includes(o.key)
          const pre = checkPrereq(o.prerequisite, ctx)
          const disabled = isOwned || (!on && (!pre.ok || done))
          return (
            <div key={o.key} className={`rounded-lg border ${on || isOwned ? 'border-amber-500/60 bg-amber-600/15' : 'border-amber-900/40'}`}>
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <button disabled={disabled}
                  onClick={() => onChange(on ? picked.filter(k => k !== o.key) : [...picked, o.key])}
                  title={isOwned ? 'You already have this' : !pre.ok ? `Requires ${pre.text}` : undefined}
                  className={`w-5 h-5 shrink-0 rounded border text-xs font-bold ${on || isOwned ? 'bg-amber-500/80 border-amber-400 text-amber-950' : 'border-amber-700/60 text-transparent'} disabled:cursor-not-allowed ${!on && !isOwned && disabled ? 'opacity-25' : ''}`}>
                  {isOwned ? '🔒' : '✓'}
                </button>
                <details className="flex-1 min-w-0">
                  <summary className="cursor-pointer list-none flex flex-wrap items-baseline gap-x-2">
                    <span className={`text-sm font-semibold ${pre.ok || isOwned ? 'text-amber-100' : 'text-amber-700'}`}>{o.name}</span>
                    {o.cost && <span className="text-[10px] px-1 rounded bg-fuchsia-900/50 text-fuchsia-200">{o.cost.includes('-') ? 'spell level' : o.cost} sorcery pt{o.cost === '1' ? '' : 's'}</span>}
                    {o.source !== 'PHB' && <span className="text-[10px] text-amber-700/80 font-mono">{o.source}</span>}
                    {pre.text && <span className={`text-[10px] ${pre.ok ? 'text-amber-500/80' : 'text-red-400/80'}`}>Requires {pre.text}</span>}
                    <span className="text-[10px] text-amber-700/70">▾</span>
                  </summary>
                  <p className="text-xs text-amber-300/75 whitespace-pre-wrap leading-relaxed mt-1">{o.description}</p>
                </details>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Expertise ─────────────────────────────────────────────────────────────────

export function ExpertisePicker({ need, proficient, already, picked, onChange }: {
  need: number
  proficient: string[]             // skills (and "Thieves' tools" for Rogues) the character is proficient in
  already: string[]                // already has expertise
  picked: string[]
  onChange: (p: string[]) => void
}) {
  const done = picked.length >= need
  return (
    <section className={box(done)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-bold text-amber-100">Expertise</span>
        <Counter done={done} n={picked.length} of={need} />
      </div>
      <p className="text-xs text-amber-400/70 mb-2">Double your proficiency bonus for {need} things you're already proficient in.</p>
      <div className="flex flex-wrap gap-1.5">
        {proficient.map(s => {
          const has = already.includes(s)
          const on = picked.includes(s)
          return (
            <button key={s} disabled={has || (!on && done)}
              onClick={() => onChange(on ? picked.filter(x => x !== s) : [...picked, s])}
              className={`px-2.5 py-1 rounded-full border text-xs disabled:opacity-30 ${on || has ? 'bg-amber-600/40 border-amber-400/70 text-amber-50 font-bold' : 'border-amber-700/50 text-amber-300/90'}`}>
              {(on || has) && '✓ '}{s}{SKILL_ABILITIES[s] && <span className="ml-1 text-[9px] opacity-60">{SKILL_ABILITIES[s].toUpperCase()}</span>}
            </button>
          )
        })}
        {proficient.length === 0 && <span className="text-xs text-amber-600/70">Pick your skill proficiencies first.</span>}
      </div>
    </section>
  )
}

export function SectionNote({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-blue-800/40 bg-blue-950/20 p-3 text-xs text-blue-100/90">{children}</div>
}

