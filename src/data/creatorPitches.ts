// Authored, new-player-friendly blurbs for the 2014 (PHB) character creator.
// 5etools supplies the rules text; these supply the "what is this, and is it for
// me?" framing a first-time player needs before reading the rules.

import type { AbilityKey } from '../types'

export type Complexity = 'Simple' | 'Moderate' | 'Complex'

export const ABILITY_INFO: Record<AbilityKey, { name: string; blurb: string }> = {
  str: { name: 'Strength',     blurb: 'Physical power: heavy weapons, lifting, climbing, Athletics.' },
  dex: { name: 'Dexterity',    blurb: 'Agility and reflexes: armor class, initiative, bows and finesse weapons, Stealth.' },
  con: { name: 'Constitution', blurb: 'Toughness: your hit points and holding concentration on spells.' },
  int: { name: 'Intelligence', blurb: 'Reasoning and memory: Wizard magic, Arcana, Investigation, History.' },
  wis: { name: 'Wisdom',       blurb: 'Awareness and intuition: Cleric, Druid and Ranger magic, Perception, Insight.' },
  cha: { name: 'Charisma',     blurb: 'Force of personality: Bard, Paladin, Sorcerer and Warlock magic, Persuasion, Deception.' },
}

export const RACE_PITCH: Record<string, { tagline: string; goodFor?: string }> = {
  Dragonborn: {
    tagline: 'Proud, dragon-blooded people who can breathe fire, frost or lightning depending on their ancestry.',
    goodFor: 'Paladin, Sorcerer, Fighter',
  },
  Dwarf: {
    tagline: 'Tough, stubborn and hard to kill. Hill Dwarves are extra hardy; Mountain Dwarves can wear armor and hit harder.',
    goodFor: 'Fighter, Cleric, Barbarian',
  },
  Elf: {
    tagline: 'Graceful, long-lived and sharp-eyed. High Elves dabble in magic, Wood Elves are fast and stealthy, Drow come from the dark below.',
    goodFor: 'Rogue, Ranger, Wizard',
  },
  Gnome: {
    tagline: 'Small, curious and clever, with a knack for resisting magic. Rock Gnomes tinker with gadgets; Forest Gnomes talk to small animals.',
    goodFor: 'Wizard, Rogue, Warlock',
  },
  'Half-Elf': {
    tagline: 'Charming and adaptable, with a foot in two worlds. Extra skills and flexible ability bonuses make them good at nearly anything.',
    goodFor: 'Bard, Warlock, Sorcerer, Paladin',
  },
  'Half-Orc': {
    tagline: 'Fierce and enduring. Once a day you drop to 1 HP instead of 0, and your critical hits hit even harder.',
    goodFor: 'Barbarian, Fighter, Paladin',
  },
  Halfling: {
    tagline: 'Small, cheerful and lucky: reroll any natural 1. Lightfoots hide behind bigger folk; Stouts shrug off poison.',
    goodFor: 'Rogue, Bard, Ranger',
  },
  Human: {
    tagline: 'Ambitious and adaptable. Standard Humans get +1 to every ability; Variant Humans trade that for a skill and a feat (a special talent).',
    goodFor: 'Any class',
  },
  Tiefling: {
    tagline: 'Touched by a fiendish bloodline. You resist fire, know a few spells innately, and attract suspicious looks.',
    goodFor: 'Warlock, Sorcerer, Bard',
  },
  // ── Volo's Guide / Monsters of the Multiverse / Tasha's ──
  Aarakocra:   { tagline: 'Bird-folk who can fly from level 1. Amazing mobility, but fragile in tight spaces.', goodFor: 'Ranger, Monk, Rogue' },
  Aasimar:     { tagline: 'Mortals touched by the heavens: they heal with a touch and can unleash radiant celestial power.', goodFor: 'Paladin, Cleric, Warlock' },
  Bugbear:     { tagline: 'Big, sneaky goblinoids with long arms that hit from further away and ambush the unwary.', goodFor: 'Rogue, Fighter, Barbarian' },
  Centaur:     { tagline: 'Half-human, half-horse. Fast, strong, and can charge into enemies.', goodFor: 'Fighter, Ranger, Paladin' },
  Changeling:  { tagline: 'Shapeshifters who can change their face and voice at will. Perfect for spies and tricksters.', goodFor: 'Bard, Rogue, Warlock' },
  'Custom Lineage': { tagline: 'Build your own: +2 to any ability, a free feat, and darkvision or an extra skill. Ask your DM for the story.', goodFor: 'Any class' },
  'Deep Gnome': { tagline: 'Stealthy gnomes from the Underdark who can turn invisible and resist magic.', goodFor: 'Rogue, Wizard, Ranger' },
  Duergar:     { tagline: 'Grim gray dwarves of the Underdark who can grow large or turn invisible.', goodFor: 'Fighter, Cleric, Warlock' },
  Eladrin:     { tagline: 'Elves of the Feywild whose mood shifts with the seasons, and who can teleport short distances.', goodFor: 'Any class' },
  Fairy:       { tagline: 'Tiny fey with butterfly wings. You can fly from level 1 and cast a little innate magic.', goodFor: 'Druid, Bard, Warlock' },
  Firbolg:     { tagline: 'Gentle forest giants who talk to plants and animals and can briefly turn invisible.', goodFor: 'Druid, Cleric, Ranger' },
  Genasi:      { tagline: 'People with elemental blood: air, earth, fire or water, each with its own powers.', goodFor: 'Sorcerer, Wizard, Fighter' },
  Githyanki:   { tagline: 'Astral warriors trained with armor and greatswords, with a touch of psionic magic.', goodFor: 'Fighter, Paladin, Wizard' },
  Githzerai:   { tagline: 'Disciplined monks of pure mind who resist charm and fear.', goodFor: 'Monk, Wizard, Cleric' },
  Goblin:      { tagline: 'Small, quick and scrappy. You can dash or hide as a bonus action and hit bigger foes harder.', goodFor: 'Rogue, Ranger, Monk' },
  Goliath:     { tagline: 'Towering mountain folk who shrug off big hits and laugh at the cold.', goodFor: 'Barbarian, Fighter, Paladin' },
  Harengon:    { tagline: 'Rabbit-folk with lightning reflexes and a magical hop.', goodFor: 'Rogue, Monk, Ranger' },
  Hobgoblin:   { tagline: 'Disciplined goblinoids who fight best together and can turn a failed roll around.', goodFor: 'Fighter, Wizard, Paladin' },
  Kenku:       { tagline: 'Raven-like folk who mimic sounds perfectly and are expert at skills.', goodFor: 'Rogue, Ranger, Monk' },
  Kobold:      { tagline: 'Small dragon-kin who are clever in a pack and carry a draconic legacy.', goodFor: 'Rogue, Sorcerer, Ranger' },
  Lizardfolk:  { tagline: 'Cold, practical reptiles with natural armor, a hungry bite and a knack for surviving.', goodFor: 'Druid, Ranger, Barbarian' },
  Minotaur:    { tagline: 'Bull-headed warriors who gore and shove their way through a fight.', goodFor: 'Barbarian, Fighter, Paladin' },
  Orc:         { tagline: 'Powerful and relentless: you can dash toward enemies and refuse to go down.', goodFor: 'Barbarian, Fighter' },
  Satyr:       { tagline: 'Goat-legged fey revellers who resist magic and are born performers.', goodFor: 'Bard, Warlock, Rogue' },
  'Sea Elf':   { tagline: 'Elves of the oceans who swim fast, breathe water and talk to sea creatures.', goodFor: 'Ranger, Druid, Fighter' },
  'Shadar-Kai': { tagline: 'Elves from the Shadowfell who teleport through gloom and resist necrotic damage.', goodFor: 'Rogue, Warlock, Fighter' },
  Shifter:     { tagline: 'Descendants of lycanthropes who briefly take on beastly traits in a fight.', goodFor: 'Barbarian, Ranger, Druid' },
  Tabaxi:      { tagline: 'Curious cat-folk with claws and bursts of incredible speed.', goodFor: 'Rogue, Monk, Ranger' },
  Tortle:      { tagline: 'Turtle-folk with a natural shell for armor and a calm, wandering spirit.', goodFor: 'Druid, Monk, Fighter' },
  Triton:      { tagline: 'Proud guardians of the deep seas who command water and talk to sea creatures.', goodFor: 'Paladin, Fighter, Sorcerer' },
  'Yuan-Ti':   { tagline: 'Snake-blooded people who shrug off magic and poison.', goodFor: 'Warlock, Sorcerer, Rogue' },
  'Yuan-ti Pureblood': { tagline: 'Snake-blooded people who shrug off magic and poison.', goodFor: 'Warlock, Sorcerer, Rogue' },
}

export const CLASS_PITCH: Record<string, {
  tagline: string
  playstyle: string
  complexity: Complexity
  keyAbilities: string      // human-readable, e.g. "STR or DEX, then CON"
  priority: AbilityKey[]    // order for "suggest scores" with the standard array
}> = {
  Barbarian: {
    tagline: 'A primal warrior who rages to shrug off damage and hit harder.',
    playstyle: 'Charge in, rage, hit things. The most hit points in the game and very forgiving to play.',
    complexity: 'Simple', keyAbilities: 'STR, then CON', priority: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  },
  Bard: {
    tagline: 'An inspiring performer whose music and words carry real magic.',
    playstyle: 'Support your friends, talk your way past problems, and cast a flexible mix of spells.',
    complexity: 'Moderate', keyAbilities: 'CHA, then DEX', priority: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
  },
  Cleric: {
    tagline: 'A divine spellcaster who heals, protects and smites in a god’s name.',
    playstyle: 'The party’s healer and protector. You pick a divine domain at level 1 that shapes your powers.',
    complexity: 'Moderate', keyAbilities: 'WIS, then CON or STR', priority: ['wis', 'con', 'str', 'dex', 'cha', 'int'],
  },
  Druid: {
    tagline: 'A nature priest who casts primal magic and transforms into animals.',
    playstyle: 'Huge spell list plus Wild Shape. Rewarding, but there is a lot to track.',
    complexity: 'Complex', keyAbilities: 'WIS, then CON', priority: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
  },
  Fighter: {
    tagline: 'A master of weapons and armor: simple to play, hard to kill.',
    playstyle: 'Hit hard and often, wear the best armor, and get extra actions when it counts. A great first class.',
    complexity: 'Simple', keyAbilities: 'STR or DEX, then CON', priority: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  },
  Monk: {
    tagline: 'A martial artist who channels ki into lightning-fast strikes.',
    playstyle: 'Fast, mobile and acrobatic. You fight unarmed and spend ki points on special moves.',
    complexity: 'Moderate', keyAbilities: 'DEX and WIS', priority: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  },
  Paladin: {
    tagline: 'A holy knight bound by a sacred oath.',
    playstyle: 'Heavy armor, healing hands and devastating smites. Front-line hero with a code to live by.',
    complexity: 'Moderate', keyAbilities: 'STR and CHA, then CON', priority: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
  },
  Ranger: {
    tagline: 'A wilderness hunter and tracker, deadly with bow or blade.',
    playstyle: 'Scout ahead, track your prey and strike from range, with a little nature magic from level 2.',
    complexity: 'Moderate', keyAbilities: 'DEX and WIS', priority: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  },
  Rogue: {
    tagline: 'A sneaky expert who strikes where it hurts and excels at skills.',
    playstyle: 'Sneak, pick locks, disarm traps, and land one big Sneak Attack per turn. Easy to pick up.',
    complexity: 'Simple', keyAbilities: 'DEX, then CON or CHA', priority: ['dex', 'con', 'cha', 'wis', 'int', 'str'],
  },
  Sorcerer: {
    tagline: 'Born with innate magic they can bend and twist at will.',
    playstyle: 'Fewer spells than a Wizard, but you reshape them with Metamagic. Your origin is picked at level 1.',
    complexity: 'Moderate', keyAbilities: 'CHA, then CON', priority: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  },
  Warlock: {
    tagline: 'Gains magic through a pact with a powerful otherworldly patron.',
    playstyle: 'Few spell slots, but they return on a short rest. Eldritch Blast is your go-to attack. Patron picked at level 1.',
    complexity: 'Moderate', keyAbilities: 'CHA, then CON', priority: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  },
  Wizard: {
    tagline: 'A scholar who learns the widest range of spells from a spellbook.',
    playstyle: 'The most versatile spellcaster, but fragile. Lots of choices to make before and during play.',
    complexity: 'Complex', keyAbilities: 'INT, then CON or DEX', priority: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
  },
}

export const BACKGROUND_PITCH: Record<string, string> = {
  Acolyte:         'You served in a temple and know religious rites; the faithful will shelter you.',
  Charlatan:       'A con artist with a false identity and a talent for lies.',
  Criminal:        'You’ve broken the law and still have contacts in the underworld.',
  Entertainer:     'A performer who can always find a stage — and a free meal.',
  'Folk Hero':     'A commoner who stood up to tyranny; ordinary folk will hide and help you.',
  'Guild Artisan': 'A skilled crafter backed by a powerful trade guild.',
  Hermit:          'You lived in seclusion and stumbled onto a great secret.',
  Noble:           'Born to wealth and privilege; high society takes you seriously.',
  Outlander:       'Raised in the wilds; you never get lost and can always find food.',
  Sage:            'A scholar who knows where (and whom) to ask for lost knowledge.',
  Sailor:          'A seasoned deckhand who can get free passage on ships.',
  Soldier:         'A trained soldier whose old rank still commands respect.',
  Urchin:          'Grew up poor on the streets and knows every secret shortcut in the city.',
}

/** Level-1 choices the wizard doesn't handle yet (phase 2), shown as a to-do on Review. */
export const CLASS_LEVEL1_TODO: Record<string, string[]> = {
  Bard:     ['Pick 2 cantrips and 4 level-1 spells in the Spells tab.'],
  Cleric:   ['Choose your Divine Domain (your subclass) in the Subclass field.', 'Pick 3 cantrips and prepare your level-1 spells in the Spells tab.'],
  Druid:    ['Pick 2 cantrips and prepare your level-1 spells in the Spells tab.'],
  Fighter:  ['Choose a Fighting Style and add it as a trait.'],
  Ranger:   ['Choose your Favored Enemy and Natural Explorer terrain.'],
  Rogue:    ['Choose Expertise: two of your skill proficiencies (or one skill plus thieves’ tools).'],
  Sorcerer: ['Choose your Sorcerous Origin (your subclass) in the Subclass field.', 'Pick 4 cantrips and 2 level-1 spells in the Spells tab.'],
  Warlock:  ['Choose your Otherworldly Patron (your subclass) in the Subclass field.', 'Pick 2 cantrips and 2 level-1 spells in the Spells tab.'],
  Wizard:   ['Pick 3 cantrips and 6 level-1 spells for your spellbook in the Spells tab.'],
}

export const COMPLEXITY_STYLE: Record<Complexity, string> = {
  Simple:   'bg-green-900/40 text-green-300 border-green-700/40',
  Moderate: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  Complex:  'bg-red-900/40 text-red-300 border-red-700/40',
}
