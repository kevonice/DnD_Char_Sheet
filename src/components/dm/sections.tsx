// Read-only views of one part of a character sheet, for the DM's compare board.

import type { Character, NoteNode } from '../../types'
import type { SectionKey } from '../../data/dmStore'
import {
  ABILITY_KEYS, ABILITY_LABELS, ALL_SKILLS, SKILL_ABILITIES, modStr, passivePerception, proficiencyBonus,
  saveBonus, skillBonus, skillBonusStr, spellAttackBonus, spellSaveDC,
} from '../../utils'

export const SECTIONS: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: 'overview', label: 'Overview & HP', icon: '❤️' },
  { key: 'spells', label: 'Spell slots & spells', icon: '✨' },
  { key: 'equipment', label: 'Equipment & coin', icon: '🎒' },
  { key: 'background', label: 'Background & personality', icon: '📜' },
  { key: 'features', label: 'Features & feats', icon: '⚔️' },
  { key: 'abilities', label: 'Abilities & saves', icon: '💪' },
  { key: 'skills', label: 'Skills', icon: '🎯' },
  { key: 'proficiencies', label: 'Proficiencies & languages', icon: '🛠️' },
  { key: 'notes', label: 'Notes', icon: '📝' },
]

const ORD = ['Cantrips', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-amber-600/80 font-bold mt-2 mb-1 first:mt-0">{children}</div>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-amber-700/70 italic">{children}</p>
}
function Pips({ left, max, bonus = 0 }: { left: number; max: number; bonus?: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {Array.from({ length: Math.min(max + bonus, 20) }).map((_, i) => (
        <span key={i} className={`w-2.5 h-2.5 rounded-sm border ${i < left ? (i >= max ? 'bg-fuchsia-400 border-fuchsia-300' : 'bg-amber-400 border-amber-300') : 'border-amber-800/60'}`} />
      ))}
    </span>
  )
}

function Overview({ c }: { c: Character }) {
  const pct = c.maxHp > 0 ? Math.max(0, Math.min(1, c.currentHp / c.maxHp)) : 0
  const pp = passivePerception(c.abilities, c.skills.Perception ?? { proficient: false, expertise: false }, c.level)
  return (
    <div className="space-y-2 text-xs">
      <div className="text-amber-300/90">{[c.race, c.class, c.subclass && `(${c.subclass})`].filter(Boolean).join(' ')} · Level {c.level}</div>
      <div>
        <div className="flex justify-between text-amber-200"><span>HP</span><span className="font-mono">{c.currentHp}/{c.maxHp}{c.tempHp ? ` +${c.tempHp}` : ''}</span></div>
        <div className="h-2 bg-amber-950 rounded-full overflow-hidden border border-amber-900/60 mt-0.5">
          <div className={`h-full ${pct > 0.5 ? 'bg-green-500/70' : pct > 0.25 ? 'bg-yellow-500/70' : 'bg-red-500/80'}`} style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        {[['AC', c.ac], ['Speed', c.speed], ['Pass. Per', pp], ['Hit dice', c.hitDice]].map(([k, v]) => (
          <div key={k} className="rounded bg-amber-950/60 border border-amber-900/50 py-1">
            <div className="text-sm font-bold text-amber-100">{v}</div>
            <div className="text-[9px] text-amber-600/80">{k}</div>
          </div>
        ))}
      </div>
      {(c.conditions.length > 0 || c.exhaustion > 0 || c.inspiration) && (
        <div className="flex flex-wrap gap-1">
          {c.conditions.map(x => <span key={x} className="px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800/40">{x}</span>)}
          {c.exhaustion > 0 && <span className="px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-300">Exhaustion {c.exhaustion}</span>}
          {c.inspiration && <span className="px-1.5 py-0.5 rounded bg-amber-700/40 text-amber-200">★ Inspiration</span>}
        </div>
      )}
      {c.currentHp <= 0 && c.maxHp > 0 && <div className="text-red-300 font-bold">Down — death saves {c.deathSaveSuccesses}✓ {c.deathSaveFailures}✗</div>}
      {c.activeFeatures.filter(f => f.maxUses > 0).length > 0 && (
        <>
          <Label>Limited-use features</Label>
          {c.activeFeatures.filter(f => f.maxUses > 0).map(f => (
            <div key={f.id} className="flex justify-between items-center text-amber-200/90">
              <span>{f.name}</span><span className="flex items-center gap-1.5"><Pips left={f.usesLeft} max={f.maxUses} /><span className="font-mono text-amber-500/80">{f.usesLeft}/{f.maxUses}</span></span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function Spells({ c }: { c: Character }) {
  const slots = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => (c.spellSlots[l]?.max ?? 0) + (c.spellSlots[l]?.bonus ?? 0) > 0)
  if (!slots.length && !c.spells.length) return <Empty>No spellcasting.</Empty>
  return (
    <div className="text-xs space-y-1">
      {c.spellcastingAbility && (
        <div className="text-amber-300/90">{ABILITY_LABELS[c.spellcastingAbility]} · Save DC {spellSaveDC(c)} · Attack {spellAttackBonus(c)}</div>
      )}
      {slots.length > 0 && <Label>Slots left</Label>}
      {slots.map(l => {
        const s = c.spellSlots[l]
        const left = s.max + (s.bonus ?? 0) - s.used
        return (
          <div key={l} className="flex justify-between items-center text-amber-200/90">
            <span>{ORD[l]} level</span>
            <span className="flex items-center gap-1.5"><Pips left={left} max={s.max} bonus={s.bonus ?? 0} /><span className="font-mono text-amber-500/80">{left}/{s.max + (s.bonus ?? 0)}</span></span>
          </div>
        )
      })}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => {
        const list = c.spells.filter(s => s.level === l)
        if (!list.length) return null
        return (
          <div key={l}>
            <Label>{ORD[l]}{l > 0 ? ' level' : ''}</Label>
            <p className="text-amber-200/90 leading-relaxed">
              {list.map((s, i) => (
                <span key={s.id} className={l > 0 && !s.prepared ? 'text-amber-600/70' : ''}>
                  {s.name}{s.concentration ? 'ᶜ' : ''}{i < list.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>
        )
      })}
      {c.spells.some(s => s.level > 0 && !s.prepared) && <p className="text-[10px] text-amber-700/80">Dimmed = not prepared · ᶜ = concentration</p>}
    </div>
  )
}

function Equipment({ c }: { c: Character }) {
  const top = c.inventory.filter(i => !i.containerId)
  const within = (id: string) => c.inventory.filter(i => i.containerId === id)
  const cur = c.currency
  return (
    <div className="text-xs space-y-1">
      <div className="flex flex-wrap gap-2 text-amber-200">
        {(['pp', 'gp', 'ep', 'sp', 'cp'] as const).filter(k => cur[k]).map(k => <span key={k}><b>{cur[k]}</b> {k}</span>)}
        {!Object.values(cur).some(Boolean) && <span className="text-amber-700/70">No coin</span>}
      </div>
      {top.length === 0 ? <Empty>No items.</Empty> : (
        <ul className="space-y-0.5">
          {top.map(i => (
            <li key={i.id} className="text-amber-200/90">
              <span className={i.equipped ? 'text-amber-100 font-semibold' : ''}>{i.equipped ? '◆ ' : '· '}{i.name}</span>
              {i.quantity > 1 && <span className="text-amber-500/80"> ×{i.quantity}</span>}
              {i.isContainer && within(i.id).length > 0 && (
                <ul className="ml-4 text-amber-300/70">{within(i.id).map(x => <li key={x.id}>↳ {x.name}{x.quantity > 1 ? ` ×${x.quantity}` : ''}</li>)}</ul>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-amber-700/80">◆ = equipped</p>
    </div>
  )
}

function Text({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null
  return (<><Label>{label}</Label><p className="text-xs text-amber-200/85 whitespace-pre-wrap leading-relaxed">{value}</p></>)
}

function Background({ c }: { c: Character }) {
  const any = [c.personalityTraits, c.ideals, c.bonds, c.flaws, c.backstory, c.backgroundFlavour, c.characterGrowth].some(x => x?.trim())
  return (
    <div>
      <div className="text-xs text-amber-300/90">{[c.background, c.alignment].filter(Boolean).join(' · ') || 'No background set'}</div>
      <Text label="Personality" value={c.personalityTraits} />
      <Text label="Ideals" value={c.ideals} />
      <Text label="Bonds" value={c.bonds} />
      <Text label="Flaws" value={c.flaws} />
      <Text label="Backstory" value={c.backstory} />
      <Text label="Background notes" value={c.backgroundFlavour} />
      <Text label="Character growth" value={c.characterGrowth} />
      {!any && <Empty>Nothing written yet.</Empty>}
    </div>
  )
}

function Features({ c }: { c: Character }) {
  return (
    <div className="text-xs space-y-1">
      {(c.feats?.length ?? 0) > 0 && (<><Label>Feats</Label><p className="text-amber-200/90">{c.feats!.map(f => f.name).join(', ')}</p></>)}
      {c.activeFeatures.length > 0 && <Label>Active</Label>}
      {c.activeFeatures.map(f => (
        <details key={f.id}>
          <summary className="cursor-pointer text-amber-200/90">{f.name} {f.maxUses > 0 && <span className="text-amber-500/80 font-mono">{f.usesLeft}/{f.maxUses}</span>}</summary>
          <p className="text-amber-300/70 whitespace-pre-wrap mt-0.5">{f.description}</p>
        </details>
      ))}
      {c.passiveTraits.length > 0 && <Label>Traits</Label>}
      {c.passiveTraits.map(t => (
        <details key={t.id}>
          <summary className="cursor-pointer text-amber-200/90">{t.name}</summary>
          <p className="text-amber-300/70 whitespace-pre-wrap mt-0.5">{t.description}</p>
        </details>
      ))}
      {!c.activeFeatures.length && !c.passiveTraits.length && <Empty>No features listed.</Empty>}
    </div>
  )
}

function Abilities({ c }: { c: Character }) {
  return (
    <div className="text-xs">
      <div className="grid grid-cols-6 gap-1 text-center">
        {ABILITY_KEYS.map(k => (
          <div key={k} className="rounded bg-amber-950/60 border border-amber-900/50 py-1">
            <div className="text-[9px] uppercase text-amber-600/80">{k}</div>
            <div className="text-sm font-bold text-amber-100">{c.abilities[k]}</div>
            <div className="text-[10px] font-mono text-amber-400">{modStr(c.abilities[k])}</div>
          </div>
        ))}
      </div>
      <Label>Saving throws</Label>
      <div className="grid grid-cols-3 gap-x-2 text-amber-200/90">
        {ABILITY_KEYS.map(k => (
          <span key={k} className={c.savingThrows[k] ? 'font-bold text-amber-100' : ''}>
            {c.savingThrows[k] ? '● ' : '○ '}{k.toUpperCase()} {saveBonus(k, c.abilities, c.savingThrows[k], c.level)}
          </span>
        ))}
      </div>
      <Label>Passive scores</Label>
      <div className="text-amber-200/90">
        {(['Perception', 'Insight', 'Investigation'] as const).map(s => `${s} ${10 + skillBonus(s, c.abilities, c.skills[s] ?? { proficient: false, expertise: false }, c.level)}`).join(' · ')}
      </div>
      <div className="text-[10px] text-amber-700/80 mt-1">Proficiency bonus +{proficiencyBonus(c.level)}</div>
    </div>
  )
}

function Skills({ c }: { c: Character }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 text-xs">
      {ALL_SKILLS.map(s => {
        const e = c.skills[s] ?? { proficient: false, expertise: false }
        return (
          <div key={s} className={`flex justify-between ${e.proficient ? 'text-amber-100 font-semibold' : 'text-amber-500/70'}`}>
            <span>{e.expertise ? '◆ ' : e.proficient ? '● ' : ''}{s} <span className="text-[9px] opacity-60">{SKILL_ABILITIES[s].toUpperCase()}</span></span>
            <span className="font-mono">{skillBonusStr(s, c.abilities, e, c.level)}</span>
          </div>
        )
      })}
    </div>
  )
}

function Proficiencies({ c }: { c: Character }) {
  const by = (cat: string) => c.proficiencyList.filter(p => p.category === cat).map(p => p.name)
  return (
    <div className="text-xs">
      {(['armor', 'weapon', 'tool', 'other'] as const).map(cat => by(cat).length > 0 && (
        <div key={cat}><Label>{cat === 'other' ? 'Other' : `${cat[0].toUpperCase()}${cat.slice(1)}s`}</Label><p className="text-amber-200/90">{by(cat).join(', ')}</p></div>
      ))}
      <Label>Languages</Label>
      <p className="text-amber-200/90">{c.languages.map(l => l.notes ? `${l.name} (${l.notes})` : l.name).join(', ') || '—'}</p>
      {!c.proficiencyList.length && c.proficiencies && (<><Label>Proficiencies (old text)</Label><p className="text-amber-200/90 whitespace-pre-wrap">{c.proficiencies}</p></>)}
    </div>
  )
}

function flat(nodes: NoteNode[], depth = 0): Array<{ n: NoteNode; depth: number }> {
  return nodes.flatMap(n => [{ n, depth }, ...flat(n.children ?? [], depth + 1)])
}

function Notes({ c }: { c: Character }) {
  const list = flat(c.noteTree ?? [])
  if (!list.length) return <Empty>No notes.</Empty>
  return (
    <div className="text-xs space-y-0.5">
      {list.map(({ n, depth }) => (
        <details key={n.id} style={{ marginLeft: depth * 12 }}>
          <summary className="cursor-pointer text-amber-200/90">{n.title || 'Untitled'}</summary>
          {/* Shown as plain text: player notes may contain raw HTML (colour spans). */}
          <p className="text-amber-300/70 whitespace-pre-wrap mt-0.5">{n.content.replace(/<\/?span[^>]*>/g, '') || '(empty)'}</p>
        </details>
      ))}
    </div>
  )
}

export function SectionView({ section, char }: { section: SectionKey; char: Character }) {
  switch (section) {
    case 'overview': return <Overview c={char} />
    case 'spells': return <Spells c={char} />
    case 'equipment': return <Equipment c={char} />
    case 'background': return <Background c={char} />
    case 'features': return <Features c={char} />
    case 'abilities': return <Abilities c={char} />
    case 'skills': return <Skills c={char} />
    case 'proficiencies': return <Proficiencies c={char} />
    case 'notes': return <Notes c={char} />
  }
}
