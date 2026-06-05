export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface NoteNode {
  id: string
  title: string
  content: string
  children: NoteNode[]
}

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

// ── Maps ─────────────────────────────────────────────────────────────────────

export type AnnotationType = 'path' | 'pin' | 'text'

export interface MapAnnotation {
  id: string
  type: AnnotationType
  x: number   // normalized 0-1 (image-relative)
  y: number
  // path
  points?: Array<{ x: number; y: number }>
  strokeColor?: string
  strokeWidth?: number  // image-space pixels
  // pin
  label?: string
  pinColor?: string
  // text
  text?: string
  textColor?: string
  fontSize?: number     // image-space pixels
}

export interface MapEntry {
  id: string
  name: string
  // Image stored separately in localStorage as dnd5e_map_img_<id>
  annotations: MapAnnotation[]
}

export type ChangeCategory = 'combat' | 'inventory' | 'magic' | 'progression' | 'note'

export interface ChangelogEntry {
  id: string
  timestamp: number   // Date.now()
  category: ChangeCategory
  summary: string
  detail?: string
}

export type ProficiencyCategory = 'armor' | 'weapon' | 'tool' | 'other'

export interface ProficiencyEntry {
  id: string
  name: string
  category: ProficiencyCategory
}

export interface LanguageEntry {
  id: string
  name: string
  notes: string  // e.g. "read only", "telepathic"
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
  maxHitDice: string

  // Death saves
  deathSaveSuccesses: number
  deathSaveFailures: number

  // Skills — which ones are proficient/expertise
  skills: Record<string, SkillEntry>

  // Saving throw proficiencies
  savingThrows: Record<AbilityKey, boolean>

  // Proficiencies & languages
  proficiencies: string        // legacy — migrated on load
  proficiencyList: ProficiencyEntry[]
  languages: LanguageEntry[]

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
  notes: string            // legacy — migrated on load
  noteTree: NoteNode[]

  // Maps
  maps: MapEntry[]

  // Chronicle / changelog
  changelog: ChangelogEntry[]

  // Inspiration
  inspiration: boolean
  portrait?: string   // data URL or https URL

  // Appearance override — null means auto from class theme
  appearanceOverride?: {
    hue: number; chroma: number; accent: string
    bgHex?: string
    bgGradient?: string   // CSS gradient string (preset)
    bgBlur?: number       // px, 0-20
    bgOverlay?: number    // 0-1 darkness overlay opacity
    glyph?: string        // custom icon emoji; null/undefined = auto from class theme
  } | null
}
