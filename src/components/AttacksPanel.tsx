import { useState } from 'react'
import type { AttackEntry } from '../types'
import { v4 as uuid } from '../uuid'

interface Props {
  attacks: AttackEntry[]
  onChange: (attacks: AttackEntry[]) => void
}

function blankAttack(): AttackEntry {
  return { id: uuid(), name: '', attackBonus: '', damageRoll: '', damageType: '', notes: '' }
}

export default function AttacksPanel({ attacks, onChange }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  function update(id: string, updates: Partial<AttackEntry>) {
    onChange(attacks.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  function remove(id: string) {
    onChange(attacks.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_60px_80px_24px] gap-1 text-[9px] uppercase tracking-widest text-amber-600/50 px-1">
        <span>Name</span>
        <span>Atk Bonus</span>
        <span>Damage</span>
        <span />
      </div>

      {attacks.map(atk => (
        <div key={atk.id} className="bg-amber-950/30 border border-amber-800/30 rounded">
          <div className="grid grid-cols-[1fr_60px_80px_24px] gap-1 p-1 items-center">
            <input
              value={atk.name}
              onChange={e => update(atk.id, { name: e.target.value })}
              className="bg-transparent text-amber-100 text-xs px-1"
              placeholder="Longsword"
            />
            <input
              value={atk.attackBonus}
              onChange={e => update(atk.id, { attackBonus: e.target.value })}
              className="bg-transparent text-amber-300 text-xs text-center"
              placeholder="+5"
            />
            <input
              value={atk.damageRoll}
              onChange={e => update(atk.id, { damageRoll: e.target.value })}
              className="bg-transparent text-amber-100 text-xs text-center"
              placeholder="1d8+3 slash"
            />
            <button
              onClick={() => setExpanded(expanded === atk.id ? null : atk.id)}
              className="text-amber-600/50 hover:text-amber-400 text-xs"
            >
              ⋯
            </button>
          </div>
          {expanded === atk.id && (
            <div className="border-t border-amber-800/30 p-2 space-y-1">
              <input
                value={atk.notes}
                onChange={e => update(atk.id, { notes: e.target.value })}
                className="bg-transparent text-amber-200/70 text-xs w-full"
                placeholder="Notes (finesse, reach, etc.)"
              />
              <button
                onClick={() => remove(atk.id)}
                className="text-red-500/60 hover:text-red-400 text-xs"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => onChange([...attacks, blankAttack()])}
        className="w-full text-xs text-amber-600/60 hover:text-amber-400 border border-dashed border-amber-800/40 rounded py-1 transition-colors"
      >
        + Add Attack
      </button>
    </div>
  )
}
