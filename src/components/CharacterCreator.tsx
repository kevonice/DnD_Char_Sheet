import { useCallback, useEffect, useState } from 'react'
import type { AbilityScores, Character, ClassOptionPick, PassiveTrait, Spell } from '../types'
import { ABILITY_KEYS, ALL_SKILLS } from '../utils'
import { v4 as uuid } from '../uuid'
import {
  canFlexBonuses, emptyGrants, fetchBackgrounds2014, fetchClasses2014, fetchRaces2014, resolveRace,
  type BackgroundOption,
} from '../data/creator2014'
import {
  abilityChoicesComplete, addReplacementChoices, buildCharacter, choiceRemaining, finalizeCharacter, grantedNames,
  proficiencyChoicesComplete, racialBonus, sanitizePicks,
  type BuildInput, type Personality, type Picks,
} from '../data/creatorBuild'
import { CLASS_LEVEL1_TODO, CLASS_PITCH } from '../data/creatorPitches'
import {
  casterInfo, fetchClassLevelData, hpBonusPerLevel, unarmoredAC, fetchClassSpellOptions, hitPointsAt, racialSpells, spellsByName, subclassPreparedNames,
  type ClassLevelData, type SpellOption,
} from '../data/creatorLevels'
import {
  asiBonus, asiComplete, checkPrereq, emptyAsi, expertiseAllowsThievesTools, expertiseCountAt, fetchFeats,
  fetchOptionalFeatures, optionSlotsAt, rangerSlotsAt, subclassGrants,
  type AsiChoice, type FeatOption, type OptionalFeature, type OptionSlot, type PrereqContext,
} from '../data/classOptions'
import { AsiPicker, ExpertisePicker, OptionPicker } from './creator/ChoicePickers'
import { ChoicePicker } from './creator/ProficiencyStep'
import LevelsStep from './creator/LevelsStep'
import SpellStep, { type SpellPicks } from './creator/SpellStep'
import { FLOW, StepCard, WizardShell, type FlowStep } from './creator/ui'
import { baseComplete, baseScores, finalScores, initialAbilityState, type AbilityState } from './creator/abilityMath'
import RaceStep from './creator/RaceStep'
import ClassStep from './creator/ClassStep'
import BackgroundStep from './creator/BackgroundStep'
import AbilityStep from './creator/AbilityStep'
import ProficiencyStep from './creator/ProficiencyStep'
import PersonalityStep from './creator/PersonalityStep'
import ReviewStep from './creator/ReviewStep'

interface Props {
  onComplete: (char: Partial<Character>) => void
  onManual:   () => void
  onImport:   (char: Partial<Character>) => void
}

type Mode = 'list' | 'custom'

function useLoader<T>(fetcher: () => Promise<T[]>, active: boolean) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcher()
      .then(setData)
      .catch(e => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [fetcher])
  useEffect(() => {
    if (active && data.length === 0 && !loading && !error) load()
  }, [active, data.length, loading, error, load])
  return { data, loading, error, retry: load }
}

/** Personality entries that came from the old background's tables no longer fit a new one. */
function clearTableEntries(p: Personality, old: BackgroundOption | null): Personality {
  if (!old) return p
  const t = old.tables
  const keep = (v: string, opts: string[]) => v.split('\n').filter(l => l && !opts.includes(l)).join('\n')
  return { traits: keep(p.traits, t.traits), ideal: keep(p.ideal, t.ideals), bond: keep(p.bond, t.bonds), flaw: keep(p.flaw, t.flaws) }
}

export default function CharacterCreator({ onComplete, onManual, onImport }: Props) {
  const [step, setStep] = useState<FlowStep | 'landing'>('landing')
  const [maxReached, setMaxReached] = useState(0)
  const [name, setName] = useState('')

  const [raceMode, setRaceMode] = useState<Mode>('list')
  const [raceName, setRaceName] = useState<string | null>(null)
  const [subShort, setSubShort] = useState<string | null>(null)
  const [customRace, setCustomRace] = useState('')
  const [flexible, setFlexible] = useState(false)

  const [classMode, setClassMode] = useState<Mode>('list')
  const [className, setClassName] = useState<string | null>(null)
  const [customClass, setCustomClass] = useState('')
  const [customHitDie, setCustomHitDie] = useState(8)

  const [bgMode, setBgMode] = useState<Mode>('list')
  const [bgName, setBgName] = useState<string | null>(null)
  const [customBg, setCustomBg] = useState('')

  const [ability, setAbility] = useState<AbilityState>(initialAbilityState)
  const [picks, setPicks] = useState<Picks>({})
  const [personality, setPersonality] = useState<Personality>({ traits: '', ideal: '', bond: '', flaw: '' })
  const [alignment, setAlignment] = useState('')
  const [creating, setCreating] = useState(false)

  const [startLevel, setStartLevel] = useState(1)
  const [subclassName, setSubclassName] = useState<string | null>(null)
  const [customSubclass, setCustomSubclass] = useState('')
  const [hpMethod, setHpMethod] = useState<'average' | 'roll'>('average')
  const [hpRolls, setHpRolls] = useState<Array<number | null>>([])
  const [spellPicks, setSpellPicks] = useState<SpellPicks>({ cantrips: [], spells: [], racial: [] })
  const [levelData, setLevelData] = useState<ClassLevelData | null>(null)
  const [spellOptions, setSpellOptions] = useState<SpellOption[] | null>(null)
  const [racialOptions, setRacialOptions] = useState<SpellOption[] | null>(null)
  const [spellError, setSpellError] = useState<string | null>(null)
  const [asiChoices, setAsiChoices] = useState<Record<number, AsiChoice>>({})
  const [raceFeat, setRaceFeat] = useState<AsiChoice>(emptyAsi('feat'))
  const [optionPicks, setOptionPicks] = useState<Record<string, string[]>>({})
  const [expertisePicks, setExpertisePicks] = useState<string[]>([])
  const [feats, setFeats] = useState<FeatOption[] | null>(null)
  const [optFeatures, setOptFeatures] = useState<OptionalFeature[] | null>(null)

  const active = step !== 'landing'
  const races = useLoader(fetchRaces2014, active)
  const classes = useLoader(fetchClasses2014, active)
  const backgrounds = useLoader(fetchBackgrounds2014, active)

  // ── Derived selections ────────────────────────────────────────────────────
  const race = raceMode === 'list' ? races.data.find(r => r.key === raceName) ?? null : null
  const sub = race?.subraces.find(s => s.short === subShort) ?? null
  const resolvedRace = race && (race.subraces.length === 0 || sub) ? resolveRace(race, sub, flexible) : null
  const cls = classMode === 'list' ? classes.data.find(c => c.name === className) ?? null : null
  const bg = bgMode === 'list' ? backgrounds.data.find(b => b.name === bgName) ?? null : null

  const raceLabel = resolvedRace?.label ?? (raceMode === 'custom' ? customRace.trim() : '')
  const classLabel = cls?.name ?? (classMode === 'custom' ? customClass.trim() : '')
  const bgLabel = bg?.name ?? (bgMode === 'custom' ? customBg.trim() : '')

  const subObj = levelData?.subclasses.find(x => x.name === subclassName) ?? null
  const subGrants = subObj ? subclassGrants(subObj.name) : null
  const raceGrants = resolvedRace?.grants ?? emptyGrants('race', raceLabel || 'Custom race')
  const groups = addReplacementChoices([
    raceGrants,
    bg?.grants ?? emptyGrants('background', bgLabel || 'Custom background'),
    cls?.grants ?? emptyGrants('class', classLabel || 'Custom class'),
    ...(subGrants ? [subGrants] : []),
  ])
  const cleanPicks = sanitizePicks(groups, picks)
  const setPick = (id: string, values: string[]) => setPicks({ ...cleanPicks, [id]: values })
  const clearPicks = (prefix: string) =>
    setPicks(p => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith(prefix))))

  const abilitiesPreAsi = finalScores(baseScores(ability), racialBonus(raceGrants, cleanPicks))

  // ── Ability Score Improvements & feats (affect everything downstream) ─────
  const raceHasFeat = !!(race?.raw.feats || sub?.raw.feats)
  const asiLevels = (levelData?.asiLevels ?? []).filter(l => l <= startLevel)
  const asiAt = (l: number) => asiChoices[l] ?? emptyAsi()
  const featChoices = [...(raceHasFeat ? [raceFeat] : []), ...asiLevels.map(asiAt)]
  const plus = (a: AbilityScores, b: Record<string, number>) =>
    Object.fromEntries(ABILITY_KEYS.map(k => [k, a[k] + (b[k] ?? 0)])) as unknown as AbilityScores
  const abilities = plus(abilitiesPreAsi, asiBonus(featChoices, feats ?? []))
  /** Scores before one particular choice, for the "max 20" cap. */
  const scoresWithout = (c: AsiChoice) => plus(abilitiesPreAsi, asiBonus(featChoices.filter(x => x !== c), feats ?? []))
  const needFeats = raceHasFeat || asiLevels.length > 0
  useEffect(() => {
    if (needFeats && !feats) fetchFeats().then(setFeats).catch(() => {})
  }, [needFeats, feats])

  // ── Levels, subclass & spells ───────────────────────────────────────────────
  const clsName = cls?.name ?? null
  useEffect(() => {
    setLevelData(null)
    if (!clsName) return
    let alive = true
    fetchClassLevelData(clsName).then(d => alive && setLevelData(d)).catch(() => {})
    return () => { alive = false }
  }, [clsName])

  const info = levelData ? casterInfo(levelData, startLevel, abilities) : null
  const needsSubclass = levelData ? startLevel >= levelData.subclassLevel : classMode === 'custom' && startLevel >= 3
  const rolls = Array.from({ length: startLevel - 1 }, (_, i) => hpRolls[i] ?? null)
  const rs = racialSpells([race?.raw, sub?.raw ?? race?.autoSub])
  const alwaysPrepared = info && info.maxSpellLevel > 0 ? subclassPreparedNames(subObj, startLevel) : []
  const classHasSpells = !!info && (info.cantrips > 0 || info.spells > 0)
  const hasSpells = classHasSpells || !!rs.choice

  const maxSpell = info?.maxSpellLevel ?? 0
  const subForSpells = subObj?.name ?? ''
  useEffect(() => {
    setSpellOptions(null); setSpellError(null)
    if (!clsName || !classHasSpells) return
    let alive = true
    fetchClassSpellOptions(clsName, maxSpell, levelData?.subclasses.find(x => x.name === subForSpells) ?? null)
      .then(o => alive && setSpellOptions(o))
      .catch(e => alive && setSpellError(String(e?.message ?? e)))
    return () => { alive = false }
  }, [clsName, classHasSpells, maxSpell, subForSpells, levelData])

  const racialKey = rs.choice ? `${rs.choice.className}|${rs.choice.level}` : ''
  useEffect(() => {
    setRacialOptions(null)
    if (!racialKey) return
    const [c, l] = racialKey.split('|')
    let alive = true
    fetchClassSpellOptions(c, Number(l), null).then(o => alive && setRacialOptions(o.filter(x => x.level === Number(l)))).catch(() => {})
    return () => { alive = false }
  }, [racialKey])

  // Picks only count while they're still valid options.
  const optKeys = new Set((spellOptions ?? []).map(o => o.key))
  const locked = new Set(alwaysPrepared)
  const cantripOpts = (spellOptions ?? []).filter(o => o.level === 0)
  const levelledOpts = (spellOptions ?? []).filter(o => o.level > 0 && !locked.has(o.name.toLowerCase()))
  const validSpells: SpellPicks = {
    cantrips: spellPicks.cantrips.filter(k => optKeys.has(k)).slice(0, info?.cantrips ?? 0),
    spells: spellPicks.spells.filter(k => levelledOpts.some(o => o.key === k)).slice(0, info?.spells ?? 0),
    racial: spellPicks.racial.filter(k => (racialOptions ?? []).some(o => o.key === k)).slice(0, 1),
  }
  const spellsDone = (!classHasSpells || (!!spellOptions
      && validSpells.cantrips.length >= Math.min(info!.cantrips, cantripOpts.length)
      && validSpells.spells.length >= Math.min(info!.spells, levelledOpts.length)))
    && (!rs.choice || validSpells.racial.length === 1)

  const pickedSpellOptions = (): Array<{ spell: SpellOption; prepared: boolean }> => [
    ...cantripOpts.filter(o => validSpells.cantrips.includes(o.key)).map(spell => ({ spell, prepared: true })),
    ...levelledOpts.filter(o => validSpells.spells.includes(o.key)).map(spell => ({ spell, prepared: info?.mode !== 'spellbook' })),
    ...(racialOptions ?? []).filter(o => validSpells.racial.includes(o.key)).map(spell => ({ spell, prepared: true })),
  ]

  // ── Class features: optional features, Ranger picks, Expertise, subclass grants ──
  const classSlots: OptionSlot[] = levelData ? optionSlotsAt(levelData.optionalFeatureProgression, startLevel) : []
  const rangerSlots = cls ? rangerSlotsAt(cls.name, startLevel) : []
  useEffect(() => {
    if (classSlots.length && !optFeatures) fetchOptionalFeatures().then(setOptFeatures).catch(() => {})
  }, [classSlots.length, optFeatures])
  // Pact Boon first: invocation prerequisites depend on it.
  const slotList = [
    ...classSlots.map(slot => ({ slot, options: optFeatures ?? [] })),
    ...rangerSlots,
  ].sort((a, b) => Number(b.slot.featureTypes.includes('PB')) - Number(a.slot.featureTypes.includes('PB')))
  const pactKey = (optionPicks['Pact Boon'] ?? [])[0]
  const prereqCtx: PrereqContext = {
    className: classLabel, level: startLevel, subclass: subObj?.name ?? '',
    pact: pactKey ? pactKey.split('|')[0].replace(/^Pact of the /, '') : null,
    spells: [...pickedSpellOptions().map(x => x.spell.name.toLowerCase()), ...rs.fixed.map(n => n.toLowerCase())],
  }
  const eligible = (s: OptionSlot, options: OptionalFeature[]) =>
    options.filter(o => o.featureTypes.some(t => s.featureTypes.includes(t)) && checkPrereq(o.prerequisite, prereqCtx).ok)
  const validOptions = (s: OptionSlot, options: OptionalFeature[]) =>
    (optionPicks[s.name] ?? []).filter(k => eligible(s, options).some(o => o.key === k)).slice(0, s.count)
  const slotsDone = slotList.every(({ slot, options }) =>
    validOptions(slot, options).length >= Math.min(slot.count, eligible(slot, options).length) && (options.length > 0 || slot.count === 0))

  const expertiseNeed = cls ? expertiseCountAt(cls.name, startLevel) : 0
  const proficientSkills = ALL_SKILLS.filter(s => grantedNames(groups, cleanPicks, 'skill').includes(s))
  const expertiseOptions = [
    ...proficientSkills,
    ...(cls && expertiseAllowsThievesTools(cls.name) && grantedNames(groups, cleanPicks, 'tool').includes("Thieves' tools") ? ["Thieves' tools"] : []),
  ]
  const expertiseAlready = groups.flatMap(g => g.expertiseSkills ?? [])
  const validExpertise = expertisePicks.filter(x => expertiseOptions.includes(x) && !expertiseAlready.includes(x)).slice(0, expertiseNeed)
  const subChoices = subGrants?.choices ?? []

  const hasLevels = startLevel > 1 || needsSubclass || needFeats
  const hasFeatures = slotList.length > 0 || expertiseNeed > 0 || subChoices.length > 0
  const steps = FLOW.filter(x => (x !== 'levels' || hasLevels) && (x !== 'spells' || hasSpells) && (x !== 'features' || hasFeatures))

  const complete: Record<FlowStep, boolean> = {
    name: true,
    race: raceMode === 'custom' ? !!customRace.trim() : !!resolvedRace,
    class: classMode === 'custom' ? !!customClass.trim() : !!cls,
    background: bgMode === 'custom' ? !!customBg.trim() : !!bg,
    abilities: baseComplete(ability) && abilityChoicesComplete(raceGrants, cleanPicks),
    proficiencies: proficiencyChoicesComplete(groups.filter(g => g.source !== 'subclass'), cleanPicks),
    levels: (!needsSubclass || !levelData || !!subObj) && (hpMethod === 'average' || rolls.every(r => r != null))
      && featChoices.every(c => asiComplete(c, feats ?? [])),
    spells: spellsDone,
    features: slotsDone && validExpertise.length >= Math.min(expertiseNeed, expertiseOptions.length - expertiseAlready.length)
      && subChoices.every(c => choiceRemaining(c, groups, cleanPicks) === 0),
    personality: true,
    review: true,
  }

  const canReach = (s: FlowStep) => {
    const i = steps.indexOf(s)
    return i >= 0 && i <= maxReached && steps.slice(0, i).every(x => complete[x])
  }
  function go(s: FlowStep) {
    setStep(s)
    setMaxReached(m => Math.max(m, steps.indexOf(s)))
    window.scrollTo({ top: 0 })
  }

  const buildInput = (): BuildInput => ({
    name: name.trim(), raceLabel, race: resolvedRace, className: classLabel, cls,
    hitDie: cls?.hitDie ?? customHitDie, backgroundName: bgLabel, background: bg,
    groups, picks: cleanPicks, abilities, personality, alignment,
  })

  /** Level, subclass, HP, slots, class options, feats and expertise on top of the level-1 build. */
  function applyLevels(c: Partial<Character>): Partial<Character> {
    const hd = cls?.hitDie ?? customHitDie
    const traits: PassiveTrait[] = [...(c.passiveTraits ?? [])]

    const classOptions: ClassOptionPick[] = []
    for (const { slot, options } of slotList) {
      for (const key of validOptions(slot, options)) {
        const o = options.find(x => x.key === key)!
        const isRanger = o.featureTypes[0] === 'RFE' || o.featureTypes[0] === 'RNE'
        classOptions.push({ featureType: o.featureTypes.find(t => slot.featureTypes.includes(t)) ?? o.featureTypes[0], name: o.name, source: o.source, cost: o.cost })
        traits.push({ id: uuid(), name: isRanger ? `${slot.name.replace(/ \(.*\)$/, '')}: ${o.name}` : o.name, description: o.description })
      }
    }

    const savingThrows = { ...c.savingThrows! }
    const proficiencyList = [...(c.proficiencyList ?? [])]
    const chosenFeats: Array<{ name: string; source: string }> = []
    for (const ch of featChoices.filter(x => x.mode === 'feat')) {
      const f = (feats ?? []).find(x => x.key === ch.feat)
      if (!f) continue
      chosenFeats.push({ name: f.name, source: f.source })
      traits.push({ id: uuid(), name: f.name, description: f.description })
      if (f.saveFollowsChoice && ch.featAbility) savingThrows[ch.featAbility] = true
      for (const a of f.armor) if (!proficiencyList.some(p => p.name === a)) proficiencyList.push({ id: uuid(), name: a, category: 'armor' })
    }

    const skills = { ...c.skills! }
    for (const x of validExpertise) {
      if (skills[x]) skills[x] = { proficient: true, expertise: true }
      else traits.push({ id: uuid(), name: `Expertise: ${x}`, description: `Double your proficiency bonus for ability checks using ${x}.` })
    }

    const subclass = subObj?.name ?? customSubclass.trim()
    const maxHp = hitPointsAt(hd, startLevel, abilities.con, hpMethod === 'roll' ? rolls : null)
      + startLevel * hpBonusPerLevel(raceLabel, subclass, chosenFeats.map(f => f.name))
    return {
      ...c, level: startLevel, subclass, ac: unarmoredAC(classLabel, subclass, abilities),
      maxHp, currentHp: maxHp, hitDice: `${startLevel}d${hd}`, maxHitDice: `${startLevel}d${hd}`,
      ...(info && info.maxSpellLevel > 0 ? { spellSlots: info.slots } : {}),
      skills, savingThrows, proficiencyList, passiveTraits: traits, classOptions, feats: chosenFeats,
    }
  }

  async function create() {
    setCreating(true)
    try {
      const built = applyLevels(buildCharacter(buildInput()))
      const toSheet = ({ key: _k, tag: _t, ...s }: SpellOption | (Spell & { key?: string; tag?: string }), prepared: boolean): Spell =>
        ({ ...s, id: uuid(), prepared })
      let extra: Spell[] = []
      try { extra = await spellsByName([...alwaysPrepared, ...rs.fixed]) } catch { /* listed as traits anyway */ }
      built.spells = [...pickedSpellOptions().map(x => toSheet(x.spell, x.prepared)), ...extra.map(s => toSheet(s, true))]
      onComplete(await finalizeCharacter(built, cls?.name ?? null, subObj?.name ?? ''))
    } finally {
      setCreating(false)
    }
  }

  // ── Landing ───────────────────────────────────────────────────────────────
  if (step === 'landing') {
    function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          onImport(JSON.parse(ev.target?.result as string))
        } catch {
          alert('Could not read that file — make sure it\'s a valid character JSON.')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    }

    return (
      <WizardShell step="landing">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-100 mb-2">⚔ Character Sheet</h1>
          <p className="text-amber-600/70 text-sm">How would you like to begin?</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <label className="group bg-amber-900/40 border-2 border-amber-600/50 hover:border-amber-500/80 rounded-2xl p-6 text-left transition-all hover:bg-amber-800/30 cursor-pointer">
            <input type="file" accept=".json" className="hidden" onChange={handleImportFile} />
            <div className="text-lg font-bold text-amber-200 mb-1 group-hover:text-amber-100">↑ Load existing character</div>
            <p className="text-amber-500/70 text-sm">Already have a character? Import your saved JSON file to pick up where you left off.</p>
          </label>
          <button
            onClick={() => go('name')}
            className="group bg-amber-950/50 border border-amber-700/40 hover:border-amber-500/70 rounded-2xl p-6 text-left transition-all hover:bg-amber-900/30"
          >
            <div className="text-lg font-bold text-amber-300 mb-1 group-hover:text-amber-100">✦ Create new character</div>
            <p className="text-amber-600/70 text-sm">
              A step-by-step guide through race, class, background, ability scores and skills, with
              explanations along the way. Uses the 2014 Player's Handbook. Great for new players.
            </p>
          </button>
          <button
            onClick={onManual}
            className="group bg-amber-950/30 border border-amber-800/25 hover:border-amber-700/40 rounded-2xl p-6 text-left transition-all"
          >
            <div className="text-lg font-bold text-amber-400/70 mb-1 group-hover:text-amber-300">✎ Blank sheet</div>
            <p className="text-amber-700/60 text-sm">Start empty and fill everything in yourself.</p>
          </button>
        </div>
      </WizardShell>
    )
  }

  // ── Wizard steps ──────────────────────────────────────────────────────────
  const idx = Math.max(0, steps.indexOf(step))
  const next = () => go(steps[idx + 1])
  const back = () => (idx === 0 ? setStep('landing') : go(steps[idx - 1]))

  let body: React.ReactNode
  let title = ''
  let subtitle: React.ReactNode = null
  let hint = ''

  switch (step) {
    case 'name':
      title = "What is your character's name?"
      subtitle = 'You can change this any time on the sheet.'
      body = (<>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && next()}
          placeholder="e.g. Lyria Ashveil"
          className="w-full bg-amber-950/50 border border-amber-800/40 rounded-lg px-4 py-3 text-lg text-amber-100 placeholder-amber-800/50 focus:border-amber-500 focus:outline-none"
        />
        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-widest text-amber-600/80 font-bold mb-1.5">Starting level</div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 20 }, (_, i) => i + 1).map(l => (
              <button key={l} onClick={() => { setStartLevel(l); setSpellPicks({ cantrips: [], spells: [], racial: [] }) }}
                className={`w-9 py-1 rounded-lg border text-sm font-bold ${startLevel === l ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-500/70 hover:text-amber-300'}`}>
                {l}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-amber-600/70 mt-1.5">Your DM tells you this. New campaigns usually start at 1 or 3.</p>
        </div>
      </>)
      break

    case 'race':
      title = 'Choose a race'
      subtitle = 'Your race shapes your ability scores, senses and a few special traits. Click one to read about it.'
      hint = raceMode === 'custom' ? 'Type a race name' : !race ? 'Pick a race' : `Pick a ${race.subraceLabel === 'Subrace' ? 'subrace' : 'draconic ancestry'}`
      body = (
        <RaceStep
          races={races.data} loading={races.loading} error={races.error} onRetry={races.retry}
          mode={raceMode} onMode={m => { setRaceMode(m); clearPicks('race:') }}
          raceName={raceName} subShort={subShort}
          onPick={n => { if (n !== raceName) { setRaceName(n); setSubShort(null); setFlexible(false); clearPicks('race:') } }}
          onPickSub={s => { setSubShort(s); clearPicks('race:') }}
          customRace={customRace} onCustomRace={setCustomRace}
        />
      )
      break

    case 'class':
      title = 'Choose a class'
      subtitle = 'Your class is what your character does on an adventure: the biggest choice you will make. Click one to read about it.'
      hint = classMode === 'custom' ? 'Type a class name' : 'Pick a class'
      body = (
        <ClassStep
          classes={classes.data} loading={classes.loading} error={classes.error} onRetry={classes.retry}
          mode={classMode} onMode={m => { setClassMode(m); clearPicks('class:') }}
          className={className}
          onPick={n => { if (n !== className) { setClassName(n); clearPicks('class:'); clearPicks('subclass:'); setSubclassName(null); setSpellPicks({ cantrips: [], spells: [], racial: [] }); setOptionPicks({}); setExpertisePicks([]) } }}
          customClass={customClass} onCustomClass={setCustomClass}
          customHitDie={customHitDie} onCustomHitDie={setCustomHitDie}
        />
      )
      break

    case 'background':
      title = 'Choose a background'
      subtitle = 'What your character did before adventuring. It gives skills, tools or languages, some gear and a special feature.'
      hint = bgMode === 'custom' ? 'Type a background name' : 'Pick a background'
      body = (
        <BackgroundStep
          backgrounds={backgrounds.data} loading={backgrounds.loading} error={backgrounds.error} onRetry={backgrounds.retry}
          mode={bgMode} onMode={m => { setBgMode(m); clearPicks('background:') }}
          backgroundName={bgName}
          onPick={n => {
            if (n === bgName) return
            setPersonality(p => clearTableEntries(p, bg))
            setBgName(n)
            clearPicks('background:')
          }}
          customBackground={customBg} onCustomBackground={setCustomBg}
        />
      )
      break

    case 'abilities':
      title = 'Set your ability scores'
      subtitle = cls
        ? <>Six numbers that describe what your character is good at. <span className="text-amber-400">★</span> marks what matters most for a {cls.name} ({CLASS_PITCH[cls.name]?.keyAbilities}).</>
        : 'Six numbers that describe what your character is good at.'
      hint = !baseComplete(ability)
        ? (ability.method === 'pointbuy' ? 'You have spent more than 27 points' : 'Assign all six scores')
        : 'Choose your racial bonuses'
      body = (
        <AbilityStep
          state={ability} onChange={setAbility}
          race={raceGrants} picks={cleanPicks} onPick={setPick}
          className={cls?.name ?? null}
          canFlex={!!race && race.raw.lineage !== 'VRGR' && canFlexBonuses(race && (race.subraces.length === 0 || sub) ? resolveRace(race, sub).grants : raceGrants)}
          flexible={flexible}
          onFlexible={v => { setFlexible(v); clearPicks('race:') }}
        />
      )
      break

    case 'proficiencies':
      title = 'Skills, languages & tools'
      subtitle = 'Everything your race, background and class give you. 🔒 chips are automatic; highlighted boxes need a choice from you.'
      hint = 'Finish the highlighted choices'
      body = <ProficiencyStep groups={groups} picks={cleanPicks} onPick={setPick} />
      break

    case 'levels':
      title = startLevel > 1 ? `Level ${startLevel}: your level-ups` : needsSubclass ? 'Choose your subclass' : 'Choose your feat'
      subtitle = startLevel > 1
        ? `Starting at level ${startLevel}. Your class features up to this level are added automatically when you create.`
        : needsSubclass ? `A ${classLabel} picks a subclass right at level 1.` : 'Your race gives you a feat: a special talent.'
      hint = needsSubclass && levelData && !subObj ? 'Pick a subclass'
        : !featChoices.every(c => asiComplete(c, feats ?? [])) ? 'Finish your ability score / feat choices'
        : 'Roll hit points for every level'
      body = (
        <LevelsStep
          className={classLabel} level={startLevel} hitDie={cls?.hitDie ?? customHitDie} con={abilities.con}
          data={levelData} subclassName={subclassName}
          onSubclass={n => { setSubclassName(n); clearPicks('subclass:') }}
          customSubclass={customSubclass} onCustomSubclass={setCustomSubclass}
          hpMethod={hpMethod} onHpMethod={setHpMethod} hpRolls={rolls} onHpRolls={setHpRolls}
        >
          {featChoices.length > 0 && (
            <div className="space-y-4">
              {raceHasFeat && (
                <AsiPicker title={`Feat from your race (${raceLabel})`} choice={raceFeat} onChange={setRaceFeat} featOnly
                  scores={scoresWithout(raceFeat)} feats={feats}
                  featCtx={{ abilities: scoresWithout(raceFeat), race: raceLabel, spellcaster: !!cls?.spellcastingAbility, armor: groups.flatMap(g => g.armor) }}
                  takenFeats={featChoices.filter(c => c !== raceFeat).map(c => c.feat ?? '')} />
              )}
              {asiLevels.map(l => {
                const c = asiAt(l)
                return (
                  <AsiPicker key={l} title={`Level ${l}: Ability Score Improvement`} choice={c}
                    onChange={nc => setAsiChoices(prev => ({ ...prev, [l]: nc }))}
                    scores={scoresWithout(c)} feats={feats}
                    featCtx={{ abilities: scoresWithout(c), race: raceLabel, spellcaster: !!cls?.spellcastingAbility, armor: groups.flatMap(g => g.armor) }}
                    takenFeats={featChoices.filter(x => x !== c).map(x => x.feat ?? '')} />
                )
              })}
            </div>
          )}
        </LevelsStep>
      )
      break

    case 'features':
      title = 'Class features'
      subtitle = `Choices your ${classLabel}${subObj ? ` (${subObj.name})` : ''} makes by level ${startLevel}. Click any option to read it.`
      hint = 'Finish the highlighted choices'
      body = (
        <div className="space-y-4">
          {classSlots.length > 0 && !optFeatures && <p className="text-amber-600/70 text-sm animate-pulse">Loading options…</p>}
          {slotList.map(({ slot, options }) => (
            <OptionPicker key={slot.name} slot={slot} need={Math.min(slot.count, eligible(slot, options).length)}
              options={options} picked={validOptions(slot, options)} owned={[]} ctx={prereqCtx}
              onChange={keys => setOptionPicks(p => ({ ...p, [slot.name]: keys }))}
              intro={slot.featureTypes.includes('MM') ? `Choose ${slot.count}. Each one changes how you cast a spell for a cost in sorcery points, tracked on the Spells tab.`
                : slot.featureTypes.includes('EI') ? `Choose ${slot.count}. Greyed-out ones need something you don't have yet (a pact, a spell or a higher level).`
                : undefined} />
          ))}
          {expertiseNeed > 0 && (
            <ExpertisePicker need={Math.min(expertiseNeed, expertiseOptions.length - expertiseAlready.length)}
              proficient={expertiseOptions} already={expertiseAlready} picked={validExpertise} onChange={setExpertisePicks} />
          )}
          {subGrants && subChoices.length > 0 && (
            <section className="rounded-xl border border-amber-800/30 bg-amber-950/30 p-3 md:p-4 space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-widest text-amber-600/80 font-bold">From your subclass</span>
                <span className="text-base font-bold text-amber-100">{subGrants.sourceLabel}</span>
              </div>
              {subChoices.map(c => <ChoicePicker key={c.id} choice={c} groups={groups} picks={cleanPicks} onPick={setPick} />)}
            </section>
          )}
        </div>
      )
      break

    case 'spells':
      title = 'Choose your spells'
      subtitle = classHasSpells
        ? `Only spells a ${classLabel} can learn, up to the highest level you can cast. Click a spell to read it.`
        : 'Your race gives you a spell.'
      hint = 'Pick the highlighted number of spells'
      body = (
        <SpellStep
          className={classLabel} level={startLevel}
          info={info ?? { cantrips: 0, spells: 0, mode: 'none', preparedLimit: null, maxSpellLevel: 0, slots: {} }}
          options={classHasSpells ? spellOptions : []} error={spellError}
          alwaysPrepared={alwaysPrepared}
          racialChoice={rs.choice ? { label: `${rs.choice.className} cantrip from your race`, options: racialOptions ?? [] } : null}
          racialFixed={rs.fixed.map(n => n.replace(/\b\w/g, c => c.toUpperCase()))}
          picks={validSpells} onPicks={setSpellPicks}
        />
      )
      break

    case 'personality':
      title = 'Personality'
      subtitle = 'Optional, but it brings your character to life. Pick from your background’s suggestions, roll, or write your own.'
      body = (
        <PersonalityStep
          background={bg} personality={personality} onPersonality={setPersonality}
          alignment={alignment} onAlignment={setAlignment}
        />
      )
      break

    case 'review': {
      const preview = applyLevels(buildCharacter(buildInput()))
      const todo = [
        ...(cls ? CLASS_LEVEL1_TODO[cls.name] ?? [] : [])
          .filter(t => !(hasSpells && t.includes('Spells tab')) && !(subObj && t.includes('Subclass field'))
            && !(slotList.some(s => s.slot.featureTypes.some(ft => ft.startsWith('FS'))) && t.includes('Fighting Style'))
            && !(expertiseNeed > 0 && t.includes('Expertise')) && !(rangerSlots.length && t.includes('Favored Enemy'))),

        ...(preview.inventory ?? [])
          .filter(i => i.name.endsWith('(your choice)'))
          .map(i => `Pick a specific ${i.name.replace(' (your choice)', '').toLowerCase()} for your equipment.`),
      ]
      title = 'Ready to begin?'
      subtitle = 'Everything can still be edited on the sheet afterwards.'
      body = <ReviewStep preview={preview} groups={groups} picks={cleanPicks} todo={todo} spellNames={[...pickedSpellOptions().map(x => x.spell.name), ...alwaysPrepared.map(n => `${n} (always prepared)`), ...rs.fixed]} />
      break
    }
  }

  const isReview = step === 'review'
  return (
    <WizardShell step={step} steps={steps} canReach={canReach} onJump={go}>
      <StepCard
        title={title}
        subtitle={subtitle}
        onBack={back}
        onNext={isReview ? create : next}
        nextLabel={isReview ? (creating ? 'Building…' : 'Create Character ✦') : step === 'personality' ? 'Review →' : 'Next →'}
        nextDisabled={isReview ? creating : !complete[step]}
        nextHint={hint}
      >
        {body}
      </StepCard>
    </WizardShell>
  )
}
