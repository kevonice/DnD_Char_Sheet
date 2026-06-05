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
  additionalEntries?: (string | Record<string, unknown>)[]
  ac?: number | { base?: number }
  stealth?: boolean
  strength?: number
  weaponCategory?: string
  sword?: boolean
  axe?: boolean
  bow?: boolean
  rarity?: string
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
// Source grouping
// ---------------------------------------------------------------------------

export type SourceGroup = 'core' | '2024' | 'supplements' | 'adventures'

export const SOURCE_GROUPS: Record<SourceGroup, { label: string; sources: Set<string> }> = {
  core: {
    label: 'Core (2014)',
    sources: new Set(['PHB', 'DMG', 'MM']),
  },
  '2024': {
    label: '2024',
    sources: new Set(['XPHB', 'XDMG', 'XMM']),
  },
  supplements: {
    label: 'Supplements',
    sources: new Set([
      'XGE', 'TCE', 'MPMM', 'MTF', 'VGM', 'FTD', 'BGG', 'BMT',
      'ERLW', 'EGW', 'SCC', 'MOT', 'GGR', 'AAG', 'VRGR',
      'WBtW', 'DSotDQ', 'PSA', 'PSI', 'PSK', 'PSZ', 'PSX',
    ]),
  },
  adventures: {
    label: 'Adventures',
    sources: new Set([
      'CoS', 'ToA', 'IDRotF', 'WDH', 'TftYP', 'GoS', 'PotA',
      'CoA', 'QftIS', 'CM', 'SLW', 'HotB', 'KftGV', 'OoW',
      'NRH-TLT', 'NRH-AT', 'DrDe-DaS', 'LMoP', 'OotA', 'SKT',
      'RoT', 'HotDQ', 'PaBTSO', 'SjA', 'BAM',
    ]),
  },
}

export const DEFAULT_SOURCE_GROUPS: SourceGroup[] = ['core', 'supplements']

export function matchesSourceGroups(source: string | undefined, groups: SourceGroup[]): boolean {
  if (!source) return groups.includes('core') // sourceless items are core
  const up = source.toUpperCase()
  for (const g of groups) {
    if (SOURCE_GROUPS[g].sources.has(up)) return true
  }
  // Fallback: anything not categorised shows under supplements
  const known = Object.values(SOURCE_GROUPS).flatMap(g => [...g.sources])
  if (!known.includes(up)) return groups.includes('supplements')
  return false
}

// ---------------------------------------------------------------------------
// Edition classification (kept for spell filtering)
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

// Plain-language explanations of weapon properties — 5etools shows these for
// mundane weapons that otherwise have no description text.
const PROP_DESC: Record<WeaponProperty, string> = {
  finesse:      'Finesse: use Strength or Dexterity (your choice) for attack and damage rolls.',
  light:        'Light: suited to two-weapon fighting.',
  heavy:        'Heavy: Small creatures have disadvantage on attack rolls with it.',
  thrown:       'Thrown: can be thrown to make a ranged attack using the same ability modifier.',
  versatile:    'Versatile: can be used one- or two-handed; two-handed deals the larger die.',
  'two-handed': 'Two-Handed: requires two hands to wield.',
  loading:      'Loading: only one attack regardless of the number of attacks you can normally make.',
  reach:        'Reach: adds 5 feet to your reach for attacks and opportunity attacks.',
  ammunition:   'Ammunition: requires ammunition to make a ranged attack.',
  ranged:       'Ranged: a ranged weapon attack using Dexterity.',
}

const ARMOR_TYPES = new Set(['LA', 'MA', 'HA', 'S'])
const GEAR_TYPES  = new Set(['G', 'AT', 'INS', 'A', 'SCF', 'TG', 'T', 'MNT', 'VEH', 'GS'])


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
  // Prefer `entries`, fall back to `additionalEntries` (gear/tools use this).
  const rawEntries = Array.isArray(raw.entries) ? raw.entries
    : Array.isArray(raw.additionalEntries) ? raw.additionalEntries
    : null
  let description = rawEntries ? flattenEntries(rawEntries).trim() : ''

  if (cat === 'weapon') {
    const props = mapProperties(raw.property)
    const isRanged = bareCode(raw.type ?? '') === 'R' || props.includes('ammunition')
    if (isRanged && !props.includes('ranged')) props.push('ranged')

    // Build a useful description: category line + any sourced text + property meanings.
    const parts: string[] = []
    const wc = raw.weaponCategory ? `${raw.weaponCategory[0].toUpperCase()}${raw.weaponCategory.slice(1)} weapon` : ''
    const kind = isRanged ? 'ranged' : 'melee'
    if (wc) parts.push(`${wc} (${kind}).`)
    if (description) parts.push(description)
    const propLines = props.map(p => PROP_DESC[p]).filter(Boolean)
    if (propLines.length) parts.push('\n' + propLines.join('\n'))
    description = parts.join('\n').trim()

    return {
      id: uuid(), name: raw.name, quantity: 1, weight: raw.weight ?? 0,
      category: 'weapon', equipped: false, notes: '', description,
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
      description,
      armorClass: acNum,
      source: raw.source,
    }
  }

  // gear or misc
  return {
    id: uuid(), name: raw.name, quantity: 1, weight: raw.weight ?? 0,
    category: cat, equipped: false, notes: '', description, source: raw.source,
  }
}

// Strip 5etools inline tags: {@skill Stealth} → "Stealth", {@dc 15} → "DC 15"
function stripTags(text: string): string {
  return text
    .replace(/\{@dc\s+(\d+)\}/gi, 'DC $1')
    .replace(/\{@hit\s+([+-]?\d+)\}/gi, '$1')
    .replace(/\{@damage\s+([^}]+)\}/gi, '$1')
    .replace(/\{@dice\s+([^}]+)\}/gi, '$1')
    .replace(/\{@(\w+)\s+([^|}]+)[^}]*\}/g, '$2')
    .replace(/\{@(\w+)\}/g, '')
}

// Flatten 5etools entries (nested objects/strings) to plain text
function flattenEntries(entries: unknown[], depth = 0): string {
  if (depth > 4) return ''
  return entries
    .map(e => {
      if (typeof e === 'string') return stripTags(e)
      if (typeof e === 'object' && e !== null) {
        const obj = e as Record<string, unknown>
        const parts: string[] = []
        if (typeof obj.name === 'string') parts.push(stripTags(obj.name) + ':')
        if (Array.isArray(obj.entries)) parts.push(flattenEntries(obj.entries, depth + 1))
        if (Array.isArray(obj.items))   parts.push(flattenEntries(obj.items,   depth + 1))
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
const SPELL_CACHE_KEY = 'fiveEtools_spells_v4'

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

const BASE_ITEMS_KEY  = 'fiveEtools_baseItems_v6'
const MAGIC_ITEMS_KEY = 'fiveEtools_magicItems_v9'

let baseItemsPromise:  Promise<CategorisedItems> | null = null
let magicItemsPromise: Promise<CategorisedItems> | null = null
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

const hasAnyItems = (d: CategorisedItems) =>
  d.weapon.length + d.armor.length + d.gear.length + d.misc.length > 0

function fetchMagicItems(): Promise<CategorisedItems> {
  if (magicItemsPromise) return magicItemsPromise
  magicItemsPromise = (async () => {
    const cached = readCache<CategorisedItems>(MAGIC_ITEMS_KEY, hasAnyItems)
    if (cached) return cached

    try {
      const res  = await fetch(`${BASE}/items.json`)
      const json: RawItemFile = await res.json()
      // Include ALL items from items.json — mundane gear (rarity "none") and magic alike.
      // items-base.json only has base weapon/armor stats; packs, clothes, tools, and
      // most adventuring gear live here with rarity "none" and would otherwise be missing.
      const result: CategorisedItems = { weapon: [], armor: [], gear: [], misc: [] }
      const allItems = [...(json.item ?? []), ...(json.itemGroup ?? [])]
      for (const raw of allItems) {
        const item = mapItem(raw)
        // Magic wondrous / typeless items go to Items & Magic; everything else keeps
        // its natural category (weapons, armor, gear).
        const isMagic = raw.rarity && raw.rarity !== 'none'
        const cat = (isMagic && item.category === 'gear') ? 'misc' : item.category
        result[cat].push({ ...item, category: cat })
      }
      for (const arr of Object.values(result)) arr.sort((a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name))

      writeCache(MAGIC_ITEMS_KEY, result, d => hasAnyItems(d as CategorisedItems))
      return result
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

// Combine mundane base items with categorised magic items so each tab shows
// both — e.g. Weapons lists the Longsword AND the +1 Longsword / Flame Tongue.
async function fetchCategory(cat: keyof CategorisedItems): Promise<InventoryItem[]> {
  const [base, magic] = await Promise.all([fetchBaseItems(), fetchMagicItems()])
  // Deduplicate: items-base.json and items.json overlap for core PHB items.
  // Prefer the items.json version (richer data) when both exist.
  const seen = new Set<string>()
  const merged: InventoryItem[] = []
  // items.json first so its version wins on collision
  for (const item of [...magic[cat], ...base[cat]]) {
    const key = `${item.name.toLowerCase()}|${(item.source ?? '').toLowerCase()}`
    if (!seen.has(key)) { seen.add(key); merged.push(item) }
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name))
}

export function fetchWeapons():   Promise<InventoryItem[]> { return fetchCategory('weapon') }
export function fetchArmor():     Promise<InventoryItem[]> { return fetchCategory('armor') }
export function fetchGear():      Promise<InventoryItem[]> { return fetchCategory('gear') }
export function fetchMiscItems(): Promise<InventoryItem[]> { return fetchCategory('misc') }

// Look up a list of item names against the full 5etools database.
// Returns the best-matched InventoryItem for each name (or the bare placeholder if not found).
export async function lookupItems(placeholders: InventoryItem[]): Promise<InventoryItem[]> {
  const [base, magic] = await Promise.all([fetchBaseItems(), fetchMagicItems()])
  const allItems = [
    ...magic.weapon, ...magic.armor, ...magic.gear, ...magic.misc,
    ...base.weapon,  ...base.armor,  ...base.gear,  ...base.misc,
  ]

  return placeholders.map(placeholder => {
    const query = placeholder.name.toLowerCase()
    // Exact match first, then startsWith, then includes
    const found =
      allItems.find(it => it.name.toLowerCase() === query) ??
      allItems.find(it => it.name.toLowerCase().startsWith(query)) ??
      allItems.find(it => it.name.toLowerCase().includes(query))
    if (!found) return placeholder
    // Give the found item a fresh id so it doesn't collide
    return { ...found, id: placeholder.id }
  })
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
