import type { Character } from './types'
import { defaultSkills, defaultSavingThrows } from './utils'

export function makeDefaultCharacter(): Character {
  return {
    name: '',
    class: '',
    subclass: '',
    level: 1,
    race: '',
    background: '',
    alignment: '',
    xp: 0,

    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },

    maxHp: 0,
    currentHp: 0,
    tempHp: 0,
    ac: 10,
    speed: 30,
    initiative: 0,
    hitDice: '1d8',
    maxHitDice: '1d8',

    deathSaveSuccesses: 0,
    deathSaveFailures: 0,

    skills: defaultSkills(),
    savingThrows: defaultSavingThrows(),

    proficiencies: '',

    attacks: [],

    spellcastingAbility: '',
    spellSlots: {
      1: { max: 0, used: 0 },
      2: { max: 0, used: 0 },
      3: { max: 0, used: 0 },
      4: { max: 0, used: 0 },
      5: { max: 0, used: 0 },
      6: { max: 0, used: 0 },
      7: { max: 0, used: 0 },
      8: { max: 0, used: 0 },
      9: { max: 0, used: 0 },
    },
    spells: [],

    equipment: '',
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    conditions: [],
    exhaustion: 0,
    activeFeatures: [],
    passiveTraits: [],
    features: '',
    backgroundFlavour: '',
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    backstory: '',
    characterGrowth: '',
    notes: '',
    inspiration: false,
  }
}
