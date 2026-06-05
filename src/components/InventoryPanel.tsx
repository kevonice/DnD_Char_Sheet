import { useState, useEffect } from 'react'
import type { InventoryItem } from '../types'
import { v4 as uuid } from '../uuid'
import { fetchWeapons, fetchArmor, fetchGear, fetchMiscItems, matchesSourceGroups, SOURCE_GROUPS, DEFAULT_SOURCE_GROUPS, type SourceGroup } from '../data/fiveEtools'
import Autocomplete from './Autocomplete'

interface Props {
  inventory: InventoryItem[]
  str: number
  onChange: (inventory: InventoryItem[]) => void
}

// Renders 5etools description as formatted paragraphs with an Edit toggle
function DescriptionBlock({ text, onEdit }: { text: string; onEdit: (t: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)

  if (editing) {
    return (
      <div className="space-y-1.5">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="bg-amber-950/30 border border-amber-700/40 rounded-lg px-2.5 py-2 text-xs text-amber-200/80 w-full resize-none focus:outline-none focus:border-amber-600/50"
          rows={5}
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={() => { onEdit(draft); setEditing(false) }}
            className="text-[10px] px-2 py-0.5 bg-amber-700/40 hover:bg-amber-600/50 rounded text-amber-200 transition-colors">
            Save
          </button>
          <button onClick={() => { setDraft(text); setEditing(false) }}
            className="text-[10px] text-amber-700/50 hover:text-amber-500">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Split on double-newline for paragraph breaks, single newline for line breaks
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  return (
    <div className="group relative">
      <div className="bg-amber-950/30 border border-amber-800/20 rounded-lg px-2.5 py-2 space-y-1.5 max-h-40 overflow-y-auto">
        {paragraphs.map((para, i) => {
          // Detect "Label: content" lines (from flattenEntries name: prefix)
          const labelMatch = para.match(/^([^:]{1,30}):\s*(.+)$/s)
          if (labelMatch) {
            return (
              <div key={i}>
                <span className="text-[9px] uppercase tracking-wider text-amber-500/70 font-bold">{labelMatch[1]}</span>
                <p className="text-[11px] text-amber-200/70 leading-relaxed mt-0.5">{labelMatch[2]}</p>
              </div>
            )
          }
          return <p key={i} className="text-[11px] text-amber-200/70 leading-relaxed">{para}</p>
        })}
      </div>
      <button
        onClick={() => { setDraft(text); setEditing(true) }}
        className="absolute top-1.5 right-1.5 text-[9px] text-amber-700/40 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        edit
      </button>
    </div>
  )
}

type Category = InventoryItem['category']

const CATEGORY_META: Record<Category, { label: string; addLabel: string }> = {
  weapon:  { label: 'Weapons',         addLabel: 'weapon' },
  armor:   { label: 'Armor & Shields',  addLabel: 'armor' },
  gear:    { label: 'Gear & Tools',     addLabel: 'gear' },
  misc:    { label: 'Items & Magic',    addLabel: 'item' },
}

const CATEGORIES: Category[] = ['weapon', 'armor', 'gear', 'misc']

function blankItem(category: Category): InventoryItem {
  const base: InventoryItem = { id: uuid(), name: '', quantity: 1, weight: 0, category, equipped: false, notes: '' }
  if (category === 'weapon') return { ...base, damageDice: '1d6', damageType: 'slashing', properties: [], proficient: true }
  return base
}

export default function InventoryPanel({ inventory, str, onChange }: Props) {
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [searching, setSearching] = useState<Category | null>(null)
  const [activeGroups, setActiveGroups] = useState<SourceGroup[]>(DEFAULT_SOURCE_GROUPS)
  const [confirmRemove, setConfirmRemove] = useState<InventoryItem | null>(null)

  const [dbs, setDbs] = useState<Record<Category, InventoryItem[]>>({ weapon: [], armor: [], gear: [], misc: [] })
  const [loading, setLoading] = useState<Record<Category, boolean>>({ weapon: true, armor: true, gear: true, misc: true })
  const [errors, setErrors] = useState<Partial<Record<Category, string>>>({})

  useEffect(() => {
    const loaders: [Category, () => Promise<InventoryItem[]>][] = [
      ['weapon', fetchWeapons],
      ['armor',  fetchArmor],
      ['gear',   fetchGear],
      ['misc',   fetchMiscItems],
    ]
    for (const [cat, fetcher] of loaders) {
      fetcher()
        .then(items => setDbs(prev => ({ ...prev, [cat]: items })))
        .catch(err => setErrors(prev => ({ ...prev, [cat]: String(err?.message ?? err) })))
        .finally(() => setLoading(prev => ({ ...prev, [cat]: false })))
    }
  }, [])

  function update(id: string, updates: Partial<InventoryItem>) {
    onChange(inventory.map(it => it.id === id ? { ...it, ...updates } : it))
  }
  function remove(id: string) { onChange(inventory.filter(it => it.id !== id)) }
  function add(item: InventoryItem) { onChange([...inventory, item]) }

  function clearDataCache() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('fiveEtools_'))
      .forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  const carryCapacity = str * 15
  const totalWeightCarried = inventory.reduce((sum, it) => sum + it.weight * it.quantity, 0)
  const pct = Math.min(totalWeightCarried / carryCapacity, 1)
  const overencumbered = totalWeightCarried > carryCapacity

  return (
    <div className="space-y-4">
      {/* Encumbrance bar */}
      <div>
        <div className="flex justify-between text-[9px] text-amber-600/60 mb-1">
          <span className={overencumbered ? 'text-red-400 font-bold' : ''}>
            {overencumbered ? '⚠ Encumbered · ' : ''}{totalWeightCarried.toFixed(1)} lb
          </span>
          <span>Capacity: {carryCapacity} lb</span>
        </div>
        <div className="h-1.5 bg-amber-950/60 rounded-full overflow-hidden border border-amber-800/30">
          <div
            className={`h-full rounded-full transition-all ${overencumbered ? 'bg-red-500/70' : 'bg-amber-500/60'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>

      {CATEGORIES.map(cat => {
        const items   = inventory.filter(it => it.category === cat)
        const db      = dbs[cat]
        const isLoading = loading[cat]
        const meta    = CATEGORY_META[cat]
        const filtered = db.filter(w => matchesSourceGroups(w.source, activeGroups))

        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-amber-600/70">
                {meta.label}
              </span>
              <span className="text-[9px] text-amber-700/60">
                {isLoading
                  ? 'loading…'
                  : errors[cat]
                    ? <span className="text-red-400">⚠ {errors[cat]}</span>
                    : `${db.length} in db · ${filtered.length} shown`}
              </span>
            </div>

            <div className="space-y-1">
              {items.map(item => (
                <div key={item.id} className="bg-amber-950/30 border border-amber-800/30 rounded">
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    {/* remove */}
                    <button
                      title="Remove item"
                      onClick={() => setConfirmRemove(item)}
                      className="text-amber-700/40 hover:text-red-400 text-sm flex-shrink-0 transition-colors"
                    >
                      🗑
                    </button>

                    {/* equip toggle */}
                    <button
                      title={item.equipped ? 'Equipped' : 'Not equipped'}
                      onClick={() => update(item.id, { equipped: !item.equipped })}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 transition-colors ${
                        item.equipped
                          ? 'bg-green-600/30 border-green-500/60 text-green-200'
                          : 'border-amber-800/40 text-amber-700/50 hover:border-amber-600/60'
                      }`}
                    >
                      {item.equipped ? 'E' : '—'}
                    </button>

                    <input
                      value={item.name}
                      onChange={e => update(item.id, { name: e.target.value })}
                      className="bg-transparent text-amber-100 text-sm flex-1 min-w-0"
                      placeholder={`${meta.addLabel} name`}
                    />

                    <input
                      type="number" min={1}
                      value={item.quantity}
                      onChange={e => update(item.id, { quantity: Number(e.target.value) })}
                      className="bg-transparent text-amber-300 text-xs w-8 text-center"
                      title="Quantity"
                    />

                    {cat === 'weapon' && (
                      <span className="text-amber-500/60 text-xs w-20 text-right truncate">
                        {item.damageDice} {item.damageType?.slice(0, 4)}
                      </span>
                    )}
                    {cat === 'armor' && item.armorClass != null && (
                      <span className="text-amber-500/60 text-xs w-14 text-right">AC {item.armorClass}</span>
                    )}
                    {item.source && (
                      <span className="text-amber-700/50 text-[9px] flex-shrink-0">{item.source}</span>
                    )}

                    <button
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      className="text-amber-600/40 hover:text-amber-400 text-xs flex-shrink-0"
                    >⋯</button>
                  </div>

                  {expanded === item.id && (
                    <div className="border-t border-amber-800/20 p-2.5 space-y-3">

                      {/* ── Category-specific stats row ── */}
                      {cat === 'weapon' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { field: 'damageDice',    label: 'Damage',    placeholder: '1d8' },
                              { field: 'versatileDice', label: 'Versatile', placeholder: '1d10' },
                              { field: 'damageType',    label: 'Dmg Type',  placeholder: 'slashing' },
                            ] as const).map(({ field, label, placeholder }) => (
                              <div key={field} className="bg-amber-950/40 rounded-lg px-2 py-1.5">
                                <span className="text-[8px] uppercase tracking-widest text-amber-600/50 block mb-0.5">{label}</span>
                                <input
                                  value={(item as any)[field] ?? ''}
                                  onChange={e => update(item.id, { [field]: e.target.value })}
                                  className="bg-transparent text-amber-200 text-xs w-full focus:outline-none"
                                  placeholder={placeholder}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-xs px-0.5">
                            {(['proficient','finesse','ranged'] as const).map(prop => (
                              <label key={prop} className="flex items-center gap-1.5 text-amber-400/80 capitalize cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={prop === 'proficient' ? (item.proficient ?? false) : (item.properties?.includes(prop as any) ?? false)}
                                  onChange={e => {
                                    if (prop === 'proficient') {
                                      update(item.id, { proficient: e.target.checked })
                                    } else {
                                      const set = new Set(item.properties ?? [])
                                      e.target.checked ? set.add(prop as any) : set.delete(prop as any)
                                      update(item.id, { properties: [...set] })
                                    }
                                  }}
                                  className="accent-amber-500"
                                />
                                {prop}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {cat === 'armor' && (
                        <div className="flex gap-2">
                          <div className="bg-amber-950/40 rounded-lg px-2 py-1.5 w-24">
                            <span className="text-[8px] uppercase tracking-widest text-amber-600/50 block mb-0.5">Base AC</span>
                            <input
                              type="number"
                              value={item.armorClass ?? ''}
                              onChange={e => update(item.id, { armorClass: Number(e.target.value) })}
                              className="bg-transparent text-amber-200 text-xs w-full focus:outline-none"
                              placeholder="11"
                            />
                          </div>
                        </div>
                      )}

                      {/* ── Weight + Notes ── */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-amber-950/40 rounded-lg px-2 py-1.5">
                          <span className="text-[8px] uppercase tracking-widest text-amber-600/50 block mb-0.5">Weight (ea)</span>
                          <input
                            type="number"
                            value={item.weight}
                            onChange={e => update(item.id, { weight: Number(e.target.value) })}
                            className="bg-transparent text-amber-200 text-xs w-full focus:outline-none"
                          />
                        </div>
                        <div className="bg-amber-950/40 rounded-lg px-2 py-1.5">
                          <span className="text-[8px] uppercase tracking-widest text-amber-600/50 block mb-0.5">Notes</span>
                          <input
                            value={item.notes}
                            onChange={e => update(item.id, { notes: e.target.value })}
                            className="bg-transparent text-amber-200 text-xs w-full focus:outline-none"
                            placeholder="e.g. cursed, silvered…"
                          />
                        </div>
                      </div>

                      {/* ── Description ── */}
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-amber-600/50 block mb-1">Description</span>
                        {item.description && !item.description.startsWith('_edited_') ? (
                          // 5etools-sourced description: readable block + edit toggle
                          <DescriptionBlock
                            text={item.description}
                            onEdit={text => update(item.id, { description: text })}
                          />
                        ) : (
                          <textarea
                            value={(item.description ?? '').replace('_edited_', '')}
                            onChange={e => update(item.id, { description: e.target.value })}
                            className="bg-amber-950/30 border border-amber-800/20 rounded-lg px-2.5 py-2 text-xs text-amber-200/80 w-full resize-none focus:outline-none focus:border-amber-700/40 placeholder-amber-800/40"
                            rows={4}
                            placeholder="Item description…"
                          />
                        )}
                      </div>

                      <button onClick={() => setConfirmRemove(item)} className="text-red-500/60 hover:text-red-400 text-xs">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Search / add row */}
              {searching === cat ? (
                <Autocomplete
                  options={filtered}
                  getLabel={w => w.name}
                  getSublabel={w => {
                    if (cat === 'weapon') return `${w.damageDice ?? ''} ${w.damageType ?? ''} · ${w.source ?? ''}`.trim()
                    if (cat === 'armor')  return `AC ${w.armorClass ?? '?'} · ${w.source ?? ''}`.trim()
                    return w.source ?? ''
                  }}
                  loading={isLoading}
                  loadedCount={filtered.length}
                  placeholder={`Search ${meta.label.toLowerCase()}…`}
                  toolbar={
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(SOURCE_GROUPS) as SourceGroup[]).map(g => {
                        const on = activeGroups.includes(g)
                        return (
                          <button
                            key={g}
                            onClick={() => setActiveGroups(prev =>
                              on
                                ? prev.filter(x => x !== g)
                                : [...prev, g]
                            )}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-colors ${
                              on
                                ? 'bg-amber-700/50 border-amber-600/60 text-amber-100'
                                : 'border-amber-800/40 text-amber-700/50 hover:border-amber-600/40 hover:text-amber-500'
                            }`}
                          >
                            {SOURCE_GROUPS[g].label}
                          </button>
                        )
                      })}
                    </div>
                  }
                  onSelect={w => { add({ ...w, id: uuid() }); setSearching(null) }}
                />
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={() => setSearching(cat)}
                    className="flex-1 text-xs text-amber-600/60 hover:text-amber-400 border border-dashed border-amber-800/40 rounded py-1 transition-colors"
                  >
                    + Search 5e.tools
                  </button>
                  <button
                    onClick={() => add(blankItem(cat))}
                    className="flex-1 text-xs text-amber-600/60 hover:text-amber-400 border border-dashed border-amber-800/40 rounded py-1 transition-colors"
                  >
                    + Custom {meta.addLabel}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      <div className="flex items-center justify-between text-[10px] text-amber-600/50">
        <button
          onClick={clearDataCache}
          className="text-amber-700/50 hover:text-amber-400 underline decoration-dotted"
        >
          Reload 5e.tools data
        </button>
        <span>Total weight: {totalWeightCarried.toFixed(1)} lb</span>
      </div>

      {confirmRemove && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmRemove(null)}
        >
          <div
            className="bg-[#1e1206] border border-amber-700/50 rounded-lg shadow-2xl p-5 max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-amber-100 text-sm font-bold mb-2">Remove item?</h3>
            <p className="text-amber-200/70 text-xs mb-4">
              Are you sure you want to remove
              {confirmRemove.name ? <> <span className="text-amber-300 font-medium">{confirmRemove.name}</span></> : ' this item'}?
              This can't be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="px-3 py-1.5 text-xs rounded border border-amber-800/50 text-amber-300 hover:bg-amber-900/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { remove(confirmRemove.id); setConfirmRemove(null) }}
                className="px-3 py-1.5 text-xs rounded bg-red-700/70 hover:bg-red-600 text-red-50 font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
