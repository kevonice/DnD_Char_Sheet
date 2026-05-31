import type { AbilityScores, AbilityKey, Character, SkillEntry, InventoryItem } from './types'

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
