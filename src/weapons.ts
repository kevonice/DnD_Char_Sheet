import type { InventoryItem, WeaponProperty } from './types'

// A small set of SRD (open-content) weapons for quick-add.
// Later this can be replaced/augmented by a 5e.tools data pull.
export interface WeaponTemplate {
  name: string
  damageDice: string
  versatileDice?: string
  damageType: string
  properties: WeaponProperty[]
  weight: number
}

export const SRD_WEAPONS: WeaponTemplate[] = [
  // Simple melee
  { name: 'Club', damageDice: '1d4', damageType: 'bludgeoning', properties: ['light'], weight: 2 },
  { name: 'Dagger', damageDice: '1d4', damageType: 'piercing', properties: ['finesse', 'light', 'thrown'], weight: 1 },
  { name: 'Handaxe', damageDice: '1d6', damageType: 'slashing', properties: ['light', 'thrown'], weight: 2 },
  { name: 'Javelin', damageDice: '1d6', damageType: 'piercing', properties: ['thrown'], weight: 2 },
  { name: 'Mace', damageDice: '1d6', damageType: 'bludgeoning', properties: [], weight: 4 },
  { name: 'Quarterstaff', damageDice: '1d6', versatileDice: '1d8', damageType: 'bludgeoning', properties: ['versatile'], weight: 4 },
  { name: 'Spear', damageDice: '1d6', versatileDice: '1d8', damageType: 'piercing', properties: ['thrown', 'versatile'], weight: 3 },
  // Simple ranged
  { name: 'Light Crossbow', damageDice: '1d8', damageType: 'piercing', properties: ['ranged', 'loading', 'ammunition', 'two-handed'], weight: 5 },
  { name: 'Shortbow', damageDice: '1d6', damageType: 'piercing', properties: ['ranged', 'ammunition', 'two-handed'], weight: 2 },
  { name: 'Sling', damageDice: '1d4', damageType: 'bludgeoning', properties: ['ranged', 'ammunition'], weight: 0 },
  // Martial melee
  { name: 'Battleaxe', damageDice: '1d8', versatileDice: '1d10', damageType: 'slashing', properties: ['versatile'], weight: 4 },
  { name: 'Greataxe', damageDice: '1d12', damageType: 'slashing', properties: ['heavy', 'two-handed'], weight: 7 },
  { name: 'Greatsword', damageDice: '2d6', damageType: 'slashing', properties: ['heavy', 'two-handed'], weight: 6 },
  { name: 'Longsword', damageDice: '1d8', versatileDice: '1d10', damageType: 'slashing', properties: ['versatile'], weight: 3 },
  { name: 'Maul', damageDice: '2d6', damageType: 'bludgeoning', properties: ['heavy', 'two-handed'], weight: 10 },
  { name: 'Rapier', damageDice: '1d8', damageType: 'piercing', properties: ['finesse'], weight: 2 },
  { name: 'Scimitar', damageDice: '1d6', damageType: 'slashing', properties: ['finesse', 'light'], weight: 3 },
  { name: 'Shortsword', damageDice: '1d6', damageType: 'piercing', properties: ['finesse', 'light'], weight: 2 },
  { name: 'Warhammer', damageDice: '1d8', versatileDice: '1d10', damageType: 'bludgeoning', properties: ['versatile'], weight: 2 },
  // Martial ranged
  { name: 'Longbow', damageDice: '1d8', damageType: 'piercing', properties: ['ranged', 'heavy', 'ammunition', 'two-handed'], weight: 2 },
  { name: 'Heavy Crossbow', damageDice: '1d10', damageType: 'piercing', properties: ['ranged', 'heavy', 'loading', 'ammunition', 'two-handed'], weight: 18 },
]

export function weaponTemplateToItem(t: WeaponTemplate, id: string): InventoryItem {
  return {
    id,
    name: t.name,
    quantity: 1,
    weight: t.weight,
    category: 'weapon',
    equipped: false,
    notes: '',
    damageDice: t.damageDice,
    versatileDice: t.versatileDice,
    damageType: t.damageType,
    properties: t.properties,
    proficient: true,
  }
}
