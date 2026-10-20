// Choices a class makes as it levels (2014 rules): optional features (Metamagic,
// Eldritch Invocations, Pact Boon, Fighting Style), Ability Score Improvements or
// feats, Expertise, Ranger's Favored Enemy / Natural Explorer, and the bonus
// proficiencies some subclasses give. Option lists, prerequisites, costs and feats
// come from 5etools; expertise, ranger and subclass grants are authored because
// 5etools only states them in prose.

import type { AbilityKey, AbilityScores, ClassOptionPick } from '../types'
import { ABILITY_KEYS, ALL_SKILLS } from '../utils'
import { ALL_TOOLS, ARTISAN_TOOLS, EXOTIC_LANGUAGES, GAMING_SETS, STANDARD_LANGUAGES, flatten, stripTags, type Grants } from './creator2014'

const BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data'
const SOURCES = ['PHB', 'XGE', 'TCE']   // 2014-compatible books
const lower = (s: string) => s.toLowerCase()

// ── Optional features ─────────────────────────────────────────────────────────

export interface OptionalFeature {
  key: string                  // "Quickened Spell|PHB"
  name: string
  source: string
  featureTypes: string[]
  prerequisite?: Array<Record<string, unknown>>
  cost?: string                // Metamagic: "2", "1-9"
  description: string
}

let optPromise: Promise<OptionalFeature[]> | null = null

export function fetchOptionalFeatures(): Promise<OptionalFeature[]> {
  if (optPromise) return optPromise
  optPromise = fetch(`${BASE}/optionalfeatures.json`)
    .then(r => r.json())
    .then((json: { optionalfeature: Record<string, unknown>[] }) => json.optionalfeature
      .filter(o => SOURCES.includes(o.source as string))
      .map((o): OptionalFeature => {
        const c = o.consumes as { amount?: number; amountMin?: number; amountMax?: number } | undefined
        return {
          key: `${o.name}|${o.source}`,
          name: o.name as string,
          source: o.source as string,
          featureTypes: o.featureType as string[],
          prerequisite: o.prerequisite as OptionalFeature['prerequisite'],
          // No amount listed means 1 (Careful Spell); a range means it scales (Twinned Spell).
          cost: !c ? undefined : c.amount != null ? String(c.amount) : c.amountMin != null ? `${c.amountMin}-${c.amountMax}` : '1',
          description: flatten(o.entries),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name)))
    .catch(err => { optPromise = null; throw err })
  return optPromise
}

/** One kind of option a class picks, e.g. "Metamagic" ×2 at level 3. */
export interface OptionSlot { name: string; featureTypes: string[]; count: number }

/** How many of each option kind a class has at `level`, from 5etools optionalfeatureProgression. */
export function optionSlotsAt(progression: unknown[], level: number): OptionSlot[] {
  return (progression as Array<{ name: string; featureType: string[]; progression: number[] | Record<string, number> }>)
    .map(p => {
      let count = 0
      if (Array.isArray(p.progression)) count = p.progression[level - 1] ?? 0
      else for (const [lvl, n] of Object.entries(p.progression)) if (Number(lvl) <= level) count = Math.max(count, n)
      return { name: p.name, featureTypes: p.featureType, count }
    })
    .filter(s => s.count > 0)
}

export interface PrereqContext {
  className: string
  level: number
  subclass: string
  pact: string | null            // chosen Pact Boon: "Chain", "Blade", "Tome", "Talisman"
  spells: string[]               // known spell names, lowercase
}

export interface PrereqResult { ok: boolean; text: string }

/** 5etools prerequisites are alternatives (any one may pass). Unknown kinds pass with a "check" note. */
export function checkPrereq(prereq: Array<Record<string, unknown>> | undefined, ctx: PrereqContext): PrereqResult {
  if (!prereq?.length) return { ok: true, text: '' }
  const results = prereq.map(alt => {
    const parts: string[] = []
    let ok = true
    for (const [k, v] of Object.entries(alt)) {
      if (k === 'level') {
        const lvl = typeof v === 'number' ? v : Number((v as Record<string, unknown>).level)
        const cls = typeof v === 'object' ? ((v as Record<string, unknown>).class as Record<string, unknown> | undefined)?.name as string | undefined : undefined
        parts.push(`level ${lvl}${cls ? ` ${cls}` : ''}`)
        if (ctx.level < lvl || (cls && lower(cls) !== lower(ctx.className))) ok = false
      } else if (k === 'pact') {
        parts.push(`Pact of the ${v}`)
        if (lower(ctx.pact ?? '') !== lower(String(v))) ok = false
      } else if (k === 'spell') {
        const names = (v as string[]).map(s => s.split('#')[0].split('|')[0])
        parts.push(names.map(n => n.replace(/\b\w/g, c => c.toUpperCase())).join(' or '))
        if (!names.some(n => ctx.spells.includes(lower(n)))) ok = false
      } else if (k === 'patron') {
        parts.push(`${v} patron`)
        if (!lower(ctx.subclass).includes(lower(String(v)))) ok = false
      } else if (k === 'otherSummary' || k === 'other') {
        const t = typeof v === 'string' ? v : String((v as Record<string, unknown>).entrySummary ?? (v as Record<string, unknown>).entry ?? '')
        parts.push(`${stripTags(t)} (check with your DM)`)
      }
    }
    return { ok, text: parts.join(', ') }
  })
  return results.find(r => r.ok) ?? { ok: false, text: results.map(r => r.text).join(' or ') }
}

// ── Feats ─────────────────────────────────────────────────────────────────────

export interface FeatOption {
  key: string
  name: string
  source: string
  description: string
  prerequisite?: Array<Record<string, unknown>>
  abilityFixed: Partial<Record<AbilityKey, number>>
  abilityChoice: AbilityKey[] | null   // "+1 to one of these"
  saveFollowsChoice: boolean           // Resilient: proficiency in the chosen ability's save
  armor: string[]
}

let featPromise: Promise<FeatOption[]> | null = null

export function fetchFeats(): Promise<FeatOption[]> {
  if (featPromise) return featPromise
  featPromise = fetch(`${BASE}/feats.json`)
    .then(r => r.json())
    .then((json: { feat: Record<string, unknown>[] }) => json.feat
      .filter(f => SOURCES.includes(f.source as string))
      .map((f): FeatOption => {
        const ab = Array.isArray(f.ability) ? (f.ability[0] ?? {}) as Record<string, unknown> : {}
        const abilityFixed: Partial<Record<AbilityKey, number>> = {}
        for (const k of ABILITY_KEYS) if (typeof ab[k] === 'number') abilityFixed[k] = ab[k] as number
        const choose = ab.choose as { from?: AbilityKey[] } | undefined
        const armorRaw = Array.isArray(f.armorProficiencies) ? (f.armorProficiencies[0] ?? {}) as Record<string, unknown> : {}
        const armorLabel: Record<string, string> = { light: 'Light armor', medium: 'Medium armor', heavy: 'Heavy armor', shield: 'Shields' }
        return {
          key: `${f.name}|${f.source}`,
          name: f.name as string,
          source: f.source as string,
          description: flatten(f.entries),
          prerequisite: f.prerequisite as FeatOption['prerequisite'],
          abilityFixed,
          abilityChoice: choose?.from ?? null,
          saveFollowsChoice: Array.isArray(f.savingThrowProficiencies),
          armor: Object.entries(armorRaw).filter(([, v]) => v === true).map(([k]) => armorLabel[k] ?? k),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name)))
    .catch(err => { featPromise = null; throw err })
  return featPromise
}

export interface FeatContext {
  abilities: AbilityScores
  race: string                   // "Elf (High)"
  spellcaster: boolean
  armor: string[]                // proficiency names, e.g. "Heavy armor"
}

export function checkFeatPrereq(feat: FeatOption, ctx: FeatContext): PrereqResult {
  if (!feat.prerequisite?.length) return { ok: true, text: '' }
  const results = feat.prerequisite.map(alt => {
    const parts: string[] = []
    let ok = true
    for (const [k, v] of Object.entries(alt)) {
      if (k === 'ability') {
        const opts = (v as Array<Record<string, number>>).flatMap(o => Object.entries(o))
        parts.push(opts.map(([a, n]) => `${a.toUpperCase()} ${n}+`).join(' or '))
        if (!opts.some(([a, n]) => (ctx.abilities[a as AbilityKey] ?? 0) >= n)) ok = false
      } else if (k === 'race') {
        const names = (v as Array<{ name: string; subrace?: string }>).map(r => r.subrace ? `${r.subrace} ${r.name}` : r.name)
        parts.push(names.map(n => n.replace(/\b\w/g, c => c.toUpperCase())).join(' or '))
        if (!(v as Array<{ name: string }>).some(r => lower(ctx.race).startsWith(lower(r.name)) || lower(ctx.race).includes(`(${lower(r.name)})`))) ok = false
      } else if (k === 'spellcasting' || k === 'spellcasting2020') {
        parts.push('can cast at least one spell')
        if (!ctx.spellcaster) ok = false
      } else if (k === 'proficiency') {
        for (const p of v as Array<Record<string, string>>) {
          if (p.armor) {
            parts.push(`${p.armor} armor proficiency`)
            if (!ctx.armor.some(a => lower(a).startsWith(lower(p.armor)))) ok = false
          }
          if (p.weapon) parts.push(`${p.weapon} weapon proficiency (check)`)
        }
      } else if (k === 'other' || k === 'otherSummary') {
        parts.push(`${stripTags(String(typeof v === 'string' ? v : (v as Record<string, unknown>).entrySummary ?? ''))} (check with your DM)`)
      } else if (k === 'level') {
        parts.push(`level ${typeof v === 'number' ? v : (v as Record<string, unknown>).level}`)
      }
    }
    return { ok, text: parts.join(', ') }
  })
  return results.find(r => r.ok) ?? { ok: false, text: results.map(r => r.text).join(' or ') }
}

// ── Ability Score Improvement / feat choice ──────────────────────────────────

export interface AsiChoice {
  mode: 'plus2' | 'plus1x2' | 'feat'
  abilities: AbilityKey[]          // plus2: [a]; plus1x2: [a, b]
  feat: string | null              // FeatOption.key
  featAbility: AbilityKey | null   // for "+1 to one of …" feats
}

export const emptyAsi = (mode: AsiChoice['mode'] = 'plus2'): AsiChoice => ({ mode, abilities: [], feat: null, featAbility: null })

export function asiComplete(c: AsiChoice, feats: FeatOption[]): boolean {
  if (c.mode === 'plus2') return c.abilities.length === 1
  if (c.mode === 'plus1x2') return c.abilities.length === 2
  const f = feats.find(x => x.key === c.feat)
  return !!f && (!f.abilityChoice || !!c.featAbility)
}

/** Ability increases from a set of ASI/feat choices. */
export function asiBonus(choices: AsiChoice[], feats: FeatOption[]): Record<AbilityKey, number> {
  const out = Object.fromEntries(ABILITY_KEYS.map(k => [k, 0])) as Record<AbilityKey, number>
  for (const c of choices) {
    if (c.mode === 'plus2') c.abilities.slice(0, 1).forEach(a => { out[a] += 2 })
    else if (c.mode === 'plus1x2') c.abilities.slice(0, 2).forEach(a => { out[a] += 1 })
    else {
      const f = feats.find(x => x.key === c.feat)
      if (!f) continue
      for (const [k, v] of Object.entries(f.abilityFixed)) out[k as AbilityKey] += v ?? 0
      if (f.abilityChoice && c.featAbility) out[c.featAbility] += 1
    }
  }
  return out
}

// ── Expertise (prose-only in 5etools) ─────────────────────────────────────────

const EXPERTISE: Record<string, Record<number, number>> = {
  Rogue: { 1: 2, 6: 2 },
  Bard: { 3: 2, 10: 2 },
}

export function expertiseCountAt(className: string, level: number): number {
  return Object.entries(EXPERTISE[className] ?? {}).reduce((n, [lvl, c]) => n + (Number(lvl) <= level ? c : 0), 0)
}

/** Rogues may pick thieves' tools instead of a skill. */
export const expertiseAllowsThievesTools = (className: string) => className === 'Rogue'

// ── Ranger: Favored Enemy & Natural Explorer (PHB, prose-only) ───────────────

const FAVORED_ENEMIES = ['Aberrations', 'Beasts', 'Celestials', 'Constructs', 'Dragons', 'Elementals', 'Fey', 'Fiends',
  'Giants', 'Monstrosities', 'Oozes', 'Plants', 'Undead', 'Two humanoid races (pick with your DM)']
const TERRAINS = ['Arctic', 'Coast', 'Desert', 'Forest', 'Grassland', 'Mountain', 'Swamp', 'Underdark']

const rangerOption = (type: string, name: string, description: string): OptionalFeature =>
  ({ key: `${name}|PHB`, name, source: 'PHB', featureTypes: [type], description })

/** Ranger choices as option slots + options, so they use the same picker as Metamagic. */
export function rangerSlotsAt(className: string, level: number): Array<{ slot: OptionSlot; options: OptionalFeature[] }> {
  if (className !== 'Ranger') return []
  const step = (table: Record<number, number>) => Object.entries(table).reduce((n, [l, c]) => (Number(l) <= level ? c : n), 0)
  return [
    {
      slot: { name: 'Favored Enemy', featureTypes: ['RFE'], count: step({ 1: 1, 6: 2, 14: 3 }) },
      options: FAVORED_ENEMIES.map(n => rangerOption('RFE', n, 'Advantage on Survival checks to track them and on Intelligence checks to recall information about them; you also learn one language they speak.')),
    },
    {
      slot: { name: 'Favored Terrain (Natural Explorer)', featureTypes: ['RNE'], count: step({ 1: 1, 6: 2, 10: 3 }) },
      options: TERRAINS.map(n => rangerOption('RNE', n, 'While travelling in this terrain your group can’t be slowed by difficult terrain or get lost, and you forage and track more easily.')),
    },
  ].filter(x => x.slot.count > 0)
}

// ── Subclass bonus proficiencies (prose-only in 5etools) ─────────────────────

interface SubclassGrant {
  armor?: string[]
  weapons?: string[]
  tools?: string[]
  languages?: string[]
  skills?: string[]
  expertiseSkills?: string[]
  skillChoice?: { count: number; from?: string[] }
  toolChoice?: { count: number; from: string[] }
  languageChoice?: number
}

const SUBCLASS_GRANTS: Record<string, SubclassGrant> = {
  // Cleric
  'Life Domain':      { armor: ['Heavy armor'] },
  'Nature Domain':    { armor: ['Heavy armor'], skillChoice: { count: 1, from: ['Animal Handling', 'Nature', 'Survival'] } },
  'Tempest Domain':   { armor: ['Heavy armor'], weapons: ['Martial weapons'] },
  'War Domain':       { armor: ['Heavy armor'], weapons: ['Martial weapons'] },
  'Forge Domain':     { armor: ['Heavy armor'], tools: ["Smith's tools"] },
  'Order Domain':     { armor: ['Heavy armor'], skillChoice: { count: 1, from: ['Intimidation', 'Persuasion'] } },
  'Peace Domain':     { skillChoice: { count: 1, from: ['Insight', 'Performance', 'Persuasion'] } },
  'Twilight Domain':  { armor: ['Heavy armor'], weapons: ['Martial weapons'] },
  'Death Domain':     { weapons: ['Martial weapons'] },
  'Knowledge Domain': { languageChoice: 2, skillChoice: { count: 2, from: ['Arcana', 'History', 'Nature', 'Religion'] } },
  'Arcana Domain':    { skills: ['Arcana'] },
  // Warlock
  'The Hexblade':     { armor: ['Medium armor', 'Shields'], weapons: ['Martial weapons'] },
  // Bard
  'College of Valor':  { armor: ['Medium armor', 'Shields'], weapons: ['Martial weapons'] },
  'College of Swords': { armor: ['Medium armor'], weapons: ['Scimitar'] },
  'College of Lore':   { skillChoice: { count: 3 } },
  'College of Creation': { toolChoice: { count: 1, from: ARTISAN_TOOLS } },
  // Fighter
  'Battle Master':    { toolChoice: { count: 1, from: ARTISAN_TOOLS } },
  'Samurai':          { skillChoice: { count: 1, from: ['History', 'Insight', 'Performance', 'Persuasion'] } },
  'Cavalier':         { skillChoice: { count: 1, from: ['Animal Handling', 'History', 'Insight', 'Performance', 'Persuasion'] } },
  'Arcane Archer':    { skillChoice: { count: 1, from: ['Arcana', 'Nature'] } },
  'Rune Knight':      { tools: ["Smith's tools"], languages: ['Giant'] },
  // Rogue
  'Assassin':         { tools: ['Disguise kit', "Poisoner's kit"] },
  'Mastermind':       { tools: ['Disguise kit', 'Forgery kit'], toolChoice: { count: 1, from: GAMING_SETS }, languageChoice: 2 },
  'Scout':            { skills: ['Nature', 'Survival'], expertiseSkills: ['Nature', 'Survival'] },
  // Monk
  'Way of the Drunken Master': { skills: ['Performance'], tools: ["Brewer's supplies"] },
  'Way of the Kensei': { toolChoice: { count: 1, from: ["Calligrapher's supplies", "Painter's supplies"] } },
  // Ranger
  'Fey Wanderer':     { skillChoice: { count: 1, from: ['Deception', 'Performance', 'Persuasion'] } },
  // Sorcerer
  'Draconic Bloodline': { languages: ['Draconic'] },
  // Wizard
  'Bladesinging':     { armor: ['Light armor'], skills: ['Performance'] },
}

/** A subclass's bonus proficiencies as a grant group, so choices reuse the proficiency pickers. */
export function subclassGrants(subclassName: string): Grants | null {
  const g = SUBCLASS_GRANTS[subclassName]
  if (!g) return null
  const choices: Grants['choices'] = []
  if (g.skillChoice) choices.push({ id: 'subclass:skill:0', kind: 'skill', count: g.skillChoice.count,
    options: g.skillChoice.from ?? [...ALL_SKILLS], label: `Choose ${g.skillChoice.count} skill${g.skillChoice.count > 1 ? 's' : ''}` })
  if (g.toolChoice) choices.push({ id: 'subclass:tool:0', kind: 'tool', count: g.toolChoice.count,
    options: g.toolChoice.from.filter(t => ALL_TOOLS.includes(t)), label: `Choose ${g.toolChoice.count} tool` })
  if (g.languageChoice) choices.push({ id: 'subclass:language:0', kind: 'language', count: g.languageChoice,
    options: [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES], label: `Choose ${g.languageChoice} languages` })
  return {
    source: 'subclass', sourceLabel: subclassName, abilityFixed: {}, abilityChoices: [],
    skills: g.skills ?? [], languages: g.languages ?? [], tools: g.tools ?? [],
    armor: g.armor ?? [], weapons: g.weapons ?? [], saves: [], choices,
    expertiseSkills: g.expertiseSkills,
  }
}

/** Options already on a character, keyed the same way as OptionalFeature.key. */
export const pickKey = (p: ClassOptionPick) => `${p.name}|${p.source}`
