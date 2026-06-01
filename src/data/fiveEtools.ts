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
  value?: number
  dmg1?: string
  dmg2?: string
  dmgType?: string
  property?: unknown[]
  range?: string
  entries?: (string | Record<string, unknown>)[]
  ac?: number | { base?: number }
  stealth?: boolean
  strength?: number
  weaponCategory?: string
  sword?: boolean
  axe?: boolean
  bow?: boolean
}

interface RawItemFile {
  baseitem?: RawItem[]
  item?: RawItem[]
  itemGroup?: RawItem[]
}

// 5etools suffixes type/property codes with the source, e.g. "M|PHB", "2H|PHB".
// Strip the "|SOURCE" part to get the bare code.
function bareCode(code: unknown): string {
  if (typeof code !== 'string' || !code) return ''
  const pipe = code.indexOf('|')
  return pipe === -1 ? code : code.slice(0, pipe)
}

// ---------------------------------------------------------------------------
// Edition classification
// ---------------------------------------------------------------------------

export type Edition = '2014' | '2024' | 'all'

// 2024 ("One D&D") reprint sources. Everything else is treated as 2014-era.
const SOURCES_2024 = new Set(['XPHB', 'XDMG', 'XMM'])

export function editionOf(source?: string): '2014' | '2024' {
  if (source && SOURCES_2024.has(source.toUpperCase())) return '2024'
  return '2014'
}

export function matchesEdition(source: string | undefined, edition: Edition): boolean {
  if (edition === 'all') return true
  return editionOf(source) === edition
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

const ARMOR_TYPES = new Set(['LA', 'MA', 'HA', 'S'])
const GEAR_TYPES  = new Set(['G', 'AT', 'INS', 'A', 'SCF', 'TG', 'T', 'MNT', 'VEH', 'GS'])
const MISC_TYPES  = new Set(['P', 'W', 'SC', 'RG', 'RD', 'WD', 'ST', 'OTH', 'AF', '$A', '$G', 'FD'])

function categorise(raw: RawItem): InventoryItem['category'] {
  if (raw.dmg1) return 'weapon'
  const t = bareCode(raw.type ?? '')
  if (ARMOR_TYPES.has(t)) return 'armor'
  if (GEAR_TYPES.has(t))  return 'gear'
  return 'misc'
}

function mapProperties(raw: unknown[] = []): WeaponProperty[] {
  return raw
    .filter((p): p is string => typeof p === 'string')
    .map(p => PROP_MAP[bareCode(p)])
    .filter((p): p is WeaponProperty => Boolean(p))
}

function mapItem(raw: RawItem): InventoryItem {
  const cat = categorise(raw)

  if (cat === 'weapon') {
    const props = mapProperties(raw.property)
    const isRanged = bareCode(raw.type ?? '') === 'R' || props.includes('ammunition')
    if (isRanged && !props.includes('ranged')) props.push('ranged')
    return {
      id: uuid(), name: raw.name, quantity: 1, weight: raw.weight ?? 0,
      category: 'weapon', equipped: false, notes: '',
      damageDice: raw.dmg1, versatileDice: raw.dmg2,
      damageType: raw.dmgType ? (DAMAGE_TYPE_MAP[bareCode(raw.dmgType)] ?? raw.dmgType) : '',
      properties: props, proficient: true, source: raw.source,
    }
  }

  if (cat === 'armor') {
    const acRaw = raw.ac
    const acNum = typeof acRaw === 'number' ? acRaw : typeof acRaw === 'object' && acRaw !== null ? (acRaw as { base?: number }).base : undefined
    return {
      id: uuid(), name: raw.name, quantity: 1, weight: raw.weight ?? 0,
      category: 'armor', equipped: false,
      notes: (raw as any).stealth ? 'Stealth disadvantage' : '',
      armorClass: acNum,
      source: raw.source,
    }
  }

  // gear or misc
  return {
    id: uuid(), name: raw.name, quantity: 1, weight: raw.weight ?? 0,
    category: cat, equipped: false, notes: '', source: raw.source,
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
    source: raw.source,
  }
}

// ---------------------------------------------------------------------------
// Caching + fetching
// ---------------------------------------------------------------------------

const BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data'

const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours
const SPELL_CACHE_KEY = 'fiveEtools_spells_v3'

// `isValid` lets each caller reject empty/corrupt payloads so we never serve
// (or persist) a broken cache — e.g. an empty item list from a failed fetch.
function readCache<T>(key: string, isValid?: (data: T) => boolean): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    if (isValid && !isValid(data as T)) {
      localStorage.removeItem(key)
      return null
    }
    return data as T
  } catch {
    return null
  }
}

function writeCache(key: string, data: unknown, isValid?: (data: unknown) => boolean) {
  try {
    if (isValid && !isValid(data)) return // refuse to cache an invalid payload
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

// ---------------------------------------------------------------------------
// Shared raw-data fetchers (each file fetched and parsed once)
// ---------------------------------------------------------------------------

interface CategorisedItems {
  weapon: InventoryItem[]
  armor: InventoryItem[]
  gear: InventoryItem[]
  misc: InventoryItem[]
}

const BASE_ITEMS_KEY  = 'fiveEtools_baseItems_v3'
const MAGIC_ITEMS_KEY = 'fiveEtools_magicItems_v3'

let baseItemsPromise:  Promise<CategorisedItems> | null = null
let magicItemsPromise: Promise<InventoryItem[]>  | null = null
let spellPromise:      Promise<Spell[]>          | null = null

const hasItems = (d: CategorisedItems) => d.weapon.length > 0

function fetchBaseItems(): Promise<CategorisedItems> {
  if (baseItemsPromise) return baseItemsPromise
  baseItemsPromise = (async () => {
    const cached = readCache<CategorisedItems>(BASE_ITEMS_KEY, hasItems)
    if (cached) return cached

    try {
      const res  = await fetch(`${BASE}/items-base.json`)
      const json: RawItemFile = await res.json()
      const all  = [...(json.baseitem ?? []), ...(json.item ?? [])]

      const result: CategorisedItems = { weapon: [], armor: [], gear: [], misc: [] }
      for (const raw of all) {
        const item = mapItem(raw)
        result[item.category].push(item)
      }
      for (const arr of Object.values(result)) arr.sort((a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name))

      writeCache(BASE_ITEMS_KEY, result, d => hasItems(d as CategorisedItems))
      return result
    } catch (err) {
      // Don't memoise a failure — allow a later retry to succeed.
      baseItemsPromise = null
      throw err
    }
  })()
  return baseItemsPromise
}

const nonEmpty = (d: InventoryItem[]) => d.length > 0

function fetchMagicItemsRaw(): Promise<InventoryItem[]> {
  if (magicItemsPromise) return magicItemsPromise
  magicItemsPromise = (async () => {
    const cached = readCache<InventoryItem[]>(MAGIC_ITEMS_KEY, nonEmpty)
    if (cached) return cached

    try {
      const res  = await fetch(`${BASE}/items.json`)
      const json: RawItemFile = await res.json()
      // Only pull misc-type entries that aren't duplicates of base weapons/armor
      const items = (json.item ?? [])
        .filter(raw => {
          const t = bareCode(raw.type ?? '')
          return MISC_TYPES.has(t)
        })
        .map(raw => mapItem(raw))
      items.sort((a, b) => a.name.localeCompare(b.name))

      writeCache(MAGIC_ITEMS_KEY, items, d => nonEmpty(d as InventoryItem[]))
      return items
    } catch (err) {
      magicItemsPromise = null
      throw err
    }
  })()
  return magicItemsPromise
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchWeapons(): Promise<InventoryItem[]> {
  return (await fetchBaseItems()).weapon
}

export async function fetchArmor(): Promise<InventoryItem[]> {
  return (await fetchBaseItems()).armor
}

export async function fetchGear(): Promise<InventoryItem[]> {
  return (await fetchBaseItems()).gear
}

export async function fetchMiscItems(): Promise<InventoryItem[]> {
  return fetchMagicItemsRaw()
}

// Spell sources to load:
//   2014 — PHB + Xanathar's + Tasha's
//   2024 — XPHB (the 2024 Player's Handbook)
const SPELL_SOURCES = ['spells-phb', 'spells-xge', 'spells-tce', 'spells-xphb']

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
