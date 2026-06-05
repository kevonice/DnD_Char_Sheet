// Data fetching for the character creation wizard (races + classes)

import { v4 as uuid } from '../uuid'
import type { InventoryItem } from '../types'

const BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data'

// ---------------------------------------------------------------------------
// Source book labels
// ---------------------------------------------------------------------------

export const SOURCE_LABELS: Record<string, string> = {
  PHB:   'Player\'s Handbook (2014)',
  XPHB:  'Player\'s Handbook (2024)',
  DMG:   'Dungeon Master\'s Guide',
  MPMM:  'Mordenkainen Presents: Monsters of the Multiverse',
  TCE:   'Tasha\'s Cauldron of Everything',
  XGE:   'Xanathar\'s Guide to Everything',
  VGM:   'Volo\'s Guide to Monsters',
  MTF:   'Mordenkainen\'s Tome of Foes',
  ERLW:  'Eberron: Rising from the Last War',
  GGR:   'Guildmasters\' Guide to Ravnica',
  MOT:   'Mythic Odysseys of Theros',
  FTD:   'Fizban\'s Treasury of Dragons',
  SCC:   'Strixhaven: A Curriculum of Chaos',
  AAG:   'Astral Adventurer\'s Guide',
  VRGR:  'Van Richten\'s Guide to Ravenloft',
  EGW:   'Explorer\'s Guide to Wildemount',
  WBtW:  'The Wild Beyond the Witchlight',
  DSotDQ:'Dragonlance: Shadow of the Dragon Queen',
}

// Primary books most campaigns use — shown first in the source picker
export const PRIMARY_SOURCES = ['PHB', 'XPHB', 'TCE', 'XGE', 'MPMM', 'VGM', 'MTF', 'FTD']

// ---------------------------------------------------------------------------
// Race data
// ---------------------------------------------------------------------------

export interface CreatorRace {
  name: string
  source: string
  speed: number
  size: string[]
  darkvision?: number
  resistances: string[]
  traits: string       // flattened readable text for Features box
  spellcastingAbility?: string
  abilityBonuses?: Record<string, number> // e.g. { str: 2, con: 1 }
}

function stripTags(text: string): string {
  return text
    .replace(/\{@dc\s+(\d+)\}/gi, 'DC $1')
    .replace(/\{@hit\s+([+-]?\d+)\}/gi, '$1')
    .replace(/\{@damage\s+([^}]+)\}/gi, '$1')
    .replace(/\{@dice\s+([^}]+)\}/gi, '$1')
    .replace(/\{@(\w+)\s+([^|}]+)[^}]*\}/g, '$2')
    .replace(/\{@(\w+)\}/g, '')
}

function flattenEntries(entries: unknown[], depth = 0): string {
  if (depth > 4) return ''
  return entries.map(e => {
    if (typeof e === 'string') return stripTags(e)
    if (typeof e === 'object' && e !== null) {
      const obj = e as Record<string, unknown>
      const parts: string[] = []
      if (typeof obj.name === 'string') parts.push(`${obj.name}: `)
      if (Array.isArray(obj.entries)) parts.push(flattenEntries(obj.entries, depth + 1))
      if (Array.isArray(obj.items))   parts.push(flattenEntries(obj.items,   depth + 1))
      return parts.join('')
    }
    return ''
  }).filter(Boolean).join('\n')
}

function parseRace(raw: Record<string, unknown>): CreatorRace {
  const speed = typeof raw.speed === 'number' ? raw.speed
    : typeof raw.speed === 'object' && raw.speed !== null ? ((raw.speed as any).walk ?? 30)
    : 30

  const size: string[] = Array.isArray(raw.size)
    ? (raw.size as string[]).map(s => s === 'M' ? 'Medium' : s === 'S' ? 'Small' : s)
    : ['Medium']

  const resistances: string[] = Array.isArray(raw.resist)
    ? (raw.resist as unknown[]).map(r => {
        if (typeof r === 'string') return r
        if (typeof r === 'object' && r !== null) {
          const obj = r as Record<string, unknown>
          if (obj.choose && typeof (obj.choose as any).from === 'object') return 'choose one'
          if (typeof obj.special === 'string') return obj.special
        }
        return null
      }).filter((r): r is string => r !== null)
    : []

  const traits = Array.isArray(raw.entries) ? flattenEntries(raw.entries as unknown[]) : ''

  // Ability bonuses (PHB-style fixed bonuses)
  let abilityBonuses: Record<string, number> | undefined
  if (Array.isArray(raw.ability)) {
    const bonus: Record<string, number> = {}
    for (const entry of raw.ability as Record<string, unknown>[]) {
      for (const [k, v] of Object.entries(entry)) {
        if (typeof v === 'number') bonus[k] = v
      }
    }
    if (Object.keys(bonus).length) abilityBonuses = bonus
  }

  // Spellcasting ability from additionalSpells
  let spellcastingAbility: string | undefined
  if (Array.isArray(raw.additionalSpells)) {
    const first = (raw.additionalSpells as any[])[0]
    if (first?.ability) {
      if (typeof first.ability === 'string') spellcastingAbility = first.ability
      else if (Array.isArray(first.ability?.choose)) spellcastingAbility = 'cha' // default suggestion
    }
  }

  return {
    name: raw.name as string,
    source: raw.source as string,
    speed,
    size,
    darkvision: typeof raw.darkvision === 'number' ? raw.darkvision : undefined,
    resistances,
    traits,
    spellcastingAbility,
    abilityBonuses,
  }
}

let racesPromise: Promise<CreatorRace[]> | null = null

export function fetchCreatorRaces(): Promise<CreatorRace[]> {
  if (racesPromise) return racesPromise
  racesPromise = fetch(`${BASE}/races.json`)
    .then(r => r.json())
    .then((json: { race: Record<string, unknown>[] }) =>
      json.race
        .filter(r => typeof r.name === 'string' && typeof r.source === 'string')
        .map(parseRace)
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    .catch(err => { racesPromise = null; throw err })
  return racesPromise
}

// ---------------------------------------------------------------------------
// Class data
// ---------------------------------------------------------------------------

export interface CreatorClass {
  name: string
  source: string
  hitDie: number
  spellcastingAbility?: string
  savingThrows: string[]
  armorProfs: string[]
  weaponProfs: string[]
  startingEquipment: InventoryItem[]
}

// Parse "name|source" string into a display name
function parseItemName(raw: string): string {
  return raw.split('|')[0].replace(/\((\d+)\)$/, '').trim()
    .replace(/\b\w/g, c => c.toUpperCase()) // title-case
}

function parseStartingEquipment(raw: unknown): InventoryItem[] {
  if (!raw || typeof raw !== 'object') return []
  const eq = raw as Record<string, unknown>
  const defaultData = eq.defaultData
  if (!Array.isArray(defaultData)) return []

  const items: InventoryItem[] = []

  for (const entry of defaultData as unknown[]) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>

    // `_` = always included; otherwise take option `a`
    const choiceKey = '_' in row ? '_' : 'a'
    const chosen = row[choiceKey]
    if (!Array.isArray(chosen)) continue

    for (const item of chosen as unknown[]) {
      if (typeof item === 'string') {
        items.push({
          id: uuid(),
          name: parseItemName(item),
          quantity: 1,
          weight: 0,
          category: 'gear',
          equipped: false,
          notes: '',
        })
      }
      // skip {equipmentType: ...} objects — they're generic placeholders like "any simple weapon"
    }
  }

  return items
}

const CLASS_INDEX: Record<string, string> = {
  Artificer: 'class-artificer.json',
  Barbarian: 'class-barbarian.json',
  Bard:      'class-bard.json',
  Cleric:    'class-cleric.json',
  Druid:     'class-druid.json',
  Fighter:   'class-fighter.json',
  Monk:      'class-monk.json',
  Paladin:   'class-paladin.json',
  Ranger:    'class-ranger.json',
  Rogue:     'class-rogue.json',
  Sorcerer:  'class-sorcerer.json',
  Warlock:   'class-warlock.json',
  Wizard:    'class-wizard.json',
}

function parseClass(raw: Record<string, unknown>): CreatorClass {
  const hd = raw.hd as { faces: number } | undefined
  const startProfs = (raw.startingProficiencies ?? {}) as Record<string, unknown>

  return {
    name:    raw.name as string,
    source:  raw.source as string,
    hitDie:  hd?.faces ?? 8,
    spellcastingAbility: typeof raw.spellcastingAbility === 'string' ? raw.spellcastingAbility : undefined,
    savingThrows: Array.isArray(raw.proficiency) ? raw.proficiency as string[] : [],
    armorProfs:   Array.isArray(startProfs.armor)   ? (startProfs.armor as string[]).filter(a => typeof a === 'string') : [],
    weaponProfs:  Array.isArray(startProfs.weapons)
      ? (startProfs.weapons as unknown[])
          .filter(w => typeof w === 'string')
          .map(w => stripTags(w as string))
      : [],
    startingEquipment: parseStartingEquipment(raw.startingEquipment),
  }
}

let classesPromise: Promise<CreatorClass[]> | null = null

export function fetchCreatorClasses(): Promise<CreatorClass[]> {
  if (classesPromise) return classesPromise
  classesPromise = Promise.all(
    Object.entries(CLASS_INDEX).map(([, file]) =>
      fetch(`${BASE}/class/${file}`)
        .then(r => r.json())
        .then((json: { class: Record<string, unknown>[] }) => json.class.map(parseClass))
    )
  )
    .then(arrays => {
      const seen = new Set<string>()
      return arrays.flat()
        .filter(c => {
          // Prefer PHB over XPHB; deduplicate by name keeping first seen
          const key = c.name.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    })
    .catch(err => { classesPromise = null; throw err })
  return classesPromise
}
