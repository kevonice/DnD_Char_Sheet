import { useState } from 'react'
import type { InventoryItem } from '../types'
import { SRD_WEAPONS, weaponTemplateToItem } from '../weapons'
import { v4 as uuid } from '../uuid'

interface Props {
  inventory: InventoryItem[]
  onChange: (inventory: InventoryItem[]) => void
}

function blankItem(category: InventoryItem['category']): InventoryItem {
  const base: InventoryItem = {
    id: uuid(),
    name: '',
    quantity: 1,
    weight: 0,
    category,
    equipped: false,
    notes: '',
  }
  if (category === 'weapon') {
    return { ...base, damageDice: '1d6', damageType: 'slashing', properties: [], proficient: true }
  }
  return base
}

const CATEGORY_LABELS: Record<InventoryItem['category'], string> = {
  weapon: 'Weapons',
  armor: 'Armor',
  gear: 'Gear',
}

export default function InventoryPanel({ inventory, onChange }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showWeaponPicker, setShowWeaponPicker] = useState(false)

  function update(id: string, updates: Partial<InventoryItem>) {
    onChange(inventory.map(it => (it.id === id ? { ...it, ...updates } : it)))
  }
  function remove(id: string) {
    onChange(inventory.filter(it => it.id !== id))
  }
  function add(item: InventoryItem) {
    onChange([...inventory, item])
  }

  const totalWeight = inventory.reduce((sum, it) => sum + it.weight * it.quantity, 0)

  const categories: InventoryItem['category'][] = ['weapon', 'armor', 'gear']

  return (
    <div className="space-y-3">
      {categories.map(cat => {
        const items = inventory.filter(it => it.category === cat)
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-amber-600/70">
                {CATEGORY_LABELS[cat]}
              </span>
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
                      placeholder={cat === 'weapon' ? 'Weapon name' : cat === 'armor' ? 'Armor name' : 'Item name'}
                    />
                    <input
                      type="number"
                      min={1}
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
                    <button
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      className="text-amber-600/40 hover:text-amber-400 text-xs flex-shrink-0"
                    >
                      ⋯
                    </button>
                  </div>

                  {expanded === item.id && (
                    <div className="border-t border-amber-800/20 p-2 space-y-2">
                      {cat === 'weapon' && (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-[9px] uppercase tracking-widest text-amber-600/50 block">Damage</span>
                              <input
                                value={item.damageDice ?? ''}
                                onChange={e => update(item.id, { damageDice: e.target.value })}
                                className="bg-transparent text-amber-200/80 text-xs w-full"
                                placeholder="1d8"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-widest text-amber-600/50 block">Versatile</span>
                              <input
                                value={item.versatileDice ?? ''}
                                onChange={e => update(item.id, { versatileDice: e.target.value })}
                                className="bg-transparent text-amber-200/80 text-xs w-full"
                                placeholder="1d10"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-widest text-amber-600/50 block">Type</span>
                              <input
                                value={item.damageType ?? ''}
                                onChange={e => update(item.id, { damageType: e.target.value })}
                                className="bg-transparent text-amber-200/80 text-xs w-full"
                                placeholder="slashing"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <label className="flex items-center gap-1 text-amber-300">
                              <input
                                type="checkbox"
                                checked={item.proficient ?? false}
                                onChange={e => update(item.id, { proficient: e.target.checked })}
                              />
                              Proficient
                            </label>
                            <label className="flex items-center gap-1 text-amber-300">
                              <input
                                type="checkbox"
                                checked={item.properties?.includes('finesse') ?? false}
                                onChange={e => {
                                  const set = new Set(item.properties ?? [])
                                  e.target.checked ? set.add('finesse') : set.delete('finesse')
                                  update(item.id, { properties: [...set] })
                                }}
                              />
                              Finesse
                            </label>
                            <label className="flex items-center gap-1 text-amber-300">
                              <input
                                type="checkbox"
                                checked={item.properties?.includes('ranged') ?? false}
                                onChange={e => {
                                  const set = new Set(item.properties ?? [])
                                  e.target.checked ? set.add('ranged') : set.delete('ranged')
                                  update(item.id, { properties: [...set] })
                                }}
                              />
                              Ranged
                            </label>
                          </div>
                        </>
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
                      <button
                        onClick={() => remove(item.id)}
                        className="text-red-500/60 hover:text-red-400 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add buttons per category */}
              {cat === 'weapon' ? (
                <div className="relative">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowWeaponPicker(!showWeaponPicker)}
                      className="flex-1 text-xs text-amber-600/60 hover:text-amber-400 border border-dashed border-amber-800/40 rounded py-1 transition-colors"
                    >
                      + Add from SRD
                    </button>
                    <button
                      onClick={() => add(blankItem('weapon'))}
                      className="flex-1 text-xs text-amber-600/60 hover:text-amber-400 border border-dashed border-amber-800/40 rounded py-1 transition-colors"
                    >
                      + Custom weapon
                    </button>
                  </div>
                  {showWeaponPicker && (
                    <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-amber-950 border border-amber-700/50 rounded shadow-xl">
                      {SRD_WEAPONS.map(w => (
                        <button
                          key={w.name}
                          onClick={() => {
                            add(weaponTemplateToItem(w, uuid()))
                            setShowWeaponPicker(false)
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-amber-900/60 text-amber-100"
                        >
                          <span>{w.name}</span>
                          <span className="text-amber-500/60">{w.damageDice} {w.damageType}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => add(blankItem(cat))}
                  className="w-full text-xs text-amber-600/60 hover:text-amber-400 border border-dashed border-amber-800/40 rounded py-1 transition-colors"
                >
                  + Add {cat}
                </button>
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
