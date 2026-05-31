export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface SkillEntry {
  proficient: boolean
  expertise: boolean
}

export interface SpellSlots {
  [level: number]: { max: number; used: number }
}

export interface Spell {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  description: string
  prepared: boolean
}

export interface AttackEntry {
  id: string
  name: string
  attackBonus: string
  damageRoll: string
  damageType: string
  notes: string
}

export interface Character {
  // Identity
  name: string
  class: string
  subclass: string
  level: number
  race: string
  background: string
  alignment: string
  xp: number

  // Ability scores
  abilities: AbilityScores

  // Combat
  maxHp: number
  currentHp: number
  tempHp: number
  ac: number
  speed: number
  initiative: number // manual override; auto from dex otherwise
  hitDice: string

  // Death saves
  deathSaveSuccesses: number
  deathSaveFailures: number

  // Skills — which ones are proficient/expertise
  skills: Record<string, SkillEntry>

  // Saving throw proficiencies
  savingThrows: Record<AbilityKey, boolean>

  // Proficiencies & languages
  proficiencies: string

  // Attacks
  attacks: AttackEntry[]

  // Spell info
  spellcastingAbility: AbilityKey | ''
  spellSlots: SpellSlots
  spells: Spell[]

  // Equipment / inventory
  equipment: string

  // Features, traits, notes
  features: string
  personalityTraits: string
  ideals: string
  bonds: string
  flaws: string
  notes: string

  // Inspiration
  inspiration: boolean
}
