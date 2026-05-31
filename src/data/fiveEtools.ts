import type { InventoryItem, Spell, WeaponProperty } from '../types'
import { v4 as uuid } from '../uuid'

// ---------------------------------------------------------------------------
// 5etools raw data shapes (simplified — only the fields we use)
// ---------------------------------------------------------------------------

interface RawItem {
  name: string
  source?: string
  type?: string        // "M" martial melee, "R" martial ranged, "S" simple, "A" ammo, etc.
  weight?: number
  value?: number       // in copper pieces
  dmg1?: string
  dmg2?: string
  dmgType?: string     // "S" slashing, "P" piercing, "B" bludgeoning
  property?: string[]  // "F", "L", "H", "T", "V", "2H", "LD", "R", "A"
  range?: string
  entries?: (string | Record<string, unknown>)[]
  weaponCategory?: string
  sword?: boolean
  axe?: boolean
  bow?: boolean
  spear?: boolean
  polearm?: boolean
  firearm?: boolean
}

interface RawItemFile {
  baseitem?: RawItem[]
  item?: RawItem[]
  itemGroup?: RawItem[]
}

// 5etools suffixes type/property codes with the source, e.g. "M|PHB", "2H|PHB".
// Strip the "|SOURCE" part to get the bare code.
function bareCode(code?: string): string {
  if (!code) return ''
  const pipe = code.indexOf('|')
  return pipe === -1 ? code : code.slice(0, pipe)
}

interface RawSpell {
  name: string
  source?: string
  level: number
  school: string   // "A" abjuration, "C" conjuration, "D" divination, "E" enchantment,
                   // "I" illusion, "N" necromancy, "T" transmutation, "V" evocation
  time?: { number: number; unit: string }[]
  range?: {
    type?: string
    distance?: { type?: string; amount?: number }
  }
  components?: { v?: boolean; s?: boolean; m?: boolean | string | { text: string } }
  duration?: { type?: string; concentration?: boolean; duration?: { type: string; amount?: number } }[]
  entries?: unknown[]
  classes?: {
    fromClassList?: { name: string; source: string }[]
    fromSubclass?: { class: { name: string }; subclass: { name: string } }[]
  }
  concentration?: boolean
}

interface RawSpellFile {
  spell: RawSpell[]
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const DAMAGE_TYPE_MAP: Record<string, string> = {
  S: 'slashing',
  P: 'piercing',
  B: 'bludgeoning',
  F: 'fire',
  C: 'cold',
  A: 'acid',
  L: 'lightning',
  T: 'thunder',
  N: 'necrotic',
  R: 'radiant',
  O: 'poison',
  Y: 'psychic',
  I: 'force',
}

const SCHOOL_MAP: Record<string, string> = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
  V: 'Evocation',
}

const PROP_MAP: Record<string, WeaponProperty> = {
  F: 'finesse',
  L: 'light',
  H: 'heavy',
  T: 'thrown',
  V: 'versatile',
  '2H': 'two-handed',
  LD: 'loading',
  R: 'reach',
  A: 'ammunition',
}

function isWeapon(item: RawItem): boolean {
  // Any base item that deals damage is treated as a weapon for our purposes.
  return !!item.dmg1
}

function mapProperties(raw: string[] = []): WeaponProperty[] {
  return raw
    .map(p => PROP_MAP[bareCode(p)])
    .filter((p): p is WeaponProperty => Boolean(p))
}

function mapItem(raw: RawItem): InventoryItem {
  const props = mapProperties(raw.property)
  const isRanged = bareCode(raw.type) === 'R' || props.includes('ammunition')
  if (isRanged && !props.includes('ranged')) props.push('ranged')

  return {
    id: uuid(),
    name: raw.name,
    quantity: 1,
    weight: raw.weight ?? 0,
    category: 'weapon',
    equipped: false,
    notes: raw.source ? `(${raw.source})` : '',
    damageDice: raw.dmg1,
    versatileDice: raw.dmg2,
    damageType: raw.dmgType ? (DAMAGE_TYPE_MAP[bareCode(raw.dmgType)] ?? raw.dmgType) : '',
    properties: props,
    proficient: true,
  }
}

// Flatten 5etools entries (nested objects/strings) to plain text
function flattenEntries(entries: unknown[], depth = 0): string {
  if (depth > 4) return ''
  return entries
    .map(e => {
      if (typeof e === 'string') return e
      if (typeof e === 'object' && e !== null) {
        const obj = e as Record<string, unknown>
        const parts: string[] = []
        if (typeof obj.name === 'string') parts.push(obj.name + ':')
        if (Array.isArray(obj.entries)) parts.push(flattenEntries(obj.entries, depth + 1))
        if (Array.isArray(obj.items)) parts.push(flattenEntries(obj.items, depth + 1))
        return parts.join(' ')
      }
      return ''
    })
    .join('\n')
}

function mapCastingTime(time?: RawSpell['time']): string {
  if (!time?.length) return '1 action'
  const t = time[0]
  return `${t.number} ${t.unit}`
}

function mapRange(range?: RawSpell['range']): string {
  if (!range) return 'Self'
  if (range.type === 'special') return 'Special'
  if (range.type === 'point' && range.distance) {
    const d = range.distance
    if (d.type === 'self') return 'Self'
    if (d.type === 'touch') return 'Touch'
    if (d.type === 'sight') return 'Sight'
    if (d.type === 'unlimited') return 'Unlimited'
    return `${d.amount ?? ''} ${d.type ?? ''}`.trim()
  }
  return range.type ?? 'Self'
}

function mapComponents(c?: RawSpell['components']): string {
  if (!c) return ''
  const parts: string[] = []
  if (c.v) parts.push('V')
  if (c.s) parts.push('S')
  if (c.m) {
    const mat = typeof c.m === 'string'
      ? c.m
      : typeof c.m === 'object' && 'text' in c.m
        ? (c.m as { text: string }).text
        : ''
    parts.push(mat ? `M (${mat})` : 'M')
  }
  return parts.join(', ')
}

function mapDuration(dur?: RawSpell['duration']): string {
  if (!dur?.length) return 'Instantaneous'
  const d = dur[0]
  if (d.concentration) {
    const inner = d.duration
      ? `${d.duration.amount ?? ''} ${d.duration.type}`.trim()
      : 'duration'
    return `Concentration, up to ${inner}`
  }
  if (d.type === 'instant') return 'Instantaneous'
  if (d.type === 'permanent') return 'Until dispelled'
  if (d.type === 'special') return 'Special'
  if (d.duration) return `${d.duration.amount ?? ''} ${d.duration.type}`.trim()
  return 'Instantaneous'
}

function isConcentration(raw: RawSpell): boolean {
  return !!(
    raw.concentration ||
    raw.duration?.some(d => d.concentration)
  )
}

function mapSpell(raw: RawSpell): Spell {
  return {
    id: uuid(),
    name: raw.name,
    level: raw.level,
    school: SCHOOL_MAP[raw.school] ?? raw.school,
    castingTime: mapCastingTime(raw.time),
    range: mapRange(raw.range),
    components: mapComponents(raw.components),
    duration: mapDuration(raw.duration),
    description: raw.entries ? flattenEntries(raw.entries) : '',
    prepared: false,
    concentration: isConcentration(raw),
  }
}

// ---------------------------------------------------------------------------
// Caching + fetching
// ---------------------------------------------------------------------------

const BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data'

const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours
const WEAPON_CACHE_KEY = 'fiveEtools_weapons_v2'
const SPELL_CACHE_KEY = 'fiveEtools_spells_v2'

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data as T
  } catch {
    return null
  }
}

function writeCache(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

let weaponPromise: Promise<InventoryItem[]> | null = null
let spellPromise: Promise<Spell[]> | null = null

export async function fetchWeapons(): Promise<InventoryItem[]> {
  if (weaponPromise) return weaponPromise
  weaponPromise = (async () => {
    const cached = readCache<InventoryItem[]>(WEAPON_CACHE_KEY)
    if (cached) return cached

    const res = await fetch(`${BASE}/items-base.json`)
    const json: RawItemFile = await res.json()
    const all = [...(json.baseitem ?? []), ...(json.item ?? []), ...(json.itemGroup ?? [])]
    const weapons = all.filter(isWeapon).map(mapItem)
    weapons.sort((a, b) => a.name.localeCompare(b.name))

    writeCache(WEAPON_CACHE_KEY, weapons)
    return weapons
  })()
  return weaponPromise
}

// Spell sources to load (PHB + Xanathar's + Tasha's)
const SPELL_SOURCES = ['spells-phb', 'spells-xge', 'spells-tce']

export async function fetchSpells(): Promise<Spell[]> {
  if (spellPromise) return spellPromise
  spellPromise = (async () => {
    const cached = readCache<Spell[]>(SPELL_CACHE_KEY)
    if (cached) return cached

    const results = await Promise.allSettled(
      SPELL_SOURCES.map(s => fetch(`${BASE}/spells/${s}.json`).then(r => r.json() as Promise<RawSpellFile>))
    )

    const spells: Spell[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') {
        spells.push(...(r.value.spell ?? []).map(mapSpell))
      }
    }

    // Sort alphabetically
    spells.sort((a, b) => a.name.localeCompare(b.name))

    writeCache(SPELL_CACHE_KEY, spells)
    return spells
  })()
  return spellPromise
}
