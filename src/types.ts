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
  concentration: boolean
  source?: string // 5etools source book code, e.g. "PHB", "XGE", "XPHB"
}

export interface Currency {
  cp: number
  sp: number
  ep: number
  gp: number
  pp: number
}

// Weapon-specific properties used to derive attack rolls
export type WeaponProperty =
  | 'finesse'
  | 'ranged'
  | 'thrown'
  | 'versatile'
  | 'two-handed'
  | 'light'
  | 'heavy'
  | 'reach'
  | 'loading'
  | 'ammunition'

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  weight: number
  category: 'weapon' | 'armor' | 'gear' | 'misc'
  equipped: boolean
  notes: string
  description?: string
  // weapon-only
  damageDice?: string
  versatileDice?: string
  damageType?: string
  properties?: WeaponProperty[]
  proficient?: boolean
  // armor-only
  armorClass?: number
  source?: string
}

export interface PassiveTrait {
  id: string
  name: string
  description: string
}

export type ActionType = 'action' | 'bonus' | 'reaction' | 'special'
export type RechargeType = 'atwill' | 'short' | 'long' | 'dawn'

export interface ActiveFeature {
  id: string
  name: string
  actionType: ActionType
  maxUses: number      // 0 = at will
  usesLeft: number
  recharge: RechargeType
  description: string
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
  equipment: string // freeform misc notes
  inventory: InventoryItem[]
  currency: Currency

  // Conditions
  conditions: string[] // active condition names
  exhaustion: number // 0-6

  // Features, traits, notes
  activeFeatures: ActiveFeature[]
  passiveTraits: PassiveTrait[]
  features: string        // legacy — migrated on load
  backgroundFlavour: string
  personalityTraits: string
  ideals: string
  bonds: string
  flaws: string
  backstory: string
  characterGrowth: string
  notes: string

  // Inspiration
  inspiration: boolean
  portrait?: string   // data URL or https URL
}
