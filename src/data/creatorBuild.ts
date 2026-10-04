// Turns the creator's selections (resolved race/class/background grants plus the
// player's picks) into sheet fields. Pure functions except finalizeCharacter(),
// which enriches items and adds level-1 class features over the network.

import type {
  AbilityKey, AbilityScores, Character, InventoryItem, LanguageEntry, PassiveTrait, ProficiencyEntry,
} from '../types'
import { v4 as uuid } from '../uuid'
import { ABILITY_KEYS, ALL_SKILLS, defaultSavingThrows, defaultSkills, modifier } from '../utils'
import { makeDefaultCharacter } from '../defaultCharacter'
import { lookupItems } from './fiveEtools'
import { fetchClassProgression } from './fiveEtoolsProgression'
import { buildFeatureForCharacter, lookupFeatureMeta } from './featureMetadata'
import {
  ALL_TOOLS, toolCategory,
  type BackgroundOption, type Choice, type ClassOption, type CreatorItem, type GrantKind, type Grants, type ResolvedRace,
} from './creator2014'

/** choice id → picked option names (ability choices store ability keys). */
export type Picks = Record<string, string[]>

const lower = (s: string) => s.toLowerCase()

function fixedOf(g: Grants, kind: GrantKind): string[] {
  return kind === 'skill' ? g.skills : kind === 'language' ? g.languages : g.tools
}

// ── Grouping & the PHB overlap rule ──────────────────────────────────────────

/**
 * PHB p.125: if two sources grant the same skill or tool proficiency, you choose
 * a different one of that kind instead. Groups must be ordered race → background
 * → class; the replacement pick goes to the later source.
 */
export function addReplacementChoices(groups: Grants[]): Grants[] {
  const seen: Record<'skill' | 'tool', Map<string, string>> = { skill: new Map(), tool: new Map() }
  return groups.map(g => {
    const extra: Choice[] = []
    const check = (kind: 'skill' | 'tool', names: string[], options: string[]) => {
      for (const n of names) {
        const prev = seen[kind].get(lower(n))
        if (prev) {
          extra.push({
            id: `${g.source}:${kind}-replace:${lower(n)}`, kind, count: 1, options,
            label: `Replacement ${kind}: you already get ${n} from ${prev}, so pick another`,
          })
        } else {
          seen[kind].set(lower(n), g.sourceLabel)
        }
      }
    }
    check('skill', g.skills, ALL_SKILLS)
    check('tool', g.tools, ALL_TOOLS)
    return extra.length ? { ...g, choices: [...g.choices, ...extra] } : g
  })
}

/** Names of `kind` already provided by a fixed grant, or picked in a different choice. */
export function ownedElsewhere(groups: Grants[], picks: Picks, kind: GrantKind, exceptChoiceId?: string): Map<string, string> {
  const owned = new Map<string, string>()
  for (const g of groups) for (const n of fixedOf(g, kind)) if (!owned.has(lower(n))) owned.set(lower(n), g.sourceLabel)
  for (const g of groups) {
    for (const c of g.choices) {
      if (c.kind !== kind || c.id === exceptChoiceId) continue
      for (const p of picks[c.id] ?? []) if (!owned.has(lower(p))) owned.set(lower(p), `your ${g.sourceLabel} pick`)
    }
  }
  return owned
}

/** How many more picks a choice needs (capped by how many options are still free). */
export function choiceRemaining(choice: Choice, groups: Grants[], picks: Picks): number {
  const owned = ownedElsewhere(groups, picks, choice.kind, choice.id)
  const available = choice.options.filter(o => !owned.has(lower(o))).length
  return Math.max(0, Math.min(choice.count, available) - (picks[choice.id]?.length ?? 0))
}

export function proficiencyChoicesComplete(groups: Grants[], picks: Picks): boolean {
  return groups.every(g => g.choices.every(c => choiceRemaining(c, groups, picks) === 0))
}

/**
 * Drop picks that no longer make sense after the player goes back and changes
 * something: options that vanished, names now granted by a fixed source, duplicates
 * across choices (first one wins), and overflow beyond the choice's count.
 */
export function sanitizePicks(groups: Grants[], picks: Picks): Picks {
  const out: Picks = {}
  const taken: Record<GrantKind, Set<string>> = { skill: new Set(), language: new Set(), tool: new Set() }
  for (const g of groups) for (const k of ['skill', 'language', 'tool'] as GrantKind[]) fixedOf(g, k).forEach(n => taken[k].add(lower(n)))

  for (const g of groups) {
    for (const c of g.choices) {
      const kept: string[] = []
      for (const p of picks[c.id] ?? []) {
        if (kept.length >= c.count) break
        if (!c.options.some(o => lower(o) === lower(p)) || taken[c.kind].has(lower(p))) continue
        taken[c.kind].add(lower(p))
        kept.push(p)
      }
      if (kept.length) out[c.id] = kept
    }
    for (const a of g.abilityChoices) {
      const kept = [...new Set(picks[a.id] ?? [])].filter(k => (a.from as string[]).includes(k)).slice(0, a.count)
      if (kept.length) out[a.id] = kept
    }
  }
  return out
}

// ── Ability scores ───────────────────────────────────────────────────────────

export function racialBonus(race: Grants, picks: Picks): Record<AbilityKey, number> {
  const out = Object.fromEntries(ABILITY_KEYS.map(k => [k, 0])) as Record<AbilityKey, number>
  for (const [k, v] of Object.entries(race.abilityFixed)) out[k as AbilityKey] += v ?? 0
  for (const ch of race.abilityChoices) {
    for (const k of (picks[ch.id] ?? []).slice(0, ch.count)) out[k as AbilityKey] += ch.amount
  }
  return out
}

export function abilityChoicesComplete(race: Grants, picks: Picks): boolean {
  return race.abilityChoices.every(ch => (picks[ch.id]?.length ?? 0) >= ch.count)
}

// ── Build ────────────────────────────────────────────────────────────────────

/** Free text; `traits` may hold several lines. */
export interface Personality { traits: string; ideal: string; bond: string; flaw: string }

export interface BuildInput {
  name: string
  raceLabel: string
  race: ResolvedRace | null          // null → custom/homebrew race
  className: string
  cls: ClassOption | null            // null → custom/homebrew class
  hitDie: number
  backgroundName: string
  background: BackgroundOption | null
  groups: Grants[]                   // race, background, class (with replacements)
  picks: Picks
  abilities: AbilityScores           // final scores, racial bonuses included
  personality: Personality
  alignment: string
}

/** Every name of `kind` the character ends up with: fixed grants + picks. */
export function grantedNames(groups: Grants[], picks: Picks, kind: GrantKind): string[] {
  const all = groups.flatMap(g => [
    ...fixedOf(g, kind),
    ...g.choices.filter(c => c.kind === kind).flatMap(c => picks[c.id] ?? []),
  ])
  return [...new Map(all.map(n => [lower(n), n])).values()]
}

/** Turn "Musical instrument (your choice)" into the instrument the player picked. */
function resolvePlaceholders(items: CreatorItem[], tools: string[]): InventoryItem[] {
  const unused = [...tools]
  return items.map(({ equipmentType, ...item }) => {
    if (!equipmentType) return item
    const idx = unused.findIndex(t => toolCategory(t) === equipmentType)
    if (idx < 0) return item
    const [tool] = unused.splice(idx, 1)
    return { ...item, name: tool, notes: '' }
  })
}

export function buildCharacter(i: BuildInput): Partial<Character> {
  const { groups, picks } = i

  const skills = defaultSkills()
  for (const s of grantedNames(groups, picks, 'skill')) {
    const key = ALL_SKILLS.find(k => lower(k) === lower(s))
    if (key) skills[key] = { proficient: true, expertise: false }
  }

  const savingThrows = defaultSavingThrows()
  for (const k of i.cls?.saves ?? []) savingThrows[k] = true

  const tools = grantedNames(groups, picks, 'tool')
  const prof = (name: string, category: ProficiencyEntry['category']): ProficiencyEntry => ({ id: uuid(), name, category })
  const proficiencyList: ProficiencyEntry[] = [
    ...[...new Set(groups.flatMap(g => g.armor))].map(n => prof(n, 'armor')),
    ...[...new Set(groups.flatMap(g => g.weapons))].map(n => prof(n, 'weapon')),
    ...tools.map(n => prof(n, 'tool')),
  ]
  const languages: LanguageEntry[] = grantedNames(groups, picks, 'language').map(name => ({ id: uuid(), name, notes: '' }))

  const hp = Math.max(1, i.hitDie + modifier(i.abilities.con))

  const passiveTraits: PassiveTrait[] = (i.race?.traits ?? [])
    .filter(t => t.text)
    .map(t => ({ id: uuid(), name: t.name, description: t.text }))
  if (i.background?.feature) {
    passiveTraits.push({ id: uuid(), name: i.background.feature.name, description: i.background.feature.text })
  }

  // Background placeholders (an Entertainer's instrument) take the tools picked for them.
  const inventory = [
    ...resolvePlaceholders(i.cls?.equipment ?? [], tools),
    ...resolvePlaceholders(i.background?.equipment ?? [], tools),
  ]

  return {
    name: i.name,
    race: i.raceLabel,
    class: i.className,
    subclass: '',
    background: i.backgroundName,
    alignment: i.alignment,
    level: 1,
    xp: 0,
    abilities: i.abilities,
    maxHp: hp,
    currentHp: hp,
    tempHp: 0,
    ac: 10 + modifier(i.abilities.dex),
    speed: i.race?.speed ?? 30,
    hitDice: `1d${i.hitDie}`,
    maxHitDice: `1d${i.hitDie}`,
    skills,
    savingThrows,
    proficiencies: '',
    proficiencyList,
    languages,
    spellcastingAbility: i.cls?.spellcastingAbility ?? '',
    inventory,
    currency: { cp: 0, sp: 0, ep: 0, gp: (i.cls?.equipmentGp ?? 0) + (i.background?.gp ?? 0), pp: 0 },
    activeFeatures: [],
    passiveTraits,
    personalityTraits: i.personality.traits,
    ideals: i.personality.ideal,
    bonds: i.personality.bond,
    flaws: i.personality.flaw,
  }
}

/**
 * Network enrichment on Create: fill item weights/stats from 5etools and add the
 * class's level-1 features that the feature-metadata table knows how to track
 * (Second Wind, Rage, Arcane Recovery…). Failures are swallowed — the character
 * is still created, just without the extras.
 */
export async function finalizeCharacter(built: Partial<Character>, className: string | null, subclassName = ''): Promise<Partial<Character>> {
  const out = { ...built }
  try {
    if (out.inventory?.length) out.inventory = await lookupItems(out.inventory)
  } catch { /* keep the bare items */ }

  if (!className) return out
  try {
    const level = out.level ?? 1
    const prog = await fetchClassProgression(className, '2014', subclassName || undefined)
    const asChar = { ...makeDefaultCharacter(), ...out } as Character
    const add = (name: string, lvl: number, passiveFallback: boolean) => {
      const desc = prog?.featureMap.get(`${name}|${lvl}`)?.description ?? ''
      const f = lookupFeatureMeta(name, className) ? buildFeatureForCharacter(name, desc, asChar, className) : null
      if (f?.active) out.activeFeatures = [...(out.activeFeatures ?? []), f.active]
      else if (f?.passive) out.passiveTraits = [...(out.passiveTraits ?? []), f.passive]
      else if (passiveFallback) out.passiveTraits = [...(out.passiveTraits ?? []), { id: uuid(), name, description: desc }]
    }
    const seen = new Set<string>()
    for (const row of prog?.levels.slice(0, level) ?? []) {
      // Class features: only ones the metadata table can track (the Class tab lists the rest).
      for (const name of row.features) if (!seen.has(name)) { seen.add(name); add(name, row.level, false) }
      // Subclass features always go on the sheet; skip the wrapper named after the subclass itself.
      for (const name of row.subclassFeatures) {
        if (seen.has(name) || name === prog?.subclassName) continue
        seen.add(name)
        add(name, row.level, true)
      }
    }
  } catch { /* features can still be added from the Class tab */ }
  return out
}
