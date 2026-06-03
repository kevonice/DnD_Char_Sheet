import type { AbilityScores, AbilityKey, Character, SkillEntry, InventoryItem, ActiveFeature } from './types'

export function modifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function modStr(score: number): string {
  const m = modifier(score)
  return m >= 0 ? `+${m}` : `${m}`
}

export function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

// Maps each skill to its governing ability
export const SKILL_ABILITIES: Record<string, AbilityKey> = {
  Acrobatics: 'dex',
  'Animal Handling': 'wis',
  Arcana: 'int',
  Athletics: 'str',
  Deception: 'cha',
  History: 'int',
  Insight: 'wis',
  Intimidation: 'cha',
  Investigation: 'int',
  Medicine: 'wis',
  Nature: 'int',
  Perception: 'wis',
  Performance: 'cha',
  Persuasion: 'cha',
  Religion: 'int',
  'Sleight of Hand': 'dex',
  Stealth: 'dex',
  Survival: 'wis',
}

export const ALL_SKILLS = Object.keys(SKILL_ABILITIES)

export function skillBonus(
  skillName: string,
  abilities: AbilityScores,
  skillEntry: SkillEntry,
  level: number
): number {
  const ability = SKILL_ABILITIES[skillName]
  const base = modifier(abilities[ability])
  const pb = proficiencyBonus(level)
  if (skillEntry.expertise) return base + pb * 2
  if (skillEntry.proficient) return base + pb
  return base
}

export function skillBonusStr(
  skillName: string,
  abilities: AbilityScores,
  skillEntry: SkillEntry,
  level: number
): string {
  const b = skillBonus(skillName, abilities, skillEntry, level)
  return b >= 0 ? `+${b}` : `${b}`
}

export function saveBonus(
  ability: AbilityKey,
  abilities: AbilityScores,
  proficient: boolean,
  level: number
): string {
  const base = modifier(abilities[ability])
  const pb = proficiencyBonus(level)
  const total = base + (proficient ? pb : 0)
  return total >= 0 ? `+${total}` : `${total}`
}

export function spellAttackBonus(char: Character): string {
  if (!char.spellcastingAbility) return '—'
  const base = modifier(char.abilities[char.spellcastingAbility])
  const pb = proficiencyBonus(char.level)
  const total = base + pb
  return total >= 0 ? `+${total}` : `${total}`
}

export function spellSaveDC(char: Character): number | string {
  if (!char.spellcastingAbility) return '—'
  const base = modifier(char.abilities[char.spellcastingAbility])
  return 8 + base + proficiencyBonus(char.level)
}

export function defaultSkills(): Record<string, SkillEntry> {
  const out: Record<string, SkillEntry> = {}
  for (const s of ALL_SKILLS) {
    out[s] = { proficient: false, expertise: false }
  }
  return out
}

export function defaultSavingThrows(): Record<AbilityKey, boolean> {
  return { str: false, dex: false, con: false, int: false, wis: false, cha: false }
}

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

export const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function passivePerception(
  abilities: AbilityScores,
  perceptionEntry: SkillEntry,
  level: number
): number {
  return 10 + skillBonus('Perception', abilities, perceptionEntry, level)
}

// ---------------------------------------------------------------------------
// Rest helpers
// ---------------------------------------------------------------------------

function restoreFeatures(features: ActiveFeature[], types: ActiveFeature['recharge'][]): ActiveFeature[] {
  return features.map(f =>
    types.includes(f.recharge) ? { ...f, usesLeft: f.maxUses } : f
  )
}

export function takeShortRest(char: Character): Partial<Character> {
  return {
    activeFeatures: restoreFeatures(char.activeFeatures ?? [], ['short']),
  }
}

export function takeLongRest(char: Character): Partial<Character> {
  // Restore all spell slots
  const spellSlots = Object.fromEntries(
    Object.entries(char.spellSlots).map(([lvl, slot]) => [lvl, { ...slot, used: 0 }])
  ) as Character['spellSlots']

  return {
    currentHp: char.maxHp,
    tempHp: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    spellSlots,
    activeFeatures: restoreFeatures(char.activeFeatures ?? [], ['short', 'long']),
  }
}

export const CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
]

export const CONDITION_DESC: Record<string, string[]> = {
  Blinded: [
    'Automatically fails any ability check requiring sight.',
    'Attack rolls against you have advantage; your attack rolls have disadvantage.',
  ],
  Charmed: [
    'Cannot attack the charmer or target them with harmful abilities or effects.',
    'The charmer has advantage on social ability checks against you.',
  ],
  Deafened: [
    'Cannot hear.',
    'Automatically fails any ability check requiring hearing.',
  ],
  Frightened: [
    'Disadvantage on ability checks and attack rolls while the source of fear is within line of sight.',
    'Cannot willingly move closer to the source of fear.',
  ],
  Grappled: [
    'Speed becomes 0 and cannot benefit from any bonus to speed.',
    'Ends if the grappler is incapacitated, or if you are moved outside the grappler\'s reach.',
  ],
  Incapacitated: [
    'Cannot take actions or reactions.',
  ],
  Invisible: [
    'Cannot be seen without magic or a special sense.',
    'Considered heavily obscured for hiding.',
    'Attack rolls against you have disadvantage; your attack rolls have advantage.',
  ],
  Paralyzed: [
    'Incapacitated and cannot move or speak.',
    'Automatically fails Strength and Dexterity saving throws.',
    'Attack rolls against you have advantage. Any attack that hits from within 5 ft is a critical hit.',
  ],
  Petrified: [
    'Transformed into solid inanimate matter. Incapacitated, cannot move or speak.',
    'Attack rolls against you have advantage.',
    'Automatically fails Strength and Dexterity saving throws.',
    'Resistance to all damage. Immune to poison and disease (existing effects suspended).',
  ],
  Poisoned: [
    'Disadvantage on attack rolls and ability checks.',
  ],
  Prone: [
    'Only movement option is to crawl, unless you stand up (costs half movement).',
    'Disadvantage on attack rolls.',
    'Melee attack rolls against you have advantage; ranged attack rolls have disadvantage.',
  ],
  Restrained: [
    'Speed becomes 0 and cannot benefit from any bonus to speed.',
    'Attack rolls against you have advantage; your attack rolls have disadvantage.',
    'Disadvantage on Dexterity saving throws.',
  ],
  Stunned: [
    'Incapacitated, cannot move, can speak only falteringly.',
    'Automatically fails Strength and Dexterity saving throws.',
    'Attack rolls against you have advantage.',
  ],
  Unconscious: [
    'Incapacitated, cannot move or speak, unaware of surroundings. Drops held items. Falls prone.',
    'Automatically fails Strength and Dexterity saving throws.',
    'Attack rolls against you have advantage. Any attack that hits from within 5 ft is a critical hit.',
  ],
}

// Derive an attack line from an equipped weapon
export interface DerivedAttack {
  id: string
  name: string
  attackBonus: string
  damageRoll: string
}

export function weaponAttack(item: InventoryItem, char: Character): DerivedAttack {
  const props = item.properties ?? []
  const strMod = modifier(char.abilities.str)
  const dexMod = modifier(char.abilities.dex)

  // Choose ability: ranged uses DEX, finesse uses the better of STR/DEX, else STR
  let abilityMod: number
  if (props.includes('ranged')) {
    abilityMod = dexMod
  } else if (props.includes('finesse')) {
    abilityMod = Math.max(strMod, dexMod)
  } else {
    abilityMod = strMod
  }

  const pb = item.proficient ? proficiencyBonus(char.level) : 0
  const totalBonus = abilityMod + pb
  const bonusStr = totalBonus >= 0 ? `+${totalBonus}` : `${totalBonus}`

  const dice = item.damageDice ?? ''
  const dmgModStr = abilityMod === 0 ? '' : abilityMod > 0 ? `+${abilityMod}` : `${abilityMod}`
  const damageType = item.damageType ? ` ${item.damageType}` : ''
  const versatile = item.versatileDice
    ? ` (${item.versatileDice}${dmgModStr} two-handed)`
    : ''
  const damageRoll = `${dice}${dmgModStr}${damageType}${versatile}`

  return {
    id: item.id,
    name: item.name,
    attackBonus: bonusStr,
    damageRoll,
  }
}
