import { useState, useEffect } from 'react'
import type { InventoryItem } from '../types'
import { v4 as uuid } from '../uuid'
import { fetchWeapons, fetchArmor, fetchGear, fetchMiscItems, matchesEdition, type Edition } from '../data/fiveEtools'
import Autocomplete from './Autocomplete'
import EditionToggle from './EditionToggle'

interface Props {
  inventory: InventoryItem[]
  onChange: (inventory: InventoryItem[]) => void
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

export default function InventoryPanel({ inventory, onChange }: Props) {
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [searching, setSearching] = useState<Category | null>(null)
  const [edition, setEdition]     = useState<Edition>('2014')

  const [dbs, setDbs] = useState<Record<Category, InventoryItem[]>>({ weapon: [], armor: [], gear: [], misc: [] })
  const [loading, setLoading] = useState<Record<Category, boolean>>({ weapon: true, armor: true, gear: true, misc: true })

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
        .catch(() => {})
        .finally(() => setLoading(prev => ({ ...prev, [cat]: false })))
    }
  }, [])

  function update(id: string, updates: Partial<InventoryItem>) {
    onChange(inventory.map(it => it.id === id ? { ...it, ...updates } : it))
  }
  function remove(id: string) { onChange(inventory.filter(it => it.id !== id)) }
  function add(item: InventoryItem) { onChange([...inventory, item]) }

  const totalWeight = inventory.reduce((sum, it) => sum + it.weight * it.quantity, 0)

  return (
    <div className="space-y-4">
      {CATEGORIES.map(cat => {
        const items   = inventory.filter(it => it.category === cat)
        const db      = dbs[cat]
        const isLoading = loading[cat]
        const meta    = CATEGORY_META[cat]
        const filtered = db.filter(w => matchesEdition(w.source, edition))

        return (
          <div key={cat}>
            <div className="text-[10px] uppercase tracking-widest text-amber-600/70 mb-1.5">
              {meta.label}
            </div>

            <div className="space-y-1">
              {items.map(item => (
                <div key={item.id} className="bg-amber-950/30 border border-amber-800/30 rounded">
                  <div className="flex items-center gap-1.5 px-2 py-1">
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
                    <div className="border-t border-amber-800/20 p-2 space-y-2">
                      {cat === 'weapon' && (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            {(['damageDice','versatileDice','damageType'] as const).map(field => (
                              <div key={field}>
                                <span className="text-[9px] uppercase tracking-widest text-amber-600/50 block">
                                  {field === 'damageDice' ? 'Damage' : field === 'versatileDice' ? 'Versatile' : 'Type'}
                                </span>
                                <input
                                  value={(item as any)[field] ?? ''}
                                  onChange={e => update(item.id, { [field]: e.target.value })}
                                  className="bg-transparent text-amber-200/80 text-xs w-full"
                                  placeholder={field === 'damageDice' ? '1d8' : field === 'versatileDice' ? '1d10' : 'slashing'}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            {(['proficient','finesse','ranged'] as const).map(prop => (
                              <label key={prop} className="flex items-center gap-1 text-amber-300 capitalize">
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
                                />
                                {prop}
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                      {cat === 'armor' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] uppercase tracking-widest text-amber-600/50 block">Base AC</span>
                            <input
                              type="number"
                              value={item.armorClass ?? ''}
                              onChange={e => update(item.id, { armorClass: Number(e.target.value) })}
                              className="bg-transparent text-amber-200/80 text-xs w-full"
                              placeholder="11"
                            />
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-amber-600/50 block">Weight (ea)</span>
                          <input
                            type="number"
                            value={item.weight}
                            onChange={e => update(item.id, { weight: Number(e.target.value) })}
                            className="bg-transparent text-amber-200/80 text-xs w-full"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-amber-600/50 block">Notes</span>
                          <input
                            value={item.notes}
                            onChange={e => update(item.id, { notes: e.target.value })}
                            className="bg-transparent text-amber-200/80 text-xs w-full"
                          />
                        </div>
                      </div>
                      <button onClick={() => remove(item.id)} className="text-red-500/60 hover:text-red-400 text-xs">
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
                  toolbar={<EditionToggle value={edition} onChange={setEdition} />}
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

      <div className="text-right text-[10px] text-amber-600/50">
        Total weight: {totalWeight} lb
      </div>
    </div>
  )
}
