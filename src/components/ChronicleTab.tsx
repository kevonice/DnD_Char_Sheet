import { useState } from 'react'
import type { Character, ChangelogEntry, ChangeCategory } from '../types'

interface Props {
  char: Character
  onChange: (updates: Partial<Character>) => void
}

const CATEGORY_META: Record<ChangeCategory, { icon: string; color: string; label: string }> = {
  combat:      { icon: '⚔️',  color: 'text-red-400',    label: 'Combat'      },
  inventory:   { icon: '🎒',  color: 'text-green-400',  label: 'Inventory'   },
  magic:       { icon: '✨',  color: 'text-purple-400', label: 'Magic'       },
  progression: { icon: '⬆️',  color: 'text-amber-300',  label: 'Progression' },
  note:        { icon: '📜',  color: 'text-blue-400',   label: 'Note'        },
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function groupByDay(entries: ChangelogEntry[]): { day: string; items: ChangelogEntry[] }[] {
  const map = new Map<string, ChangelogEntry[]>()
  for (const e of entries) {
    const key = new Date(e.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items })).reverse()
}

export default function ChronicleTab({ char, onChange }: Props) {
  const [filter, setFilter] = useState<ChangeCategory | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const allEntries = [...(char.changelog ?? [])].sort((a, b) => b.timestamp - a.timestamp)
  const filtered = filter === 'all' ? allEntries : allEntries.filter(e => e.category === filter)
  const groups = groupByDay(filtered)

  function addNote() {
    const text = noteText.trim()
    if (!text) return
    const entry: ChangelogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      category: 'note',
      summary: text,
    }
    onChange({ changelog: [...(char.changelog ?? []), entry] })
    setNoteText('')
  }

  function deleteEntry(id: string) {
    onChange({ changelog: (char.changelog ?? []).filter(e => e.id !== id) })
  }

  const counts = Object.fromEntries(
    (Object.keys(CATEGORY_META) as ChangeCategory[]).map(k => [k, allEntries.filter(e => e.category === k).length])
  )

  return (
    <div className="space-y-3">

      {/* ── Add manual note ── */}
      <div className="flex gap-2">
        <input
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNote()}
          placeholder="Add a note to the chronicle…"
          className="flex-1 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-1.5 text-sm text-amber-100 placeholder-amber-700/60 focus:outline-none focus:border-amber-600/50"
        />
        <button
          onClick={addNote}
          disabled={!noteText.trim()}
          className="px-3 py-1.5 bg-amber-800/30 hover:bg-amber-700/40 border border-amber-700/30 rounded-lg text-amber-400 text-xs disabled:opacity-30 transition-colors"
        >
          + Note
        </button>
      </div>

      {/* ── Category filter chips ── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
            filter === 'all'
              ? 'bg-amber-800/50 border-amber-600/50 text-amber-200'
              : 'border-amber-800/30 text-amber-700/60 hover:text-amber-400'
          }`}
        >
          All ({allEntries.length})
        </button>
        {(Object.entries(CATEGORY_META) as [ChangeCategory, typeof CATEGORY_META[ChangeCategory]][]).map(([key, meta]) => (
          counts[key] > 0 && (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                filter === key
                  ? 'bg-amber-800/50 border-amber-600/50 text-amber-200'
                  : 'border-amber-800/30 text-amber-700/60 hover:text-amber-400'
              }`}
            >
              {meta.icon} {meta.label} ({counts[key]})
            </button>
          )
        ))}
      </div>

      {/* ── Empty state ── */}
      {groups.length === 0 && (
        <div className="text-center py-12 text-amber-700/40">
          <div className="text-4xl mb-3">📜</div>
          <p className="text-sm">The chronicle is empty.</p>
          <p className="text-xs mt-1">Changes to HP, inventory, spells, and level will appear here.</p>
        </div>
      )}

      {/* ── Timeline ── */}
      {groups.map(({ day, items }) => (
        <div key={day}>
          <div className="text-[10px] uppercase tracking-widest text-amber-700/50 px-1 mb-1.5 flex items-center gap-2">
            <span>{day}</span>
            <span className="flex-1 border-t border-amber-800/20" />
          </div>
          <div className="space-y-1">
            {items.map(entry => {
              const meta = CATEGORY_META[entry.category]
              const isOpen = expanded === entry.id
              return (
                <div
                  key={entry.id}
                  className="bg-amber-950/25 border border-amber-800/20 rounded-lg overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <span className="text-sm flex-shrink-0">{meta.icon}</span>
                    <span className={`flex-1 text-sm ${meta.color}`}>{entry.summary}</span>
                    <span className="text-[10px] text-amber-700/40 flex-shrink-0">{formatTime(entry.timestamp)}</span>
                    {entry.detail && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : entry.id)}
                        className="text-amber-700/40 hover:text-amber-500 text-xs flex-shrink-0"
                      >
                        {isOpen ? '▲' : '▼'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-amber-800/40 hover:text-red-500/60 text-[10px] flex-shrink-0 ml-0.5"
                      title="Remove entry"
                    >
                      ✕
                    </button>
                  </div>
                  {isOpen && entry.detail && (
                    <div className="px-3 pb-2 text-xs text-amber-600/60 border-t border-amber-800/20 pt-1.5">
                      {entry.detail}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
