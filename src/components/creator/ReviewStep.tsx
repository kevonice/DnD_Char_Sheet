import type { Character, AbilityKey } from '../../types'
import type { Grants } from '../../data/creator2014'
import type { Picks } from '../../data/creatorBuild'
import { ABILITY_INFO } from '../../data/creatorPitches'
import { ABILITY_KEYS, ABILITY_LABELS, modifier } from '../../utils'
import { SectionLabel } from './ui'

interface Props {
  preview: Partial<Character>
  groups: Grants[]
  picks: Picks
  todo: string[]
  spellNames: string[]
}

const SOURCE_TITLE: Record<Grants['source'], string> = { race: 'Race', background: 'Background', class: 'Class' }
const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-lg bg-amber-950/50 border border-amber-900/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-amber-600/80">{label}</div>
      <div className="text-lg font-bold text-amber-100">{value}</div>
      {note && <div className="text-[10px] text-amber-600/70">{note}</div>}
    </div>
  )
}

export default function ReviewStep({ preview: c, groups, picks, todo, spellNames }: Props) {
  const abilities = c.abilities!
  return (
    <div className="space-y-5">
      <div>
        <div className="text-2xl font-bold text-amber-100">{c.name || 'Unnamed hero'}</div>
        <div className="text-sm text-amber-400/90">
          {[c.race, c.class].filter(Boolean).join(' ')}{c.background ? ` · ${c.background}` : ''}{c.alignment ? ` · ${c.alignment}` : ''}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ABILITY_KEYS.map((k: AbilityKey) => (
          <div key={k} className="rounded-xl border border-amber-800/40 bg-amber-950/50 text-center py-2" title={ABILITY_INFO[k].blurb}>
            <div className="text-[10px] uppercase tracking-widest text-amber-600/80">{k}</div>
            <div className="text-xl font-bold text-amber-100">{abilities[k]}</div>
            <div className="text-xs font-mono text-amber-400">{fmtMod(modifier(abilities[k]))}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Hit points" value={c.maxHp} note={`Level ${c.level} · ${c.hitDice} hit dice`} />
        <Stat label="Armor class" value={c.ac} note="Unarmored — equip armor on the sheet" />
        <Stat label="Speed" value={`${c.speed} ft`} />
        <Stat label="Spellcasting" value={c.spellcastingAbility ? ABILITY_LABELS[c.spellcastingAbility] : '—'} />
      </div>

      <div>
        <SectionLabel>Proficiencies by source</SectionLabel>
        <div className="grid md:grid-cols-3 gap-2">
          {groups.map(g => {
            const pickedOf = (kind: string) => g.choices.filter(ch => ch.kind === kind).flatMap(ch => picks[ch.id] ?? [])
            const rows: Array<[string, string[]]> = [
              ['Skills', [...g.skills, ...pickedOf('skill')]],
              ['Saves', g.saves.map(s => ABILITY_LABELS[s])],
              ['Languages', [...g.languages, ...pickedOf('language')]],
              ['Tools', [...g.tools, ...pickedOf('tool')]],
              ['Armor', g.armor],
              ['Weapons', g.weapons],
            ]
            const filled = rows.filter(([, xs]) => xs.length)
            return (
              <div key={g.source} className="rounded-lg border border-amber-800/30 bg-amber-950/30 p-2.5">
                <div className="text-xs font-bold text-amber-300 mb-1">{SOURCE_TITLE[g.source]}: {g.sourceLabel}</div>
                {filled.length === 0 && <p className="text-[11px] text-amber-700/70">Nothing automatic.</p>}
                {filled.map(([label, xs]) => (
                  <p key={label} className="text-[11px] text-amber-200/80"><span className="text-amber-500/80">{label}:</span> {xs.join(', ')}</p>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <SectionLabel>Equipment</SectionLabel>
          <p className="text-xs text-amber-200/80">
            {(c.inventory ?? []).map(i => i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name).join(', ') || '—'}
          </p>
          {(c.currency?.gp ?? 0) > 0 && <p className="text-xs text-amber-400/90 mt-1">💰 {c.currency!.gp} gp</p>}
        </div>
        <div>
          <SectionLabel>Traits &amp; features</SectionLabel>
          <p className="text-xs text-amber-200/80">{(c.passiveTraits ?? []).map(t => t.name).join(', ') || '—'}</p>
          <p className="text-[11px] text-amber-600/70 mt-1">Trackable class features (Second Wind, Rage…) are added when you create.</p>
        </div>
      </div>

      {spellNames.length > 0 && (
        <div>
          <SectionLabel>Spells{c.subclass ? ` · ${c.subclass}` : ''}</SectionLabel>
          <p className="text-xs text-amber-200/80">{spellNames.join(', ')}</p>
        </div>
      )}
      {!spellNames.length && c.subclass && <p className="text-sm text-amber-300"><span className="text-amber-500/80">Subclass:</span> {c.subclass}</p>}

      {(c.personalityTraits || c.ideals || c.bonds || c.flaws) && (
        <div>
          <SectionLabel>Personality</SectionLabel>
          <div className="grid md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-200/80">
            {c.personalityTraits && <p><span className="text-amber-500/80">Traits:</span> {c.personalityTraits.split('\n').join(' ')}</p>}
            {c.ideals && <p><span className="text-amber-500/80">Ideal:</span> {c.ideals}</p>}
            {c.bonds && <p><span className="text-amber-500/80">Bond:</span> {c.bonds}</p>}
            {c.flaws && <p><span className="text-amber-500/80">Flaw:</span> {c.flaws}</p>}
          </div>
        </div>
      )}

      {todo.length > 0 && (
        <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-3">
          <SectionLabel>Still to choose on your sheet</SectionLabel>
          <ul className="space-y-1">
            {todo.map(t => <li key={t} className="text-xs text-blue-200/90">☐ {t}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
