import { useState, useEffect, useMemo } from 'react'
import type { Character, ChangelogEntry, ChangeCategory } from '../types'
import { makeDefaultCharacter } from '../defaultCharacter'
import { modifier, modStr, passivePerception, proficiencyBonus } from '../utils'

// ── Campaign storage ──────────────────────────────────────────────────────────

const DM_STORAGE_KEY = 'dnd5e_dm_campaign'

interface InitiativeEntry {
  id: string
  name: string
  init: number
  isPC: boolean
  hp?: number
  maxHp?: number
  note?: string
}

interface DMCampaign {
  name: string
  characters: Character[]
  importedAt: Record<string, number>   // char name → timestamp
  dmNotes: Record<string, string>      // char name → private note
  initiative: InitiativeEntry[]
  initiativeActive: number             // index of current turn, -1 = inactive
}

function makeEmptyCampaign(): DMCampaign {
  return { name: '', characters: [], importedAt: {}, dmNotes: {}, initiative: [], initiativeActive: -1 }
}

function loadCampaign(): DMCampaign {
  try {
    const raw = localStorage.getItem(DM_STORAGE_KEY)
    if (!raw) return makeEmptyCampaign()
    return { ...makeEmptyCampaign(), ...JSON.parse(raw) }
  } catch {
    return makeEmptyCampaign()
  }
}

function uuid(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<ChangeCategory, { label: string; color: string }> = {
  combat:      { label: 'Combat',      color: 'text-red-400' },
  inventory:   { label: 'Inventory',   color: 'text-green-400' },
  magic:       { label: 'Magic',       color: 'text-purple-400' },
  progression: { label: 'Progression', color: 'text-amber-300' },
  note:        { label: 'Notes',       color: 'text-blue-400' },
}

function hpColor(pct: number): string {
  if (pct > 0.5) return 'bg-green-500/70'
  if (pct > 0.25) return 'bg-yellow-500/70'
  return 'bg-red-500/80'
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ── Party member card ─────────────────────────────────────────────────────────

function PartyCard({
  char, importedAt, dmNote, onDmNote, onRemove, onUpdate, expanded, onToggle,
}: {
  char: Character
  importedAt?: number
  dmNote: string
  onDmNote: (note: string) => void
  onRemove: () => void
  onUpdate: (file: File) => void
  expanded: boolean
  onToggle: () => void
}) {
  const hpPct = char.maxHp > 0 ? Math.max(0, Math.min(1, char.currentHp / char.maxHp)) : 0
  const pp = passivePerception(char.abilities, char.skills?.Perception ?? { proficient: false, expertise: false }, char.level)
  const slotLevels = Object.entries(char.spellSlots ?? {})
    .filter(([, s]) => s.max > 0)
    .sort(([a], [b]) => Number(a) - Number(b))

  const dying = char.currentHp <= 0 && char.maxHp > 0

  return (
    <div className={`rounded-xl border transition-colors ${dying ? 'border-red-700/60 bg-red-950/20' : 'border-amber-800/30 bg-amber-950/40'}`}>
      {/* Header row — always visible */}
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        {char.portrait
          ? <img src={char.portrait} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-lg bg-amber-900/50 flex items-center justify-center text-lg shrink-0">⚔️</div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-100 truncate">{char.name || 'Unnamed'}</span>
            {dying && <span className="text-[9px] uppercase tracking-widest text-red-400 font-bold animate-pulse">Down!</span>}
            {char.inspiration && <span title="Has inspiration" className="text-amber-400 text-xs">★</span>}
          </div>
          <div className="text-[10px] text-amber-600/70">
            {char.class}{char.subclass ? ` (${char.subclass})` : ''} · Lv {char.level} · {char.race}
          </div>
        </div>

        {/* Vital stats strip */}
        <div className="flex items-center gap-3 shrink-0 text-center">
          <div>
            <div className="text-sm font-bold text-amber-200">{char.ac}</div>
            <div className="text-[8px] uppercase tracking-widest text-amber-700/60">AC</div>
          </div>
          <div>
            <div className="text-sm font-bold text-amber-200">{pp}</div>
            <div className="text-[8px] uppercase tracking-widest text-amber-700/60">Pass. Per</div>
          </div>
          <div className="w-24">
            <div className="text-[10px] text-amber-300 font-mono mb-0.5">
              {char.currentHp}/{char.maxHp}{char.tempHp > 0 ? ` +${char.tempHp}` : ''}
            </div>
            <div className="h-1.5 bg-amber-950 rounded-full overflow-hidden border border-amber-900/50">
              <div className={`h-full rounded-full transition-all ${hpColor(hpPct)}`} style={{ width: `${hpPct * 100}%` }} />
            </div>
          </div>
        </div>
        <span className="text-amber-700/50 text-xs shrink-0">{expanded ? '▼' : '▶'}</span>
      </div>

      {/* Conditions chips — visible when any */}
      {(char.conditions.length > 0 || char.exhaustion > 0 || char.deathSaveFailures > 0) && (
        <div className="px-3 pb-2 flex flex-wrap gap-1 -mt-1">
          {char.conditions.map(c => (
            <span key={c} className="px-1.5 py-0.5 rounded text-[9px] bg-red-900/40 text-red-300 border border-red-800/40">{c}</span>
          ))}
          {char.exhaustion > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-900/40 text-orange-300 border border-orange-800/40">Exhaustion {char.exhaustion}</span>
          )}
          {dying && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-950/60 text-red-300 border border-red-700/50 font-mono">
              ☠ {char.deathSaveSuccesses}✓ {char.deathSaveFailures}✗
            </span>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-amber-800/25 p-3 space-y-3">
          {/* Ability scores */}
          <div className="grid grid-cols-6 gap-1.5 text-center">
            {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(k => (
              <div key={k} className="bg-amber-950/60 rounded-lg py-1.5 border border-amber-900/40">
                <div className="text-[8px] uppercase tracking-widest text-amber-700/60">{k}</div>
                <div className="text-sm font-bold text-amber-200">{char.abilities[k]}</div>
                <div className="text-[9px] text-amber-500/70 font-mono">{modStr(modifier(char.abilities[k]))}</div>
              </div>
            ))}
          </div>

          {/* Spell slots */}
          {slotLevels.length > 0 && (
            <div>
              <div className="text-[9px] uppercase tracking-widest text-amber-700/60 mb-1">Spell slots</div>
              <div className="flex flex-wrap gap-1.5">
                {slotLevels.map(([lvl, s]) => (
                  <div key={lvl} className="px-2 py-1 rounded-lg bg-purple-950/40 border border-purple-800/30 text-[10px]">
                    <span className="text-purple-300 font-bold">{lvl}</span>
                    <span className="text-purple-400/70 font-mono ml-1.5">{s.max - s.used}/{s.max}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Currency + prof bonus */}
          <div className="flex flex-wrap gap-3 text-[10px] text-amber-500/80">
            <span>Prof <b className="text-amber-300">+{proficiencyBonus(char.level)}</b></span>
            <span>Speed <b className="text-amber-300">{char.speed} ft</b></span>
            <span>💰 <b className="text-amber-300">{char.currency.gp}gp</b>{char.currency.pp > 0 ? ` ${char.currency.pp}pp` : ''}</span>
            <span>XP <b className="text-amber-300">{char.xp}</b></span>
          </div>

          {/* DM private note */}
          <div>
            <div className="text-[9px] uppercase tracking-widest text-amber-700/60 mb-1">🔒 DM notes (private, stays on your device)</div>
            <textarea
              value={dmNote}
              onChange={e => onDmNote(e.target.value)}
              placeholder="Secrets, plot hooks, patron clauses…"
              rows={2}
              className="w-full bg-amber-950/60 border border-amber-800/30 rounded-lg p-2 text-xs text-amber-200/80 placeholder:text-amber-800/40 focus:outline-none focus:border-amber-700/50 resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 items-center text-[10px]">
            <label className="px-2 py-1 rounded border border-amber-800/40 text-amber-500/80 hover:text-amber-300 hover:border-amber-600/50 cursor-pointer transition-colors">
              ↻ Update from file
              <input
                type="file" accept=".json,application/json" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onUpdate(f); e.target.value = '' }}
              />
            </label>
            <button
              onClick={onRemove}
              className="px-2 py-1 rounded border border-red-900/40 text-red-500/70 hover:text-red-400 hover:border-red-700/50 transition-colors"
            >✕ Remove</button>
            {importedAt && <span className="text-amber-800/50 ml-auto">snapshot from {timeAgo(importedAt)}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Initiative tracker ────────────────────────────────────────────────────────

function InitiativeTracker({
  campaign, onChange,
}: {
  campaign: DMCampaign
  onChange: (patch: Partial<DMCampaign>) => void
}) {
  const [newName, setNewName] = useState('')
  const [newInit, setNewInit] = useState('')

  const sorted = [...campaign.initiative].sort((a, b) => b.init - a.init)

  function addEntry(name: string, init: number, isPC: boolean, hp?: number, maxHp?: number) {
    onChange({
      initiative: [...campaign.initiative, { id: uuid(), name, init, isPC, hp, maxHp }],
    })
  }

  function patchEntry(id: string, patch: Partial<InitiativeEntry>) {
    onChange({ initiative: campaign.initiative.map(e => e.id === id ? { ...e, ...patch } : e) })
  }

  function removeEntry(id: string) {
    onChange({ initiative: campaign.initiative.filter(e => e.id !== id) })
  }

  function nextTurn() {
    if (sorted.length === 0) return
    onChange({ initiativeActive: (campaign.initiativeActive + 1) % sorted.length })
  }

  return (
    <div className="space-y-2">
      {/* Quick-add PCs */}
      <div className="flex flex-wrap gap-1.5">
        {campaign.characters
          .filter(c => !campaign.initiative.some(e => e.isPC && e.name === c.name))
          .map(c => (
            <button
              key={c.name}
              onClick={() => addEntry(c.name, modifier(c.abilities.dex) + 10, true, c.currentHp, c.maxHp)}
              className="px-2 py-0.5 rounded text-[10px] border border-amber-800/40 text-amber-500/80 hover:text-amber-300 hover:border-amber-600/50 transition-colors"
            >+ {c.name || 'Unnamed'}</button>
          ))}
      </div>

      {/* Add custom (monster/NPC) */}
      <div className="flex gap-1.5">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Monster / NPC name"
          className="flex-1 bg-amber-950/60 border border-amber-800/30 rounded-lg px-2 py-1 text-xs text-amber-200 placeholder:text-amber-800/40 focus:outline-none focus:border-amber-700/50"
          onKeyDown={e => {
            if (e.key === 'Enter' && newName.trim()) {
              addEntry(newName.trim(), Number(newInit) || 0, false)
              setNewName(''); setNewInit('')
            }
          }}
        />
        <input
          value={newInit}
          onChange={e => setNewInit(e.target.value)}
          placeholder="Init"
          type="number"
          className="w-14 bg-amber-950/60 border border-amber-800/30 rounded-lg px-2 py-1 text-xs text-amber-200 text-center placeholder:text-amber-800/40 focus:outline-none focus:border-amber-700/50"
        />
        <button
          onClick={() => {
            if (!newName.trim()) return
            addEntry(newName.trim(), Number(newInit) || 0, false)
            setNewName(''); setNewInit('')
          }}
          className="px-2.5 rounded-lg border border-amber-700/50 text-amber-400 hover:bg-amber-800/30 text-xs transition-colors"
        >＋</button>
      </div>

      {/* Turn order */}
      {sorted.length > 0 && (
        <>
          <div className="flex gap-2">
            <button
              onClick={nextTurn}
              className="flex-1 py-1.5 rounded-lg bg-amber-700/30 border border-amber-600/40 text-amber-200 text-xs font-bold uppercase tracking-widest hover:bg-amber-700/50 transition-colors"
            >▶ Next turn</button>
            <button
              onClick={() => onChange({ initiative: [], initiativeActive: -1 })}
              className="px-3 py-1.5 rounded-lg border border-red-900/40 text-red-500/70 text-xs hover:text-red-400 transition-colors"
            >Clear</button>
          </div>
          <div className="space-y-1">
            {sorted.map((e, i) => {
              const isActive = i === campaign.initiativeActive
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
                    isActive
                      ? 'bg-amber-700/30 border-amber-500/60'
                      : 'bg-amber-950/40 border-amber-900/40'
                  }`}
                >
                  {isActive && <span className="text-amber-300 text-xs">▶</span>}
                  <input
                    value={e.init}
                    type="number"
                    onChange={ev => patchEntry(e.id, { init: Number(ev.target.value) })}
                    className="w-10 bg-transparent text-center text-sm font-bold text-amber-200 focus:outline-none border-b border-transparent focus:border-amber-600/50"
                  />
                  <span className={`flex-1 text-xs truncate ${e.isPC ? 'text-amber-200' : 'text-red-300/90'}`}>
                    {e.name} {!e.isPC && <span className="text-[8px] uppercase text-red-500/60">NPC</span>}
                  </span>
                  {!e.isPC && (
                    <input
                      value={e.hp ?? ''}
                      type="number"
                      placeholder="HP"
                      onChange={ev => patchEntry(e.id, { hp: Number(ev.target.value) })}
                      className="w-12 bg-amber-950/60 border border-amber-900/40 rounded px-1 py-0.5 text-[10px] text-center text-amber-300 placeholder:text-amber-800/50 focus:outline-none"
                    />
                  )}
                  <button onClick={() => removeEntry(e.id)} className="text-amber-800/60 hover:text-red-400 text-xs">✕</button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Merged chronicle ──────────────────────────────────────────────────────────

function MergedChronicle({ characters }: { characters: Character[] }) {
  const [filter, setFilter] = useState<ChangeCategory | 'all'>('all')

  const merged = useMemo(() => {
    const all: Array<ChangelogEntry & { charName: string }> = []
    for (const c of characters) {
      for (const e of c.changelog ?? []) {
        all.push({ ...e, charName: c.name || 'Unnamed' })
      }
    }
    return all.sort((a, b) => b.timestamp - a.timestamp)
  }, [characters])

  const filtered = filter === 'all' ? merged : merged.filter(e => e.category === filter)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
            filter === 'all' ? 'bg-amber-700/40 border-amber-600/50 text-amber-200' : 'border-amber-800/30 text-amber-600/60'
          }`}
        >All</button>
        {(Object.keys(CATEGORY_META) as ChangeCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
              filter === cat ? 'bg-amber-700/40 border-amber-600/50 text-amber-200' : 'border-amber-800/30 text-amber-600/60'
            }`}
          >{CATEGORY_META[cat].label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-amber-800/50 italic text-center py-6">No events yet — import character sheets to see their chronicles merged here.</p>
      ) : (
        <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
          {filtered.slice(0, 200).map(e => (
            <div key={`${e.charName}-${e.id}`} className="flex items-baseline gap-2 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-900/30 text-xs">
              <span className="text-amber-400 font-semibold shrink-0">{e.charName}</span>
              <span className={`${CATEGORY_META[e.category]?.color ?? 'text-amber-300'} flex-1`}>{e.summary}</span>
              <span className="text-[9px] text-amber-800/60 shrink-0">{timeAgo(e.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main DM Mode component ────────────────────────────────────────────────────

export default function DMMode({ onExit }: { onExit: () => void }) {
  const [campaign, setCampaign] = useState<DMCampaign>(loadCampaign)
  const [expandedName, setExpandedName] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(DM_STORAGE_KEY, JSON.stringify(campaign))
  }, [campaign])

  function patch(p: Partial<DMCampaign>) {
    setCampaign(prev => ({ ...prev, ...p }))
  }

  function importFiles(files: FileList) {
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target?.result as string)
          const char: Character = { ...makeDefaultCharacter(), ...parsed }
          const name = char.name || 'Unnamed'
          setCampaign(prev => {
            const existing = prev.characters.findIndex(c => c.name === name)
            const characters = existing >= 0
              ? prev.characters.map((c, i) => i === existing ? char : c)
              : [...prev.characters, char]
            return { ...prev, characters, importedAt: { ...prev.importedAt, [name]: Date.now() } }
          })
        } catch {
          alert(`Could not read "${file.name}" — not a valid character JSON.`)
        }
      }
      reader.readAsText(file)
    })
  }

  function updateCharFromFile(index: number, file: File) {
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        const char: Character = { ...makeDefaultCharacter(), ...parsed }
        setCampaign(prev => ({
          ...prev,
          characters: prev.characters.map((c, i) => i === index ? char : c),
          importedAt: { ...prev.importedAt, [char.name || 'Unnamed']: Date.now() },
        }))
      } catch {
        alert('Could not read that file.')
      }
    }
    reader.readAsText(file)
  }

  function removeChar(index: number) {
    const name = campaign.characters[index]?.name
    if (!confirm(`Remove ${name || 'this character'} from the campaign?`)) return
    setCampaign(prev => ({
      ...prev,
      characters: prev.characters.filter((_, i) => i !== index),
      initiative: prev.initiative.filter(e => !(e.isPC && e.name === name)),
    }))
  }

  return (
    <div className="min-h-screen bg-[#130e06] text-amber-100 font-sans">
      {/* Header */}
      <header className="border-b border-amber-800/30 bg-gradient-to-b from-amber-950/60 to-transparent px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">
          <span className="text-2xl">🎲</span>
          <div className="flex-1 min-w-0">
            <input
              value={campaign.name}
              onChange={e => patch({ name: e.target.value })}
              placeholder="Campaign name…"
              className="bg-transparent text-2xl font-bold text-amber-100 placeholder-amber-800/50 focus:outline-none border-b-2 border-amber-800/30 focus:border-amber-600/50 pb-0.5 w-full max-w-md transition-colors"
            />
            <p className="text-[9px] uppercase tracking-widest text-amber-700/50 mt-1">
              DM Dashboard · {campaign.characters.length} character{campaign.characters.length === 1 ? '' : 's'}
            </p>
          </div>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-700/50 text-amber-400 hover:bg-amber-800/30 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer">
            ↑ Import sheets
            <input
              type="file" accept=".json,application/json" multiple className="hidden"
              onChange={e => { if (e.target.files?.length) importFiles(e.target.files); e.target.value = '' }}
            />
          </label>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-900/50 text-amber-700/60 hover:border-amber-700/50 hover:text-amber-400 text-xs font-bold uppercase tracking-widest transition-colors"
          >← My sheet</button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-5">
        {campaign.characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl mb-4">🗺️</span>
            <h2 className="text-lg font-bold text-amber-200 mb-2">No characters in this campaign yet</h2>
            <p className="text-sm text-amber-600/70 max-w-md mb-6">
              Ask your players to <b>Export</b> their character from the app and send you the JSON file.
              Import them here to see the whole party at a glance.
            </p>
            <label className="px-4 py-2 rounded-lg bg-amber-700/30 border border-amber-600/40 text-amber-200 text-sm font-bold cursor-pointer hover:bg-amber-700/50 transition-colors">
              ↑ Import character files
              <input
                type="file" accept=".json,application/json" multiple className="hidden"
                onChange={e => { if (e.target.files?.length) importFiles(e.target.files); e.target.value = '' }}
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Party column — spans 2 */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-[10px] uppercase tracking-widest text-amber-700/60 font-bold">Party</h2>
              {campaign.characters.map((c, i) => (
                <PartyCard
                  key={`${c.name}-${i}`}
                  char={c}
                  importedAt={campaign.importedAt[c.name || 'Unnamed']}
                  dmNote={campaign.dmNotes[c.name || 'Unnamed'] ?? ''}
                  onDmNote={note => patch({ dmNotes: { ...campaign.dmNotes, [c.name || 'Unnamed']: note } })}
                  onRemove={() => removeChar(i)}
                  onUpdate={file => updateCharFromFile(i, file)}
                  expanded={expandedName === (c.name || `idx${i}`)}
                  onToggle={() => setExpandedName(prev => prev === (c.name || `idx${i}`) ? null : (c.name || `idx${i}`))}
                />
              ))}

              {/* Merged chronicle below party on large screens */}
              <h2 className="text-[10px] uppercase tracking-widest text-amber-700/60 font-bold pt-3">Campaign chronicle</h2>
              <MergedChronicle characters={campaign.characters} />
            </div>

            {/* Initiative column */}
            <div className="space-y-3">
              <h2 className="text-[10px] uppercase tracking-widest text-amber-700/60 font-bold">⚔ Initiative</h2>
              <InitiativeTracker campaign={campaign} onChange={patch} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
