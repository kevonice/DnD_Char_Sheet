import { useState, useEffect } from 'react'
import type { Character, AbilityKey } from './types'
import { makeDefaultCharacter } from './defaultCharacter'
import { proficiencyBonus } from './utils'
import SectionHeader from './components/SectionHeader'
import AbilityBlock from './components/AbilityBlock'
import SkillList from './components/SkillList'
import SavingThrows from './components/SavingThrows'
import CombatStats from './components/CombatStats'
import AttacksPanel from './components/AttacksPanel'
import SpellsPanel from './components/SpellsPanel'

const STORAGE_KEY = 'dnd5e_character'

function loadCharacter(): Character {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...makeDefaultCharacter(), ...JSON.parse(saved) }
  } catch {}
  return makeDefaultCharacter()
}

function TextArea({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number
}) {
  return (
    <div>
      {label && <label className="text-[10px] uppercase tracking-widest text-amber-600/70 block mb-1">{label}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-amber-950/30 border border-amber-800/40 rounded px-2 py-1.5 text-sm text-amber-100 resize-none focus:border-amber-500 transition-colors"
      />
    </div>
  )
}

type Tab = 'main' | 'spells' | 'backstory'

export default function App() {
  const [char, setChar] = useState<Character>(loadCharacter)
  const [activeTab, setActiveTab] = useState<Tab>('main')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(char))
  }, [char])

  function update(updates: Partial<Character>) {
    setChar(prev => ({ ...prev, ...updates }))
  }

  const pb = proficiencyBonus(char.level)

  return (
    <div className="min-h-screen bg-[#1a1008] text-amber-100">
      {/* Header */}
      <div className="border-b border-amber-800/40 bg-amber-950/60 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              value={char.name}
              onChange={e => update({ name: e.target.value })}
              placeholder="Character Name"
              className="bg-transparent text-2xl font-bold text-amber-100 placeholder-amber-800/60 w-full focus:outline-none border-b border-transparent focus:border-amber-600/50"
            />
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {(
              [
                { label: 'Class', field: 'class' as const, placeholder: 'Wizard', width: 'w-24' },
                { label: 'Subclass', field: 'subclass' as const, placeholder: 'Evocation', width: 'w-24' },
                { label: 'Race', field: 'race' as const, placeholder: 'Elf', width: 'w-20' },
                { label: 'Background', field: 'background' as const, placeholder: 'Sage', width: 'w-24' },
                { label: 'Alignment', field: 'alignment' as const, placeholder: 'Neutral Good', width: 'w-28' },
              ] as const
            ).map(({ label, field, placeholder, width }) => (
              <div key={field} className="flex flex-col">
                <input
                  value={char[field]}
                  onChange={e => update({ [field]: e.target.value })}
                  placeholder={placeholder}
                  className={`bg-transparent text-amber-200 placeholder-amber-800/50 focus:outline-none border-b border-amber-800/30 focus:border-amber-500/60 ${width} text-sm`}
                />
                <span className="text-[9px] uppercase tracking-widest text-amber-600/50 mt-0.5">{label}</span>
              </div>
            ))}
            <div className="flex flex-col">
              <input
                type="number"
                min={1}
                max={20}
                value={char.level}
                onChange={e => update({ level: Number(e.target.value) })}
                className="bg-transparent text-amber-200 focus:outline-none border-b border-amber-800/30 focus:border-amber-500/60 w-10 text-sm text-center"
              />
              <span className="text-[9px] uppercase tracking-widest text-amber-600/50 mt-0.5 text-center">Level</span>
            </div>
            <div className="flex flex-col">
              <input
                type="number"
                value={char.xp}
                onChange={e => update({ xp: Number(e.target.value) })}
                className="bg-transparent text-amber-200 focus:outline-none border-b border-amber-800/30 focus:border-amber-500/60 w-20 text-sm text-center"
              />
              <span className="text-[9px] uppercase tracking-widest text-amber-600/50 mt-0.5 text-center">XP</span>
            </div>
          </div>
          <button
            onClick={() => update({ inspiration: !char.inspiration })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-wider transition-colors ${
              char.inspiration
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'border-amber-800/40 text-amber-700/60 hover:border-amber-600/50'
            }`}
          >
            ★ Inspiration
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-amber-800/30 bg-amber-950/40">
        <div className="max-w-6xl mx-auto flex">
          {(['main', 'spells', 'backstory'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-sm font-bold uppercase tracking-widest transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-amber-700/60 hover:text-amber-500/80'
              }`}
            >
              {tab === 'main' ? 'Character' : tab === 'spells' ? 'Spells' : 'Backstory'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4">
        {activeTab === 'main' && (
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_1fr] gap-4">
            {/* Left column */}
            <div className="space-y-4">
              <div>
                <SectionHeader title="Ability Scores" />
                <AbilityBlock
                  abilities={char.abilities}
                  onChange={(key, value) => update({ abilities: { ...char.abilities, [key]: value } })}
                />
              </div>

              <div>
                <SectionHeader title="Saving Throws" />
                <SavingThrows
                  abilities={char.abilities}
                  savingThrows={char.savingThrows}
                  level={char.level}
                  onChange={(key: AbilityKey, val: boolean) =>
                    update({ savingThrows: { ...char.savingThrows, [key]: val } })
                  }
                />
                <p className="text-[9px] text-amber-600/40 mt-1">Proficiency Bonus: +{pb}</p>
              </div>

              <div>
                <SectionHeader title="Skills" />
                <p className="text-[9px] text-amber-600/40 mb-2">● Expertise &nbsp; ○ Proficient</p>
                <SkillList
                  abilities={char.abilities}
                  skills={char.skills}
                  level={char.level}
                  onChange={(skill, entry) =>
                    update({ skills: { ...char.skills, [skill]: entry } })
                  }
                />
              </div>
            </div>

            {/* Middle column */}
            <div className="space-y-4">
              <div>
                <SectionHeader title="Combat" />
                <CombatStats char={char} onChange={update} />
              </div>

              <div>
                <SectionHeader title="Attacks" />
                <AttacksPanel attacks={char.attacks} onChange={attacks => update({ attacks })} />
              </div>

              <div>
                <SectionHeader title="Equipment" />
                <TextArea label="" value={char.equipment} onChange={v => update({ equipment: v })} rows={6} />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div>
                <SectionHeader title="Features & Traits" />
                <TextArea label="" value={char.features} onChange={v => update({ features: v })} rows={8} />
              </div>

              <div>
                <SectionHeader title="Proficiencies & Languages" />
                <TextArea label="" value={char.proficiencies} onChange={v => update({ proficiencies: v })} rows={4} />
              </div>

              <div>
                <SectionHeader title="Notes" />
                <TextArea label="" value={char.notes} onChange={v => update({ notes: v })} rows={5} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'spells' && (
          <SpellsPanel char={char} onChange={update} />
        )}

        {activeTab === 'backstory' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <TextArea label="Personality Traits" value={char.personalityTraits} onChange={v => update({ personalityTraits: v })} rows={4} />
            <TextArea label="Ideals" value={char.ideals} onChange={v => update({ ideals: v })} rows={4} />
            <TextArea label="Bonds" value={char.bonds} onChange={v => update({ bonds: v })} rows={4} />
            <TextArea label="Flaws" value={char.flaws} onChange={v => update({ flaws: v })} rows={4} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-amber-800/30 mt-8 px-4 py-2 text-center text-[10px] text-amber-800/50">
        Autosaved · {char.name || 'Unnamed'} · Level {char.level} {char.class || 'Adventurer'}
      </div>
    </div>
  )
}
