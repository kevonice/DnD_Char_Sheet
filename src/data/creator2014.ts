// Data layer for the 2014 (PHB) character creation wizard.
//
// Everything a source gives a new character is normalised into a `Grants` object:
// fixed grants (Elf → Perception) and choices (Fighter → choose 2 of these 8 skills).
// The wizard renders those grouped by source ("from your race / background / class"),
// and the builder turns fixed grants + the player's picks into sheet fields.
//
// Scope: PHB (2014) only — 9 races with their subraces, 12 classes, 13 core
// backgrounds. Variant backgrounds (Spy, Pirate, Knight…) are 5etools `_copy`
// patches of a base background and are left out until they can be resolved properly.

import type { AbilityKey, InventoryItem } from '../types'
import { v4 as uuid } from '../uuid'
import { ALL_SKILLS, ABILITY_KEYS } from '../utils'

const BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data'
const SRC = 'PHB'
/** Race sources: PHB, Volo's, Monsters of the Multiverse, Tasha's (Custom Lineage). */
export const RACE_SOURCES = ['PHB', 'VGM', 'MPMM', 'TCE']

// ── Reference lists (PHB) ─────────────────────────────────────────────────────

export const STANDARD_LANGUAGES = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc']
export const EXOTIC_LANGUAGES = ['Abyssal', 'Celestial', 'Deep Speech', 'Draconic', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon']

export const MUSICAL_INSTRUMENTS = ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Horn', 'Lute', 'Lyre', 'Pan flute', 'Shawm', 'Viol']
export const ARTISAN_TOOLS = [
  "Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools",
  "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools", "Jeweler's tools",
  "Leatherworker's tools", "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools",
  "Tinker's tools", "Weaver's tools", "Woodcarver's tools",
]
export const GAMING_SETS = ['Dice set', 'Dragonchess set', 'Playing card set', 'Three-Dragon Ante set']
const OTHER_TOOLS = [
  'Disguise kit', 'Forgery kit', 'Herbalism kit', "Navigator's tools", "Poisoner's kit",
  "Thieves' tools", 'Vehicles (land)', 'Vehicles (water)',
]
export const ALL_TOOLS = [...ARTISAN_TOOLS, ...GAMING_SETS, ...MUSICAL_INSTRUMENTS, ...OTHER_TOOLS]

export const DRACONIC_ANCESTRIES = [
  { dragon: 'Black',  damage: 'acid',      breath: '5 by 30 ft. line (Dex. save)' },
  { dragon: 'Blue',   damage: 'lightning', breath: '5 by 30 ft. line (Dex. save)' },
  { dragon: 'Brass',  damage: 'fire',      breath: '5 by 30 ft. line (Dex. save)' },
  { dragon: 'Bronze', damage: 'lightning', breath: '5 by 30 ft. line (Dex. save)' },
  { dragon: 'Copper', damage: 'acid',      breath: '5 by 30 ft. line (Dex. save)' },
  { dragon: 'Gold',   damage: 'fire',      breath: '15 ft. cone (Dex. save)' },
  { dragon: 'Green',  damage: 'poison',    breath: '15 ft. cone (Con. save)' },
  { dragon: 'Red',    damage: 'fire',      breath: '15 ft. cone (Dex. save)' },
  { dragon: 'Silver', damage: 'cold',      breath: '15 ft. cone (Con. save)' },
  { dragon: 'White',  damage: 'cold',      breath: '15 ft. cone (Con. save)' },
]

// ── Grant model ───────────────────────────────────────────────────────────────

export type GrantKind = 'skill' | 'language' | 'tool'
export type GrantSource = 'race' | 'class' | 'background'

export interface Choice {
  id: string          // stable key for the player's picks, e.g. "class:skill:0"
  kind: GrantKind
  count: number
  options: string[]
  label: string       // "Choose 2 skills"
}

export interface AbilityChoice {
  id: string
  count: number
  from: AbilityKey[]
  amount: number      // bonus per pick (PHB: always +1)
}

export interface Grants {
  source: GrantSource
  sourceLabel: string                         // "Elf (High)", "Fighter", "Acolyte"
  abilityFixed: Partial<Record<AbilityKey, number>>
  abilityChoices: AbilityChoice[]
  skills: string[]
  languages: string[]
  tools: string[]
  armor: string[]
  weapons: string[]
  saves: AbilityKey[]
  choices: Choice[]
}

export interface Trait { name: string; text: string }

// ── Text helpers ──────────────────────────────────────────────────────────────

export function stripTags(text: string): string {
  return text
    .replace(/\{@dc\s+(\d+)\}/gi, 'DC $1')
    .replace(/\{@hit\s+([+-]?\d+)\}/gi, '$1')
    .replace(/\{@(?:damage|dice)\s+([^}]+)\}/gi, '$1')
    .replace(/\{@\w+\s+([^|}]+)[^}]*\}/g, '$1')
    .replace(/\{@\w+\}/g, '')
}

function flatten(entries: unknown, depth = 0): string {
  if (depth > 5 || entries == null) return ''
  if (typeof entries === 'string') return stripTags(entries)
  if (Array.isArray(entries)) return entries.map(e => flatten(e, depth + 1)).filter(Boolean).join('\n')
  if (typeof entries !== 'object') return ''
  const o = entries as Record<string, unknown>
  if (o.type === 'table' && Array.isArray(o.rows)) {
    return (o.rows as unknown[][]).map(row =>
      row.map(cell => typeof cell === 'string' ? stripTags(cell) : flatten(cell, depth + 1)).join(' — ')
    ).join('\n')
  }
  if (o.type === 'list' && Array.isArray(o.items)) {
    return (o.items as unknown[]).map(i => `• ${flatten(i, depth + 1)}`).join('\n')
  }
  const parts: string[] = []
  if (typeof o.name === 'string' && o.type === 'item') parts.push(`${stripTags(o.name)} `)
  if (o.entry !== undefined) parts.push(flatten(o.entry, depth + 1))
  if (o.entries !== undefined) parts.push(flatten(o.entries, depth + 1))
  return parts.join('')
}

const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const SMALL_WORDS = new Set(['a', 'an', 'and', 'in', 'of', 'or', 'the', 'to', 'with'])
// "diplomat's pack" → "Diplomat's Pack", "map or scroll case" → "Map or Scroll Case"
const titleCase = (s: string) => s.replace(/(^|[\s(/-])([a-z]+)/g, (_, pre: string, word: string) =>
  pre + (pre !== '' && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))

function skillName(raw: string): string {
  return ALL_SKILLS.find(s => s.toLowerCase() === raw.toLowerCase()) ?? titleCase(raw)
}
function languageName(raw: string): string {
  const all = [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES]
  return all.find(l => l.toLowerCase() === raw.toLowerCase()) ?? titleCase(raw)
}
function toolName(raw: string): string {
  const clean = stripTags(raw).split('|')[0]
  return ALL_TOOLS.find(t => t.toLowerCase() === clean.toLowerCase()) ?? sentenceCase(clean)
}
function weaponName(raw: string): string {
  if (raw === 'simple') return 'Simple weapons'
  if (raw === 'martial') return 'Martial weapons'
  return titleCase(stripTags(raw).split('|')[0])
}

const plural = (n: number, word: string, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`

// ── Proficiency block parsing ─────────────────────────────────────────────────
// 5etools shape: an array of alternative objects. Inside an object, a key set to
// `true` is a fixed grant, `any…: N` is "N of your choice from a category", and
// `choose: {from, count}` is "count from this list".

interface Bucket { fixed: string[]; choices: Choice[] }

function categoryOptions(kind: GrantKind, key: string): { options: string[]; noun: [string, string] } | null {
  if (kind === 'skill' && key === 'any') return { options: [...ALL_SKILLS], noun: ['skill', 'skills'] }
  if (kind === 'language') {
    // Standard languages first; exotic ones are offered too (the picker flags them "ask your DM").
    if (key === 'anyStandard') return { options: [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES], noun: ['language', 'languages'] }
    if (key === 'anyExotic')   return { options: EXOTIC_LANGUAGES, noun: ['exotic language', 'exotic languages'] }
    if (key === 'any')         return { options: [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES], noun: ['language', 'languages'] }
  }
  if (kind === 'tool') {
    if (key === 'anyMusicalInstrument') return { options: MUSICAL_INSTRUMENTS, noun: ['musical instrument', 'musical instruments'] }
    if (key === 'anyArtisansTool')      return { options: ARTISAN_TOOLS, noun: ["artisan's tool", "artisan's tools"] }
    if (key === 'anyGamingSet')         return { options: GAMING_SETS, noun: ['gaming set', 'gaming sets'] }
    if (key === 'any')                  return { options: ALL_TOOLS, noun: ['tool', 'tools'] }
  }
  return null
}

function parseProfBlock(raw: unknown, kind: GrantKind, idPrefix: string): Bucket {
  const bucket: Bucket = { fixed: [], choices: [] }
  if (!Array.isArray(raw) || raw.length === 0) return bucket
  const nameOf = kind === 'skill' ? skillName : kind === 'language' ? languageName : toolName
  const nextId = () => `${idPrefix}:${kind}:${bucket.choices.length}`

  // Alternatives ("an artisan's tool OR a musical instrument") — merge into one choice.
  if (raw.length > 1) {
    const options: string[] = []
    const nouns: string[] = []
    for (const alt of raw as Record<string, unknown>[]) {
      for (const [k, v] of Object.entries(alt)) {
        const cat = categoryOptions(kind, k)
        if (cat) { options.push(...cat.options); nouns.push(`a ${cat.noun[0]}`) }
        else if (v === true) { options.push(nameOf(k)); nouns.push(nameOf(k)) }
      }
    }
    bucket.choices.push({ id: nextId(), kind, count: 1, options: [...new Set(options)], label: `Choose 1: ${nouns.join(' or ')}` })
    return bucket
  }

  for (const [k, v] of Object.entries(raw[0] as Record<string, unknown>)) {
    if (v === true) { bucket.fixed.push(nameOf(k)); continue }
    if (k === 'choose' && v && typeof v === 'object') {
      const c = v as { from?: string[]; count?: number }
      const count = c.count ?? 1
      const options = (c.from ?? []).map(nameOf)
      bucket.choices.push({ id: nextId(), kind, count, options, label: `Choose ${plural(count, kind)}` })
      continue
    }
    const cat = categoryOptions(kind, k)
    if (cat && typeof v === 'number') {
      bucket.choices.push({ id: nextId(), kind, count: v, options: cat.options, label: `Choose ${v} ${v === 1 ? cat.noun[0] : cat.noun[1]}` })
    }
  }
  return bucket
}

function parseAbility(raw: unknown, idPrefix: string): Pick<Grants, 'abilityFixed' | 'abilityChoices'> {
  const abilityFixed: Partial<Record<AbilityKey, number>> = {}
  const abilityChoices: AbilityChoice[] = []
  if (!Array.isArray(raw) || raw.length === 0) return { abilityFixed, abilityChoices }
  for (const [k, v] of Object.entries(raw[0] as Record<string, unknown>)) {
    if (typeof v === 'number' && (ABILITY_KEYS as string[]).includes(k)) {
      abilityFixed[k as AbilityKey] = v
    } else if (k === 'choose' && v && typeof v === 'object') {
      const c = v as { from?: AbilityKey[]; count?: number; amount?: number }
      abilityChoices.push({
        id: `${idPrefix}:ability:${abilityChoices.length}`,
        count: c.count ?? 1, from: c.from ?? [...ABILITY_KEYS], amount: c.amount ?? 1,
      })
    }
  }
  return { abilityFixed, abilityChoices }
}

function parseArmor(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const labels: Record<string, string> = { light: 'Light armor', medium: 'Medium armor', heavy: 'Heavy armor', shield: 'Shields' }
  return Object.entries(raw[0] as Record<string, unknown>).filter(([, v]) => v === true).map(([k]) => labels[k] ?? titleCase(k))
}

function parseWeaponBlock(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  return Object.entries(raw[0] as Record<string, unknown>).filter(([, v]) => v === true).map(([k]) => weaponName(k))
}

/** Everything one 5etools entity (race, subrace, class, background) grants. */
function parseEntity(raw: Record<string, unknown>, idPrefix: string) {
  return {
    ...parseAbility(raw.ability, idPrefix),
    skill:    parseProfBlock(raw.skillProficiencies, 'skill', idPrefix),
    language: parseProfBlock(raw.languageProficiencies, 'language', idPrefix),
    tool:     parseProfBlock(raw.toolProficiencies, 'tool', idPrefix),
    armor:    parseArmor(raw.armorProficiencies),
    weapons:  parseWeaponBlock(raw.weaponProficiencies),
  }
}
type Parsed = ReturnType<typeof parseEntity>

const dedupe = (xs: string[]) => [...new Map(xs.map(x => [x.toLowerCase(), x])).values()]

function toGrants(source: GrantSource, sourceLabel: string, parts: Parsed[], saves: AbilityKey[] = []): Grants {
  const abilityFixed: Partial<Record<AbilityKey, number>> = {}
  for (const p of parts) for (const [k, v] of Object.entries(p.abilityFixed)) {
    abilityFixed[k as AbilityKey] = (abilityFixed[k as AbilityKey] ?? 0) + (v ?? 0)
  }
  return {
    source, sourceLabel, abilityFixed,
    abilityChoices: parts.flatMap(p => p.abilityChoices),
    skills:    dedupe(parts.flatMap(p => p.skill.fixed)),
    languages: dedupe(parts.flatMap(p => p.language.fixed)),
    tools:     dedupe(parts.flatMap(p => p.tool.fixed)),
    armor:     dedupe(parts.flatMap(p => p.armor)),
    weapons:   dedupe(parts.flatMap(p => p.weapons)),
    saves,
    choices:   parts.flatMap(p => [...p.skill.choices, ...p.language.choices, ...p.tool.choices]),
  }
}

// ── Equipment ─────────────────────────────────────────────────────────────────

/** InventoryItem plus the 5etools equipmentType for "X of your choice" placeholders. */
export type CreatorItem = InventoryItem & { equipmentType?: string }

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  weaponSimple: 'Simple weapon',
  weaponSimpleMelee: 'Simple melee weapon',
  weaponMartial: 'Martial weapon',
  weaponMartialMelee: 'Martial melee weapon',
  instrumentMusical: 'Musical instrument',
  toolArtisan: "Artisan's tools",
  setGaming: 'Gaming set',
  focusSpellcastingArcane: 'Arcane focus',
  focusSpellcastingDruidic: 'Druidic focus',
  focusSpellcastingHoly: 'Holy symbol',
}

function makeItem(name: string, quantity = 1, notes = ''): CreatorItem {
  return { id: uuid(), name, quantity, weight: 0, category: 'gear', equipped: false, notes }
}

/**
 * Parse 5etools `startingEquipment` / `defaultData` rows. Each row is either
 * `{_: [...]}` (always given) or `{a: [...], b: [...]}` (a choice — phase 1
 * takes option (a); picking (b) is a phase-2 feature). Returns items + coins in gp.
 */
export function parseEquipment(rows: unknown): { items: CreatorItem[]; gp: number } {
  const items: CreatorItem[] = []
  let gp = 0
  if (!Array.isArray(rows)) return { items, gp }

  for (const row of rows as Record<string, unknown>[]) {
    const chosen = row._ ?? row.a
    if (!Array.isArray(chosen)) continue
    for (const it of chosen) {
      if (typeof it === 'string') {
        const base = it.split('|')[0]
        const bundle = base.match(/\((\d+)\)\s*$/)
        items.push(makeItem(titleCase(base.replace(/\(\d+\)\s*$/, '').trim()), bundle ? Number(bundle[1]) : 1))
        continue
      }
      if (!it || typeof it !== 'object') continue
      const o = it as Record<string, unknown>
      if (typeof o.item === 'string') {
        const base = o.item.split('|')[0]
        const bundle = base.match(/\((\d+)\)\s*$/)
        const name = titleCase(base.replace(/\(\d+\)\s*$/, '').trim())
        const qty = typeof o.quantity === 'number' ? o.quantity : bundle ? Number(bundle[1]) : 1
        const note = typeof o.displayName === 'string' && o.displayName.toLowerCase() !== base.toLowerCase()
          ? sentenceCase(o.displayName) : ''
        items.push(makeItem(name, qty, note))
        if (typeof o.containsValue === 'number') gp += o.containsValue / 100
      } else if (typeof o.special === 'string') {
        items.push(makeItem(sentenceCase(o.special), typeof o.quantity === 'number' ? o.quantity : 1))
      } else if (typeof o.equipmentType === 'string') {
        const label = EQUIPMENT_TYPE_LABELS[o.equipmentType] ?? titleCase(o.equipmentType)
        const item = makeItem(`${label} (your choice)`, typeof o.quantity === 'number' ? o.quantity : 1,
          'Pick a specific one with your DM and rename this item.')
        item.equipmentType = o.equipmentType
        items.push(item)
      } else if (typeof o.value === 'number') {
        gp += o.value / 100
      }
    }
  }
  return { items, gp }
}

// ── Races ─────────────────────────────────────────────────────────────────────

const SKIP_TRAITS = new Set([
  'age', 'alignment', 'size', 'speed', 'languages', 'ability score increase',
  'ability score increases', 'extra language', 'skills',
])

function traitsOf(entries: unknown): Trait[] {
  if (!Array.isArray(entries)) return []
  return (entries as unknown[])
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object' && typeof (e as Record<string, unknown>).name === 'string')
    .filter(e => !SKIP_TRAITS.has(String(e.name).toLowerCase()))
    .map(e => ({ name: String(e.name), text: flatten(e.entries) }))
}

function speedOf(raw: unknown): number | undefined {
  if (typeof raw === 'number') return raw
  if (raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).walk === 'number') return (raw as { walk: number }).walk
  return undefined
}

function resistOf(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((r): r is string => typeof r === 'string') : []
}

export interface SubraceOption {
  short: string                 // "High", "Variant", "Standard", "Red"
  raw: Record<string, unknown>
  traits: Trait[]
  extraResist: string[]         // Dragonborn ancestry resistance
}

export interface RaceOption {
  key: string                   // "Aasimar|MPMM" — names repeat across books
  name: string
  source: string
  raw: Record<string, unknown>
  size: string
  speed: number
  darkvision?: number
  traits: Trait[]
  subraceLabel: string          // "Subrace" or "Draconic Ancestry"
  subraces: SubraceOption[]     // empty → nothing to choose
  autoSub?: Record<string, unknown>  // unnamed base subrace applied automatically
}

export interface ResolvedRace {
  label: string
  speed: number
  size: string
  darkvision?: number
  resist: string[]
  traits: Trait[]
  grants: Grants
}

/** Fixed racial bonuses that Tasha's "customizing your origin" may move (not +1-to-everything). */
export function canFlexBonuses(g: Grants): boolean {
  const n = Object.values(g.abilityFixed).filter(Boolean).length
  return n > 0 && n < 6
}

/**
 * `flexible`: Tasha's optional rule — each fixed racial increase may go to any
 * ability instead (still different abilities). MPMM races (lineage "VRGR") always
 * work this way and have no fixed bonuses or languages in the data, so both are
 * supplied here: +2 to one ability, +1 to another, Common plus one language.
 */
export function resolveRace(race: RaceOption, sub: SubraceOption | null, flexible = false): ResolvedRace {
  const subRaw = sub?.raw ?? race.autoSub ?? {}
  const raceParsed = parseEntity(race.raw, 'race')
  const subParsed = parseEntity(subRaw, 'race:sub')
  if (race.raw.lineage === 'VRGR') {
    raceParsed.abilityChoices = [
      { id: 'race:lineage:ability:0', count: 1, from: [...ABILITY_KEYS], amount: 2 },
      { id: 'race:lineage:ability:1', count: 1, from: [...ABILITY_KEYS], amount: 1 },
    ]
    if (!race.raw.languageProficiencies) {
      raceParsed.language = {
        fixed: ['Common'],
        choices: [{ id: 'race:language:0', kind: 'language', count: 1, label: 'Choose 1 language',
                    options: [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES].filter(l => l !== 'Common') }],
      }
    }
  }

  // A subrace can overwrite a race field outright (High Elf's languages).
  const overwrite = (subRaw.overwrite ?? {}) as Record<string, boolean>
  if (overwrite.languageProficiencies) raceParsed.language = { fixed: [], choices: [] }
  if (overwrite.skillProficiencies)    raceParsed.skill = { fixed: [], choices: [] }
  if (overwrite.toolProficiencies)     raceParsed.tool = { fixed: [], choices: [] }

  const label = !sub || sub.short === 'Standard' ? race.name : `${race.name} (${sub.short})`
  return {
    label,
    speed: speedOf(subRaw.speed) ?? race.speed,
    size: race.size,
    darkvision: typeof subRaw.darkvision === 'number' ? subRaw.darkvision : race.darkvision,
    resist: dedupe([...resistOf(race.raw.resist), ...resistOf(subRaw.resist), ...(sub?.extraResist ?? [])]),
    traits: [...race.traits, ...(sub?.traits ?? [])],
    grants: flexible ? flexGrants(toGrants('race', label, [raceParsed, subParsed])) : toGrants('race', label, [raceParsed, subParsed]),
  }
}

function flexGrants(g: Grants): Grants {
  if (!canFlexBonuses(g)) return g
  const moves = Object.values(g.abilityFixed).filter((v): v is number => !!v).sort((a, b) => b - a)
  return {
    ...g,
    abilityFixed: {},
    abilityChoices: [
      ...moves.map((amount, i) => ({ id: `race:flex:ability:${i}`, count: 1, from: [...ABILITY_KEYS], amount })),
      ...g.abilityChoices,
    ],
  }
}

let racesPromise: Promise<RaceOption[]> | null = null

export function fetchRaces2014(): Promise<RaceOption[]> {
  if (racesPromise) return racesPromise
  racesPromise = fetch(`${BASE}/races.json`)
    .then(r => r.json())
    .then((json: { race: Record<string, unknown>[]; subrace?: Record<string, unknown>[] }) => {
      const subs = (json.subrace ?? []).filter(s => RACE_SOURCES.includes(s.source as string))
      return json.race
        .filter(r => RACE_SOURCES.includes(r.source as string) && !r._copy)
        .map((r): RaceOption => {
          const name = r.name as string
          const source = r.source as string
          const mine = subs.filter(s => s.raceName === name && s.raceSource === source)
          const named = mine.filter(s => typeof s.name === 'string')
          const unnamed = mine.find(s => typeof s.name !== 'string')
          const sizes = (Array.isArray(r.size) ? r.size as string[] : ['M']).map(c => c === 'S' ? 'Small' : c === 'L' ? 'Large' : 'Medium')

          let subraces: SubraceOption[] = named.map(s => ({
            short: s.name as string, raw: s, traits: traitsOf(s.entries), extraResist: [],
          }))
          // Human: the unnamed base subrace (+1 to every ability) becomes "Standard".
          if (named.length > 0 && unnamed) {
            subraces = [{ short: 'Standard', raw: unnamed, traits: [], extraResist: [] }, ...subraces]
          }
          let subraceLabel = 'Subrace'
          // Dragonborn: the real choice is draconic ancestry (a table, not a subrace).
          if (name === 'Dragonborn' && source === 'PHB') {
            subraceLabel = 'Draconic Ancestry'
            subraces = DRACONIC_ANCESTRIES.map(a => ({
              short: a.dragon,
              raw: unnamed ?? {},
              extraResist: [a.damage],
              traits: [{
                name: `${a.dragon} Dragon Ancestry`,
                text: `Your breath weapon deals ${a.damage} damage in a ${a.breath}. You have resistance to ${a.damage} damage.`,
              }],
            }))
          }

          return {
            key: `${name}|${source}`, name, source, raw: r,
            size: sizes.join(' or '),
            speed: speedOf(r.speed) ?? 30,
            darkvision: typeof r.darkvision === 'number' ? r.darkvision : undefined,
            traits: traitsOf(r.entries),
            subraceLabel,
            subraces,
            autoSub: subraces.length === 0 ? unnamed : undefined,
          }
        })
        
        .sort((a, b) => a.name.localeCompare(b.name) || RACE_SOURCES.indexOf(a.source) - RACE_SOURCES.indexOf(b.source))
    })
    .catch(err => { racesPromise = null; throw err })
  return racesPromise
}

// ── Classes ───────────────────────────────────────────────────────────────────

export interface ClassOption {
  name: string
  hitDie: number
  saves: AbilityKey[]
  spellcastingAbility?: AbilityKey
  grants: Grants
  equipment: CreatorItem[]
  equipmentGp: number
}

const CLASS_FILES = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
  'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
]

function parseClass(raw: Record<string, unknown>): ClassOption {
  const sp = (raw.startingProficiencies ?? {}) as Record<string, unknown>
  const saves = (Array.isArray(raw.proficiency) ? raw.proficiency : []) as AbilityKey[]
  const parsed = {
    abilityFixed: {}, abilityChoices: [],
    skill:   parseProfBlock(sp.skills, 'skill', 'class'),
    language: { fixed: [], choices: [] },
    tool:    parseProfBlock(sp.toolProficiencies, 'tool', 'class'),
    armor:   parseArmor(sp.armorProficiencies),
    weapons: Array.isArray(sp.weapons) ? (sp.weapons as unknown[]).filter((w): w is string => typeof w === 'string').map(weaponName) : [],
  } satisfies Parsed
  const equip = parseEquipment((raw.startingEquipment as Record<string, unknown> | undefined)?.defaultData)
  return {
    name: raw.name as string,
    hitDie: (raw.hd as { faces: number } | undefined)?.faces ?? 8,
    saves,
    spellcastingAbility: typeof raw.spellcastingAbility === 'string' ? raw.spellcastingAbility as AbilityKey : undefined,
    grants: toGrants('class', raw.name as string, [parsed], saves),
    equipment: equip.items,
    equipmentGp: equip.gp,
  }
}

let classesPromise: Promise<ClassOption[]> | null = null

export function fetchClasses2014(): Promise<ClassOption[]> {
  if (classesPromise) return classesPromise
  classesPromise = Promise.all(CLASS_FILES.map(f =>
    fetch(`${BASE}/class/class-${f}.json`)
      .then(r => r.json())
      .then((json: { class: Record<string, unknown>[] }) => json.class.find(c => c.source === SRC))
  ))
    .then(entries => entries.filter((c): c is Record<string, unknown> => !!c).map(parseClass))
    .catch(err => { classesPromise = null; throw err })
  return classesPromise
}

// ── Backgrounds ───────────────────────────────────────────────────────────────

export interface BackgroundOption {
  name: string
  grants: Grants
  summary: Trait[]                  // "Skill Proficiencies: Insight, Religion" etc.
  feature?: Trait
  equipment: CreatorItem[]
  gp: number
  tables: { traits: string[]; ideals: string[]; bonds: string[]; flaws: string[] }
}

function findTables(entries: unknown, out: Record<string, string[]> = {}): Record<string, string[]> {
  if (Array.isArray(entries)) { entries.forEach(e => findTables(e, out)); return out }
  if (!entries || typeof entries !== 'object') return out
  const o = entries as Record<string, unknown>
  if (o.type === 'table' && Array.isArray(o.colLabels) && Array.isArray(o.rows)) {
    const label = stripTags(String((o.colLabels as unknown[])[1] ?? ''))
    out[label] = (o.rows as unknown[][]).map(row => {
      const last = row[row.length - 1]
      return typeof last === 'string' ? stripTags(last) : flatten(last)
    })
  }
  if (o.entries) findTables(o.entries, out)
  return out
}

function parseBackground(raw: Record<string, unknown>): BackgroundOption {
  const name = raw.name as string
  const entries = Array.isArray(raw.entries) ? raw.entries as Record<string, unknown>[] : []
  const list = entries.find(e => e?.type === 'list')
  const summary = Array.isArray(list?.items)
    ? (list.items as Record<string, unknown>[])
        .filter(i => typeof i.name === 'string')
        .map(i => ({ name: String(i.name).replace(/:$/, ''), text: flatten(i.entry ?? i.entries) }))
    : []
  const featEntry = entries.find(e => typeof e?.name === 'string' && (e.name as string).startsWith('Feature:'))
  const tables = findTables(entries)
  const equip = parseEquipment(raw.startingEquipment)
  return {
    name,
    grants: toGrants('background', name, [parseEntity(raw, 'background')]),
    summary,
    feature: featEntry ? { name: (featEntry.name as string).replace(/^Feature:\s*/, ''), text: flatten(featEntry.entries) } : undefined,
    equipment: equip.items,
    gp: equip.gp,
    tables: {
      traits: tables['Personality Trait'] ?? [],
      ideals: tables['Ideal'] ?? [],
      bonds:  tables['Bond'] ?? [],
      flaws:  tables['Flaw'] ?? [],
    },
  }
}

let backgroundsPromise: Promise<BackgroundOption[]> | null = null

export function fetchBackgrounds2014(): Promise<BackgroundOption[]> {
  if (backgroundsPromise) return backgroundsPromise
  backgroundsPromise = fetch(`${BASE}/backgrounds.json`)
    .then(r => r.json())
    .then((json: { background: Record<string, unknown>[] }) =>
      json.background
        .filter(b => b.source === SRC && !b._copy && b.name !== 'Custom Background')
        .map(parseBackground)
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    .catch(err => { backgroundsPromise = null; throw err })
  return backgroundsPromise
}

// ── Empty grants for custom / homebrew picks ──────────────────────────────────

export function emptyGrants(source: GrantSource, sourceLabel: string): Grants {
  return {
    source, sourceLabel, abilityFixed: {}, abilityChoices: [],
    skills: [], languages: [], tools: [], armor: [], weapons: [], saves: [], choices: [],
  }
}

/** Which tool category a tool name belongs to — used to fill equipment placeholders. */
export function toolCategory(tool: string): 'instrumentMusical' | 'toolArtisan' | 'setGaming' | null {
  if (MUSICAL_INSTRUMENTS.includes(tool)) return 'instrumentMusical'
  if (ARTISAN_TOOLS.includes(tool)) return 'toolArtisan'
  if (GAMING_SETS.includes(tool)) return 'setGaming'
  return null
}
