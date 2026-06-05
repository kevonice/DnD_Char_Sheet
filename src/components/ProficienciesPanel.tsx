import { useState } from 'react'
import type { Character, ProficiencyEntry, LanguageEntry, ProficiencyCategory } from '../types'
import { v4 as uuid } from '../uuid'

interface Props {
  char: Character
  onChange: (updates: Partial<Character>) => void
}

const CATEGORIES: { key: ProficiencyCategory; label: string; color: string }[] = [
  { key: 'armor',  label: 'Armor',   color: 'bg-blue-900/40 border-blue-700/50 text-blue-300' },
  { key: 'weapon', label: 'Weapon',  color: 'bg-red-900/40 border-red-700/50 text-red-300' },
  { key: 'tool',   label: 'Tool',    color: 'bg-green-900/40 border-green-700/50 text-green-300' },
  { key: 'other',  label: 'Other',   color: 'bg-amber-900/40 border-amber-700/50 text-amber-300' },
]

function categoryStyle(cat: ProficiencyCategory) {
  return CATEGORIES.find(c => c.key === cat)?.color ?? ''
}

export default function ProficienciesPanel({ char, onChange }: Props) {
  const [newProfName, setNewProfName] = useState('')
  const [newProfCat, setNewProfCat] = useState<ProficiencyCategory>('other')
  const [newLangName, setNewLangName] = useState('')
  const [newLangNotes, setNewLangNotes] = useState('')
  const [editingProfId, setEditingProfId] = useState<string | null>(null)
  const [editingLangId, setEditingLangId] = useState<string | null>(null)

  function addProficiency() {
    const name = newProfName.trim()
    if (!name) return
    onChange({
      proficiencyList: [
        ...char.proficiencyList,
        { id: uuid(), name, category: newProfCat },
      ],
    })
    setNewProfName('')
  }

  function updateProficiency(id: string, patch: Partial<ProficiencyEntry>) {
    onChange({
      proficiencyList: char.proficiencyList.map(p => p.id === id ? { ...p, ...patch } : p),
    })
  }

  function removeProficiency(id: string) {
    onChange({ proficiencyList: char.proficiencyList.filter(p => p.id !== id) })
  }

  function addLanguage() {
    const name = newLangName.trim()
    if (!name) return
    onChange({
      languages: [
        ...char.languages,
        { id: uuid(), name, notes: newLangNotes.trim() },
      ],
    })
    setNewLangName('')
    setNewLangNotes('')
  }

  function updateLanguage(id: string, patch: Partial<LanguageEntry>) {
    onChange({
      languages: char.languages.map(l => l.id === id ? { ...l, ...patch } : l),
    })
  }

  function removeLanguage(id: string) {
    onChange({ languages: char.languages.filter(l => l.id !== id) })
  }

  const profsByCategory = (cat: ProficiencyCategory) =>
    char.proficiencyList.filter(p => p.category === cat)

  return (
    <div className="space-y-4">

      {/* ── Proficiencies ── */}
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-amber-600/70 mb-2">Proficiencies</h3>

        {CATEGORIES.map(({ key, label }) => {
          const entries = profsByCategory(key)
          if (entries.length === 0) return null
          return (
            <div key={key} className="mb-2">
              <span className="text-[9px] uppercase tracking-widest text-amber-700/50 block mb-1">{label}</span>
              <div className="flex flex-wrap gap-1">
                {entries.map(p => (
                  editingProfId === p.id ? (
                    <div key={p.id} className="flex items-center gap-1 bg-amber-900/30 border border-amber-700/30 rounded-full px-2 py-0.5">
                      <input
                        autoFocus
                        value={p.name}
                        onChange={e => updateProficiency(p.id, { name: e.target.value })}
                        onBlur={() => setEditingProfId(null)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingProfId(null) }}
                        className="bg-transparent text-amber-200 text-xs outline-none w-28"
                      />
                      <select
                        value={p.category}
                        onChange={e => updateProficiency(p.id, { category: e.target.value as ProficiencyCategory })}
                        className="bg-amber-950/80 border border-amber-700/30 rounded text-amber-300 text-[10px] px-1 cursor-pointer focus:outline-none"
                      >
                        {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                      <button onClick={() => removeProficiency(p.id)} className="text-red-500/60 hover:text-red-400 text-[10px] ml-0.5">✕</button>
                    </div>
                  ) : (
                    <button
                      key={p.id}
                      onDoubleClick={() => setEditingProfId(p.id)}
                      className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${categoryStyle(p.category)}`}
                    >
                      {p.name}
                    </button>
                  )
                ))}
              </div>
            </div>
          )
        })}

        {/* Add row */}
        <div className="flex gap-1 mt-2">
          <select
            value={newProfCat}
            onChange={e => setNewProfCat(e.target.value as ProficiencyCategory)}
            className="bg-amber-950/80 border border-amber-700/30 rounded-lg text-amber-300 text-xs px-1.5 py-1 cursor-pointer focus:outline-none"
          >
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <input
            value={newProfName}
            onChange={e => setNewProfName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addProficiency()}
            placeholder="Add proficiency…"
            className="flex-1 bg-amber-900/20 border border-dashed border-amber-800/40 rounded-lg text-amber-200 text-xs px-2 py-1 placeholder-amber-800/50"
          />
          <button
            onClick={addProficiency}
            disabled={!newProfName.trim()}
            className="px-2.5 py-1 bg-amber-800/30 hover:bg-amber-700/40 border border-amber-700/30 rounded-lg text-amber-400 text-xs disabled:opacity-30 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-amber-800/20" />

      {/* ── Languages ── */}
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-amber-600/70 mb-2">Languages</h3>

        <div className="flex flex-wrap gap-1 mb-2">
          {char.languages.map(lang => (
            editingLangId === lang.id ? (
              <div key={lang.id} className="flex items-center gap-1 bg-amber-900/30 border border-amber-700/30 rounded-full px-2 py-0.5">
                <input
                  autoFocus
                  value={lang.name}
                  onChange={e => updateLanguage(lang.id, { name: e.target.value })}
                  onBlur={() => setEditingLangId(null)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingLangId(null) }}
                  className="bg-transparent text-amber-200 text-xs outline-none w-24"
                />
                <input
                  value={lang.notes}
                  onChange={e => updateLanguage(lang.id, { notes: e.target.value })}
                  placeholder="notes…"
                  className="bg-transparent text-amber-500 text-[10px] outline-none w-20 italic"
                />
                <button onClick={() => removeLanguage(lang.id)} className="text-red-500/60 hover:text-red-400 text-[10px] ml-0.5">✕</button>
              </div>
            ) : (
              <button
                key={lang.id}
                onDoubleClick={() => setEditingLangId(lang.id)}
                title={lang.notes || undefined}
                className="text-xs px-2.5 py-0.5 rounded-full border bg-purple-900/30 border-purple-700/40 text-purple-300 transition-colors"
              >
                {lang.name}{lang.notes ? <span className="text-purple-500/60 ml-1 italic text-[10px]">{lang.notes}</span> : null}
              </button>
            )
          ))}
        </div>

        {/* Add row */}
        <div className="flex gap-1">
          <input
            value={newLangName}
            onChange={e => setNewLangName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addLanguage()}
            placeholder="Language…"
            className="flex-1 bg-amber-900/20 border border-dashed border-amber-800/40 rounded-lg text-amber-200 text-xs px-2 py-1 placeholder-amber-800/50"
          />
          <input
            value={newLangNotes}
            onChange={e => setNewLangNotes(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addLanguage()}
            placeholder="notes (optional)"
            className="w-32 bg-amber-900/20 border border-dashed border-amber-800/40 rounded-lg text-amber-400 text-xs px-2 py-1 placeholder-amber-800/50 italic"
          />
          <button
            onClick={addLanguage}
            disabled={!newLangName.trim()}
            className="px-2.5 py-1 bg-amber-800/30 hover:bg-amber-700/40 border border-amber-700/30 rounded-lg text-amber-400 text-xs disabled:opacity-30 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

    </div>
  )
}
