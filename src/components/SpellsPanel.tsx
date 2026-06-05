import { useState, useEffect } from 'react'
import type { Character, Spell } from '../types'
import { spellAttackBonus, spellSaveDC, ABILITY_KEYS, ABILITY_LABELS } from '../utils'
import { v4 as uuid } from '../uuid'
import { fetchSpells, matchesEdition, type Edition } from '../data/fiveEtools'
import Autocomplete from './Autocomplete'
import EditionToggle from './EditionToggle'

interface Props {
  char: Character
  onChange: (updates: Partial<Character>) => void
}

function blankSpell(level: number): Spell {
  return {
    id: uuid(),
    name: '',
    level,
    school: '',
    castingTime: '1 action',
    range: '',
    components: '',
    duration: '',
    description: '',
    prepared: false,
    concentration: false,
  }
}

const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export default function SpellsPanel({ char, onChange }: Props) {
  const [openSpell, setOpenSpell] = useState<string | null>(null)
  const [openLevel, setOpenLevel] = useState<number | null>(0)
  const [spellDb, setSpellDb] = useState<Spell[]>([])
  const [spellDbLoading, setSpellDbLoading] = useState(false)
  const [searchLevel, setSearchLevel] = useState<number | null>(null)
  const [edition, setEdition] = useState<Edition>('2014')

  useEffect(() => {
    setSpellDbLoading(true)
    fetchSpells()
      .then(setSpellDb)
      .catch(() => {})
      .finally(() => setSpellDbLoading(false))
  }, [])

  function updateSpell(id: string, updates: Partial<Spell>) {
    onChange({ spells: char.spells.map(s => s.id === id ? { ...s, ...updates } : s) })
  }

  function removeSpell(id: string) {
    onChange({ spells: char.spells.filter(s => s.id !== id) })
  }

  function updateSlot(level: number, field: 'max' | 'used', val: number) {
    onChange({
      spellSlots: {
        ...char.spellSlots,
        [level]: { ...char.spellSlots[level], [field]: val },
      },
    })
  }

  const spellsByLevel = (level: number) => char.spells.filter(s => s.level === level)

  return (
    <div className="space-y-3">
      {/* Spellcasting info */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2 text-center">
          <select
            value={char.spellcastingAbility}
            onChange={e => onChange({ spellcastingAbility: e.target.value as any })}
            className="text-sm text-center w-full rounded cursor-pointer focus:outline-none border-0"
            style={{ background: 'var(--color-amber-950)', color: 'var(--color-amber-100)' }}
          >
            <option value="">—</option>
            {ABILITY_KEYS.map(k => (
              <option key={k} value={k}>{ABILITY_LABELS[k].slice(0, 3).toUpperCase()}</option>
            ))}
          </select>
          <span className="text-[9px] uppercase tracking-widest text-amber-600/70 block mt-1">Ability</span>
        </div>
        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2 text-center">
          <span className="text-xl font-bold text-amber-100">{spellSaveDC(char)}</span>
          <span className="text-[9px] uppercase tracking-widest text-amber-600/70 block mt-1">Save DC</span>
        </div>
        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2 text-center">
          <span className="text-xl font-bold text-amber-100">{spellAttackBonus(char)}</span>
          <span className="text-[9px] uppercase tracking-widest text-amber-600/70 block mt-1">Atk Bonus</span>
        </div>
      </div>

      {/* Spell levels */}
      {SPELL_LEVELS.map(lvl => {
        const spells = spellsByLevel(lvl)
        const slot = char.spellSlots[lvl]
        const isOpen = openLevel === lvl

        return (
          <div key={lvl} className="border border-amber-800/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenLevel(isOpen ? null : lvl)}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-amber-950/50 hover:bg-amber-900/40 transition-colors"
            >
              <span className="text-xs font-bold text-amber-400">
                {lvl === 0 ? 'Cantrips' : `Level ${lvl}`}
              </span>
              <div className="flex items-center gap-2">
                {lvl > 0 && slot && (
                  <div className="flex items-center gap-1 text-xs" onClick={e => e.stopPropagation()}>
                    <span className="text-amber-600/60">Slots:</span>
                    {Array.from({ length: Math.min(slot.max, 9) }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => updateSlot(lvl, 'used', slot.used === i + 1 ? i : i + 1)}
                        className={`w-4 h-4 rounded border text-[8px] transition-colors ${
                          i < slot.used
                            ? 'bg-amber-950/60 border-amber-800/30'
                            : 'bg-amber-400 border-amber-300/60 shadow-[0_0_4px_rgba(251,191,36,0.35)]'
                        }`}
                      />
                    ))}
                    <input
                      type="number"
                      min={0}
                      max={9}
                      value={slot.max}
                      onChange={e => updateSlot(lvl, 'max', Number(e.target.value))}
                      className="w-12 text-center bg-amber-900/40 border border-amber-700/30 rounded text-amber-300 text-xs ml-1"
                    />
                  </div>
                )}
                <span className="text-amber-600/50 text-xs">{spells.length} spell{spells.length !== 1 ? 's' : ''}</span>
                <span className="text-amber-600/50">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {isOpen && (
              <div className="p-2 space-y-1">
                {spells.map(spell => (
                  <div key={spell.id} className="bg-amber-950/30 border border-amber-800/20 rounded">
                    <div className="flex items-center gap-2 px-2 py-1">
                      {lvl > 0 && (
                        <button
                          title="Prepared"
                          onClick={() => updateSpell(spell.id, { prepared: !spell.prepared })}
                          className={`w-3 h-3 rounded-full border flex-shrink-0 ${spell.prepared ? 'bg-amber-400 border-amber-400' : 'border-amber-700/50'}`}
                        />
                      )}
                      <input
                        value={spell.name}
                        onChange={e => updateSpell(spell.id, { name: e.target.value })}
                        className="bg-transparent text-amber-100 text-sm flex-1"
                        placeholder="Spell name"
                      />
                      <button
                        title="Concentration"
                        onClick={() => updateSpell(spell.id, { concentration: !spell.concentration })}
                        className={`text-[10px] font-bold w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                          spell.concentration
                            ? 'bg-purple-500/30 border-purple-400 text-purple-300'
                            : 'border-amber-700/40 text-amber-700/40 hover:border-amber-500'
                        }`}
                      >
                        C
                      </button>
                      <input
                        value={spell.school}
                        onChange={e => updateSpell(spell.id, { school: e.target.value })}
                        className="bg-transparent text-amber-600/60 text-xs w-20 text-right"
                        placeholder="School"
                      />
                      <button
                        onClick={() => setOpenSpell(openSpell === spell.id ? null : spell.id)}
                        className="text-amber-600/40 hover:text-amber-400 text-xs"
                      >
                        ⋯
                      </button>
                    </div>
                    {openSpell === spell.id && (
                      <div className="border-t border-amber-800/20 p-2 grid grid-cols-2 gap-2">
                        {[
                          ['Casting Time', 'castingTime'],
                          ['Range', 'range'],
                          ['Components', 'components'],
                          ['Duration', 'duration'],
                        ].map(([label, field]) => (
                          <div key={field}>
                            <span className="text-[9px] uppercase tracking-widest text-amber-600/50 block">{label}</span>
                            <input
                              value={(spell as any)[field]}
                              onChange={e => updateSpell(spell.id, { [field]: e.target.value })}
                              className="bg-transparent text-amber-200/80 text-xs w-full"
                            />
                          </div>
                        ))}
                        <div className="col-span-2">
                          <span className="text-[9px] uppercase tracking-widest text-amber-600/50 block">Description</span>
                          <textarea
                            value={spell.description}
                            onChange={e => updateSpell(spell.id, { description: e.target.value })}
                            className="bg-transparent text-amber-200/70 text-xs w-full resize-none"
                            rows={3}
                          />
                        </div>
                        <button
                          onClick={() => removeSpell(spell.id)}
                          className="text-red-500/60 hover:text-red-400 text-xs"
                        >
                          Remove spell
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {searchLevel === lvl ? (
                  <Autocomplete
                    options={spellDb.filter(s => s.level === lvl && matchesEdition(s.source, edition))}
                    getLabel={s => s.name}
                    getSublabel={s =>
                      `${s.school}${s.concentration ? ' · C' : ''}${s.source ? ` · ${s.source}` : ''}`
                    }
                    loading={spellDbLoading}
                    placeholder={`Search ${lvl === 0 ? 'cantrips' : `level ${lvl} spells`}…`}
                    toolbar={<EditionToggle value={edition} onChange={setEdition} />}
                    onSelect={s => {
                      onChange({ spells: [...char.spells, { ...s, id: uuid(), prepared: false }] })
                      setSearchLevel(null)
                    }}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => setSearchLevel(lvl)}
                      className="flex-1 text-xs text-amber-600/50 hover:text-amber-400 border border-dashed border-amber-800/30 rounded py-1 transition-colors"
                    >
                      + Search 5e.tools
                    </button>
                    <button
                      onClick={() => onChange({ spells: [...char.spells, blankSpell(lvl)] })}
                      className="flex-1 text-xs text-amber-600/50 hover:text-amber-400 border border-dashed border-amber-800/30 rounded py-1 transition-colors"
                    >
                      + Custom spell
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
