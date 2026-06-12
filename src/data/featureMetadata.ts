import type { AbilityKey, ActionType, RechargeType, Character, ActiveFeature, PassiveTrait } from '../types'
import { modifier, proficiencyBonus } from '../utils'
import { v4 as uuid } from '../uuid'

// ─────────────────────────────────────────────────────────────────────────────
// Static class-feature metadata table.
//
// WHY A STATIC TABLE (not an LLM / not a neural net):
// The set of official 5e class features is finite and known, so the correct
// extraction of {actionType, uses, recharge} is authored once, by hand, and
// shipped as data. Zero runtime cost, no API/tokens, 100% deterministic, and a
// wrong value is a one-line fix. Descriptions still come live from 5etools — we
// only supply the mechanical metadata that prose-parsing would get wrong.
//
// `uses` supports scaling formulas (ability mod, prof bonus, by-level) so a
// feature like Channel Divinity resolves to the right number for the character.
// Coverage is v1: resource-based / actionable features for the core classes,
// prioritising the active features where this metadata actually matters. Passive
// features are listed as `kind: 'passive'` so the importer routes them correctly.
// ─────────────────────────────────────────────────────────────────────────────

export type UsesFormula =
  | { kind: 'fixed'; value: number }
  | { kind: 'abilityMod'; ability: AbilityKey; min?: number }     // e.g. CHA mod, min 1
  | { kind: 'profBonus' }                                          // = proficiency bonus
  | { kind: 'level'; thresholds: Array<{ min: number; value: number }> } // step by class level

export interface FeatureMeta {
  /** Canonical feature name as it appears in 5etools / the Class tab. */
  name: string
  /** Which class this belongs to (lowercase). Used to disambiguate shared names. */
  class: string
  kind: 'active' | 'passive'
  // active-only:
  actionType?: ActionType
  recharge?: RechargeType
  uses?: UsesFormula
}

// ── Helper: resolve a uses formula against a character ────────────────────────

export function resolveUses(formula: UsesFormula | undefined, char: Character): number {
  if (!formula) return 0
  switch (formula.kind) {
    case 'fixed':     return formula.value
    case 'profBonus': return proficiencyBonus(char.level)
    case 'abilityMod': {
      const m = modifier(char.abilities[formula.ability])
      return Math.max(formula.min ?? 1, m)
    }
    case 'level': {
      // highest threshold whose `min` <= character level
      let val = 0
      for (const t of formula.thresholds) if (char.level >= t.min) val = t.value
      return val
    }
  }
}

// ── The table ─────────────────────────────────────────────────────────────────
// Keyed loosely; lookup is by (name, class) case-insensitively.

const F = (m: FeatureMeta) => m

export const FEATURE_META: FeatureMeta[] = [
  // ── Fighter ────────────────────────────────────────────────────────────────
  F({ name: 'Second Wind', class: 'fighter', kind: 'active', actionType: 'bonus', recharge: 'short',
      uses: { kind: 'fixed', value: 1 } }),
  F({ name: 'Action Surge', class: 'fighter', kind: 'active', actionType: 'special', recharge: 'short',
      uses: { kind: 'level', thresholds: [{ min: 2, value: 1 }, { min: 17, value: 2 }] } }),
  F({ name: 'Indomitable', class: 'fighter', kind: 'active', actionType: 'reaction', recharge: 'long',
      uses: { kind: 'level', thresholds: [{ min: 9, value: 1 }, { min: 13, value: 2 }, { min: 17, value: 3 }] } }),
  // Champion (mostly passive)
  F({ name: 'Improved Critical', class: 'fighter', kind: 'passive' }),
  F({ name: 'Remarkable Athlete', class: 'fighter', kind: 'passive' }),
  F({ name: 'Superior Critical', class: 'fighter', kind: 'passive' }),
  F({ name: 'Survivor', class: 'fighter', kind: 'passive' }),

  // ── Wizard ───────────────────────────────────────────────────────────────────
  F({ name: 'Arcane Recovery', class: 'wizard', kind: 'active', actionType: 'special', recharge: 'long',
      uses: { kind: 'fixed', value: 1 } }),
  // Evocation (mostly passive)
  F({ name: 'Sculpt Spells', class: 'wizard', kind: 'passive' }),
  F({ name: 'Potent Cantrip', class: 'wizard', kind: 'passive' }),
  F({ name: 'Empowered Evocation', class: 'wizard', kind: 'passive' }),
  F({ name: 'Overchannel', class: 'wizard', kind: 'passive' }),
  F({ name: 'Evocation Savant', class: 'wizard', kind: 'passive' }),

  // ── Cleric ─────────────────────────────────────────────────────────────────
  F({ name: 'Channel Divinity', class: 'cleric', kind: 'active', actionType: 'action', recharge: 'short',
      uses: { kind: 'level', thresholds: [{ min: 2, value: 1 }, { min: 6, value: 2 }, { min: 18, value: 3 }] } }),
  F({ name: 'Divine Intervention', class: 'cleric', kind: 'active', actionType: 'action', recharge: 'long',
      uses: { kind: 'fixed', value: 1 } }),
  // Death Domain
  F({ name: 'Reaper', class: 'cleric', kind: 'passive' }),
  F({ name: 'Touch of Death', class: 'cleric', kind: 'passive' }),       // triggers on Channel Divinity
  F({ name: 'Inescapable Destruction', class: 'cleric', kind: 'passive' }),
  F({ name: 'Divine Strike', class: 'cleric', kind: 'passive' }),
  F({ name: 'Improved Reaper', class: 'cleric', kind: 'passive' }),

  // ── Warlock ──────────────────────────────────────────────────────────────────
  F({ name: 'Mystic Arcanum', class: 'warlock', kind: 'active', actionType: 'special', recharge: 'long',
      uses: { kind: 'fixed', value: 1 } }),
  F({ name: 'Eldritch Master', class: 'warlock', kind: 'active', actionType: 'special', recharge: 'long',
      uses: { kind: 'fixed', value: 1 } }),
  // The Fiend
  F({ name: "Dark One's Blessing", class: 'warlock', kind: 'passive' }),
  F({ name: "Dark One's Own Luck", class: 'warlock', kind: 'active', actionType: 'special', recharge: 'short',
      uses: { kind: 'fixed', value: 1 } }),
  F({ name: 'Fiendish Resilience', class: 'warlock', kind: 'passive' }),
  F({ name: 'Hurl Through Hell', class: 'warlock', kind: 'active', actionType: 'special', recharge: 'long',
      uses: { kind: 'fixed', value: 1 } }),
  // The Celestial
  F({ name: 'Healing Light', class: 'warlock', kind: 'active', actionType: 'bonus', recharge: 'long',
      uses: { kind: 'abilityMod', ability: 'cha', min: 1 } }),  // 1 + CHA mod d6 pool — uses ≈ CHA mod (pool tracked loosely)
  F({ name: 'Radiant Soul', class: 'warlock', kind: 'passive' }),
  F({ name: 'Celestial Resilience', class: 'warlock', kind: 'passive' }),
  F({ name: 'Searing Vengeance', class: 'warlock', kind: 'active', actionType: 'special', recharge: 'long',
      uses: { kind: 'fixed', value: 1 } }),

  // ── Barbarian ─────────────────────────────────────────────────────────────────
  F({ name: 'Rage', class: 'barbarian', kind: 'active', actionType: 'bonus', recharge: 'long',
      uses: { kind: 'level', thresholds: [
        { min: 1, value: 2 }, { min: 3, value: 3 }, { min: 6, value: 4 },
        { min: 12, value: 5 }, { min: 17, value: 6 },
      ] } }),

  // ── Bard ──────────────────────────────────────────────────────────────────────
  F({ name: 'Bardic Inspiration', class: 'bard', kind: 'active', actionType: 'bonus', recharge: 'long',
      uses: { kind: 'abilityMod', ability: 'cha', min: 1 } }),
  F({ name: 'Song of Rest', class: 'bard', kind: 'passive' }),
  F({ name: 'Font of Inspiration', class: 'bard', kind: 'passive' }),  // changes recharge to short — note only

  // ── Druid ──────────────────────────────────────────────────────────────────────
  F({ name: 'Wild Shape', class: 'druid', kind: 'active', actionType: 'action', recharge: 'short',
      uses: { kind: 'fixed', value: 2 } }),

  // ── Monk ──────────────────────────────────────────────────────────────────────
  F({ name: 'Ki', class: 'monk', kind: 'active', actionType: 'special', recharge: 'short',
      uses: { kind: 'level', thresholds: [{ min: 2, value: 2 }] } }),  // ki points = monk level (≥2); see note
  F({ name: 'Flurry of Blows', class: 'monk', kind: 'active', actionType: 'bonus', recharge: 'atwill' }),

  // ── Paladin ─────────────────────────────────────────────────────────────────────
  F({ name: 'Divine Sense', class: 'paladin', kind: 'active', actionType: 'action', recharge: 'long',
      uses: { kind: 'abilityMod', ability: 'cha', min: 1 } }),  // 1 + CHA mod
  F({ name: 'Lay on Hands', class: 'paladin', kind: 'active', actionType: 'action', recharge: 'long',
      uses: { kind: 'fixed', value: 1 } }),  // pool of 5×level HP — tracked as a single resource
  F({ name: 'Channel Divinity', class: 'paladin', kind: 'active', actionType: 'action', recharge: 'short',
      uses: { kind: 'fixed', value: 1 } }),
  F({ name: 'Cleansing Touch', class: 'paladin', kind: 'active', actionType: 'action', recharge: 'long',
      uses: { kind: 'abilityMod', ability: 'cha', min: 1 } }),

  // ── Ranger ─────────────────────────────────────────────────────────────────────
  F({ name: "Nature's Veil", class: 'ranger', kind: 'active', actionType: 'bonus', recharge: 'long',
      uses: { kind: 'profBonus' } }),

  // ── Rogue ──────────────────────────────────────────────────────────────────────
  F({ name: 'Stroke of Luck', class: 'rogue', kind: 'active', actionType: 'special', recharge: 'short',
      uses: { kind: 'fixed', value: 1 } }),

  // ── Sorcerer ───────────────────────────────────────────────────────────────────
  F({ name: 'Sorcery Points', class: 'sorcerer', kind: 'active', actionType: 'special', recharge: 'long',
      uses: { kind: 'level', thresholds: [{ min: 2, value: 2 }] } }),  // = sorcerer level (≥2); see note
  F({ name: 'Font of Magic', class: 'sorcerer', kind: 'passive' }),

  // ── Artificer ──────────────────────────────────────────────────────────────────
  F({ name: 'Flash of Genius', class: 'artificer', kind: 'active', actionType: 'reaction', recharge: 'long',
      uses: { kind: 'abilityMod', ability: 'int', min: 1 } }),
  F({ name: 'Magic Item Adept', class: 'artificer', kind: 'passive' }),
]

// Features whose true `uses` equals the class level itself (can't be expressed as
// simple thresholds). The importer resolves these against char.level directly.
const USES_EQUAL_LEVEL = new Set(['ki', 'sorcery points'])

// ── Lookup ──────────────────────────────────────────────────────────────────

export function lookupFeatureMeta(name: string, className?: string): FeatureMeta | null {
  const n = name.trim().toLowerCase()
  const c = className?.trim().toLowerCase()
  // Prefer an exact (name, class) match, then fall back to name-only.
  const byBoth = FEATURE_META.find(m => m.name.toLowerCase() === n && (!c || m.class === c))
  if (byBoth) return byBoth
  return FEATURE_META.find(m => m.name.toLowerCase() === n) ?? null
}

// ── Build a sheet entry from metadata ─────────────────────────────────────────

export interface BuiltFeature {
  active?: ActiveFeature
  passive?: PassiveTrait
}

/**
 * Turn a feature (by name) into a ready-to-add sheet entry, resolving uses against
 * the character. `description` is the flattened text you already pull from 5etools.
 * Returns null if the feature isn't in the table (caller can fall back to a plain
 * passive trait or an LLM call for homebrew).
 */
export function buildFeatureForCharacter(
  name: string,
  description: string,
  char: Character,
  className?: string,
): BuiltFeature | null {
  const meta = lookupFeatureMeta(name, className)
  if (!meta) return null

  if (meta.kind === 'passive') {
    return { passive: { id: uuid(), name: meta.name, description } }
  }

  let maxUses = resolveUses(meta.uses, char)
  if (USES_EQUAL_LEVEL.has(meta.name.toLowerCase())) maxUses = char.level

  return {
    active: {
      id: uuid(),
      name: meta.name,
      actionType: meta.actionType ?? 'special',
      maxUses,
      usesLeft: maxUses,
      recharge: meta.recharge ?? 'long',
      description,
    },
  }
}
