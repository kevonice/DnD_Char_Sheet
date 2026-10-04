// Starting above level 1 (2014 PHB classes): subclass options, hit points per
// level, spellcasting numbers and the class spell list. Everything is read from
// the 5etools class files — counts from cantrip/spells-known progressions and
// the prepared-spells formula, slots from the class table, subclass bonus spells
// from `additionalSpells`, and which classes learn a spell from spells/sources.json.

import type { AbilityKey, AbilityScores, Spell, SpellSlots } from '../types'
import { modifier } from '../utils'
import { fetchSpells } from './fiveEtools'
import { stripTags } from './creator2014'

const BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data'
const SPELL_SOURCES = ['PHB', 'XGE', 'TCE']   // 2014-compatible books

const clean = (s: string) => s.split('|')[0].toLowerCase()

export interface SubclassOption {
  name: string
  shortName: string
  source: string
  /** Always-prepared spells (domain / oath), keyed by the class level they arrive at. */
  prepared: Record<number, string[]>
  /** Extra spells this subclass may choose from (Warlock patron), keyed by spell level. */
  expanded: Record<number, string[]>
}

export interface ClassLevelData {
  className: string
  subclassLevel: number          // level the subclass is chosen at
  subclassTitle: string          // "Divine Domain"
  subclasses: SubclassOption[]
  casterProgression?: 'full' | '1/2' | '1/3' | 'pact'
  spellcastingAbility?: AbilityKey
  cantripProgression?: number[]
  spellsKnownProgression?: number[]
  preparedFormula?: string       // "<$level$> + <$wis_mod$>"
  slotRows: number[][]           // per level: slots for spell levels 1..n
  pactRows: Array<{ slots: number; slotLevel: number }>  // Warlock only
}

function spellLevelMap(raw: unknown, keyToLevel: (k: string) => number): Record<number, string[]> {
  const out: Record<number, string[]> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const lvl = keyToLevel(k)
    // Only simple lists; nested choices (e.g. Circle of the Land terrains) are skipped.
    if (Number.isFinite(lvl) && Array.isArray(v) && v.every(x => typeof x === 'string')) out[lvl] = (v as string[]).map(clean)
  }
  return out
}

const levelCache = new Map<string, Promise<ClassLevelData>>()

export function fetchClassLevelData(className: string): Promise<ClassLevelData> {
  const key = className.toLowerCase()
  if (!levelCache.has(key)) {
    levelCache.set(key, fetch(`${BASE}/class/class-${key}.json`)
      .then(r => r.json())
      .then((json: { class: Record<string, unknown>[]; subclass?: Record<string, unknown>[] }): ClassLevelData => {
        const cls = json.class.find(c => c.source === 'PHB')
        if (!cls) throw new Error(`No PHB ${className}`)
        const gain = (cls.classFeatures as unknown[]).find(f => typeof f === 'object' && (f as Record<string, unknown>).gainSubclassFeature)
        const subclassLevel = Number(String((gain as Record<string, unknown> | undefined)?.classFeature ?? '').split('|').pop()) || 3

        const seen = new Set<string>()
        const subclasses = (json.subclass ?? [])
          .filter(s => s.classSource === 'PHB' && !s._copy)
          .sort((a, b) => (a.source === 'PHB' ? -1 : 0) - (b.source === 'PHB' ? -1 : 0))
          .filter(s => { const n = String(s.name); if (seen.has(n)) return false; seen.add(n); return true })
          .map((s): SubclassOption => {
            const add = Array.isArray(s.additionalSpells) ? (s.additionalSpells[0] ?? {}) as Record<string, unknown> : {}
            return {
              name: s.name as string,
              shortName: s.shortName as string,
              source: s.source as string,
              prepared: spellLevelMap(add.prepared, k => Number(k)),
              expanded: spellLevelMap(add.expanded, k => Number(k.replace(/^s/, ''))),
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name))

        const groups = (cls.classTableGroups ?? []) as Array<Record<string, unknown>>
        const slotGroup = groups.find(g => Array.isArray(g.rowsSpellProgression))
        const slotRows = (slotGroup?.rowsSpellProgression as number[][] | undefined) ?? []
        const pactRows: ClassLevelData['pactRows'] = []
        for (const g of groups) {
          const labels = ((g.colLabels as string[]) ?? []).map(l => stripTags(l).toLowerCase())
          const si = labels.indexOf('spell slots'), li = labels.indexOf('slot level')
          if (si < 0 || li < 0) continue
          for (const row of (g.rows as unknown[][]) ?? []) {
            const num = (c: unknown) => typeof c === 'number' ? c : Number(String(typeof c === 'object' && c ? (c as Record<string, unknown>).value ?? '' : c).match(/\d+/)?.[0] ?? 0)
            pactRows.push({ slots: num(row[si]), slotLevel: num(row[li]) })
          }
        }

        return {
          className: cls.name as string,
          subclassLevel,
          subclassTitle: (cls.subclassTitle as string) ?? 'Subclass',
          subclasses,
          casterProgression: cls.casterProgression as ClassLevelData['casterProgression'],
          spellcastingAbility: cls.spellcastingAbility as AbilityKey | undefined,
          cantripProgression: cls.cantripProgression as number[] | undefined,
          spellsKnownProgression: cls.spellsKnownProgression as number[] | undefined,
          preparedFormula: cls.preparedSpells as string | undefined,
          slotRows,
          pactRows,
        }
      })
      .catch(err => { levelCache.delete(key); throw err }))
  }
  return levelCache.get(key)!
}

// ── Spellcasting at a given level ─────────────────────────────────────────────

export interface CasterInfo {
  cantrips: number
  /** How many levelled spells the player picks now, and what that number means. */
  spells: number
  mode: 'known' | 'prepared' | 'spellbook' | 'none'
  preparedLimit: number | null   // Wizard: how many spellbook spells can be prepared
  maxSpellLevel: number
  slots: SpellSlots
}

/** 5etools prepared formulas: "<$level$> + <$wis_mod$>" or "<$level$> / 2 + <$cha_mod$>". Minimum 1. */
function evalPrepared(formula: string, level: number, abilities: AbilityScores): number {
  const lvl = /<\$level\$>\s*\/\s*2/.test(formula) ? Math.floor(level / 2) : level
  const ability = formula.match(/<\$(\w{3})_mod\$>/)?.[1] as AbilityKey | undefined
  return Math.max(1, lvl + (ability ? modifier(abilities[ability] ?? 10) : 0))
}

export function casterInfo(d: ClassLevelData, level: number, abilities: AbilityScores): CasterInfo {
  const slots: SpellSlots = {}
  for (let i = 1; i <= 9; i++) slots[i] = { max: 0, used: 0 }
  let maxSpellLevel = 0
  if (d.casterProgression === 'pact') {
    const p = d.pactRows[level - 1]
    if (p?.slotLevel) { slots[p.slotLevel] = { max: p.slots, used: 0 }; maxSpellLevel = p.slotLevel }
  } else {
    (d.slotRows[level - 1] ?? []).forEach((n, i) => { if (n > 0) { slots[i + 1] = { max: n, used: 0 }; maxSpellLevel = i + 1 } })
  }

  const cantrips = d.cantripProgression?.[level - 1] ?? 0
  if (maxSpellLevel === 0) return { cantrips, spells: 0, mode: 'none', preparedLimit: null, maxSpellLevel, slots }
  if (d.className === 'Wizard') {
    return { cantrips, spells: 6 + 2 * (level - 1), mode: 'spellbook',
             preparedLimit: d.preparedFormula ? evalPrepared(d.preparedFormula, level, abilities) : null, maxSpellLevel, slots }
  }
  if (d.spellsKnownProgression) {
    return { cantrips, spells: d.spellsKnownProgression[level - 1] ?? 0, mode: 'known', preparedLimit: null, maxSpellLevel, slots }
  }
  if (d.preparedFormula) {
    return { cantrips, spells: evalPrepared(d.preparedFormula, level, abilities), mode: 'prepared', preparedLimit: null, maxSpellLevel, slots }
  }
  return { cantrips, spells: 0, mode: 'none', preparedLimit: null, maxSpellLevel, slots }
}

/** Always-prepared subclass spells (domain/oath) available at `level`. */
export function subclassPreparedNames(sub: SubclassOption | null, level: number): string[] {
  if (!sub) return []
  return Object.entries(sub.prepared).filter(([l]) => Number(l) <= level).flatMap(([, names]) => names)
}

// ── Class spell lists ─────────────────────────────────────────────────────────

let classMapPromise: Promise<Map<string, Set<string>>> | null = null

/** spell name (lowercase) → set of 2014 class names that can learn it. */
function fetchSpellClassMap(): Promise<Map<string, Set<string>>> {
  if (classMapPromise) return classMapPromise
  classMapPromise = fetch(`${BASE}/spells/sources.json`)
    .then(r => r.json())
    .then((json: Record<string, Record<string, { class?: Array<{ name: string; source: string }>; classVariant?: Array<{ name: string; source: string; definedInSource?: string }> }>>) => {
      const map = new Map<string, Set<string>>()
      for (const src of SPELL_SOURCES) {
        for (const [spell, info] of Object.entries(json[src] ?? {})) {
          const set = map.get(spell.toLowerCase()) ?? new Set<string>()
          for (const c of info.class ?? []) if (c.source === 'PHB') set.add(c.name)
          // Xanathar's spells (and Tasha's expanded lists) are recorded as class variants.
          for (const c of info.classVariant ?? []) {
            if (c.source === 'PHB' && SPELL_SOURCES.includes(c.definedInSource ?? '')) set.add(c.name)
          }
          map.set(spell.toLowerCase(), set)
        }
      }
      return map
    })
    .catch(err => { classMapPromise = null; throw err })
  return classMapPromise
}

export interface SpellOption extends Spell { key: string; tag?: string }

/**
 * Spells a class can pick at creation: its own list (PHB, XGE, TCE) up to
 * `maxSpellLevel`, plus a subclass's expanded spells tagged "Patron".
 */
export async function fetchClassSpellOptions(className: string, maxSpellLevel: number, sub: SubclassOption | null): Promise<SpellOption[]> {
  const [spells, classMap] = await Promise.all([fetchSpells(), fetchSpellClassMap()])
  const expanded = new Set(Object.entries(sub?.expanded ?? {}).filter(([l]) => Number(l) <= maxSpellLevel).flatMap(([, n]) => n))
  const out: SpellOption[] = []
  const seen = new Set<string>()
  for (const s of spells) {
    if (!SPELL_SOURCES.includes(s.source ?? '') || s.level > maxSpellLevel) continue
    const lower = s.name.toLowerCase()
    const onList = classMap.get(lower)?.has(className)
    const isExpanded = expanded.has(lower)
    if ((!onList && !isExpanded) || seen.has(lower)) continue
    seen.add(lower)
    out.push({ ...s, key: `${s.name}|${s.source}`, tag: isExpanded && !onList ? sub?.shortName ?? 'Subclass' : undefined })
  }
  return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
}

/** Look up full spell entries by (lowercase) name, e.g. domain spells. */
export async function spellsByName(names: string[]): Promise<Spell[]> {
  const want = new Set(names.map(n => n.toLowerCase()))
  const spells = await fetchSpells()
  const found = new Map<string, Spell>()
  for (const s of spells) {
    const k = s.name.toLowerCase()
    if (want.has(k) && (!found.has(k) || s.source === 'PHB')) found.set(k, s)
  }
  return [...found.values()]
}

// ── Hit points ────────────────────────────────────────────────────────────────

export const averageHitDieRoll = (hitDie: number) => hitDie / 2 + 1

/** Max HP: full hit die at level 1, then average (or rolled) die + CON mod per level, min 1 each. */
export function hitPointsAt(hitDie: number, level: number, con: number, rolls: Array<number | null> | null): number {
  const cm = modifier(con)
  let hp = Math.max(1, hitDie + cm)
  for (let l = 2; l <= level; l++) {
    const die = rolls ? (rolls[l - 2] ?? averageHitDieRoll(hitDie)) : averageHitDieRoll(hitDie)
    hp += Math.max(1, die + cm)
  }
  return hp
}

// ── Racial spells (Tiefling Thaumaturgy, High Elf wizard cantrip…) ───────────

export interface RacialSpells {
  fixed: string[]                                        // known from level 1
  choice: { className: string; level: number } | null   // "one wizard cantrip of your choice"
}

/** Level-1 known spells from race/subrace `additionalSpells` (innate higher-level ones are left as traits). */
export function racialSpells(raws: Array<Record<string, unknown> | undefined>): RacialSpells {
  const out: RacialSpells = { fixed: [], choice: null }
  for (const raw of raws) {
    const first = Array.isArray(raw?.additionalSpells) ? (raw!.additionalSpells as Record<string, unknown>[])[0] : undefined
    const known = (first?.known as Record<string, unknown> | undefined)?.['1']
    const entries = Array.isArray(known) ? known : Array.isArray((known as Record<string, unknown> | undefined)?._) ? (known as { _: unknown[] })._ : []
    for (const e of entries) {
      if (typeof e === 'string') out.fixed.push(e.split('#')[0].split('|')[0])
      else if (e && typeof e === 'object' && typeof (e as Record<string, unknown>).choose === 'string') {
        const f = Object.fromEntries(String((e as { choose: string }).choose).split('|').map(kv => kv.split('=')))
        if (f.class) out.choice = { className: f.class, level: Number(f.level ?? 0) }
      }
    }
  }
  out.fixed = [...new Set(out.fixed)]
  return out
}
