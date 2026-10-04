import { useCallback, useEffect, useState } from 'react'
import type { Character } from '../types'
import {
  emptyGrants, fetchBackgrounds2014, fetchClasses2014, fetchRaces2014, resolveRace,
  type BackgroundOption,
} from '../data/creator2014'
import {
  abilityChoicesComplete, addReplacementChoices, buildCharacter, finalizeCharacter,
  proficiencyChoicesComplete, racialBonus, sanitizePicks,
  type BuildInput, type Personality, type Picks,
} from '../data/creatorBuild'
import { CLASS_LEVEL1_TODO, CLASS_PITCH } from '../data/creatorPitches'
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

  const active = step !== 'landing'
  const races = useLoader(fetchRaces2014, active)
  const classes = useLoader(fetchClasses2014, active)
  const backgrounds = useLoader(fetchBackgrounds2014, active)

  // ── Derived selections ────────────────────────────────────────────────────
  const race = raceMode === 'list' ? races.data.find(r => r.name === raceName) ?? null : null
  const sub = race?.subraces.find(s => s.short === subShort) ?? null
  const resolvedRace = race && (race.subraces.length === 0 || sub) ? resolveRace(race, sub) : null
  const cls = classMode === 'list' ? classes.data.find(c => c.name === className) ?? null : null
  const bg = bgMode === 'list' ? backgrounds.data.find(b => b.name === bgName) ?? null : null

  const raceLabel = resolvedRace?.label ?? (raceMode === 'custom' ? customRace.trim() : '')
  const classLabel = cls?.name ?? (classMode === 'custom' ? customClass.trim() : '')
  const bgLabel = bg?.name ?? (bgMode === 'custom' ? customBg.trim() : '')

  const raceGrants = resolvedRace?.grants ?? emptyGrants('race', raceLabel || 'Custom race')
  const groups = addReplacementChoices([
    raceGrants,
    bg?.grants ?? emptyGrants('background', bgLabel || 'Custom background'),
    cls?.grants ?? emptyGrants('class', classLabel || 'Custom class'),
  ])
  const cleanPicks = sanitizePicks(groups, picks)
  const setPick = (id: string, values: string[]) => setPicks({ ...cleanPicks, [id]: values })
  const clearPicks = (prefix: string) =>
    setPicks(p => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith(prefix))))

  const abilities = finalScores(baseScores(ability), racialBonus(raceGrants, cleanPicks))

  const complete: Record<FlowStep, boolean> = {
    name: true,
    race: raceMode === 'custom' ? !!customRace.trim() : !!resolvedRace,
    class: classMode === 'custom' ? !!customClass.trim() : !!cls,
    background: bgMode === 'custom' ? !!customBg.trim() : !!bg,
    abilities: baseComplete(ability) && abilityChoicesComplete(raceGrants, cleanPicks),
    proficiencies: proficiencyChoicesComplete(groups, cleanPicks),
    personality: true,
    review: true,
  }

  const canReach = (s: FlowStep) => {
    const i = FLOW.indexOf(s)
    return i <= maxReached && FLOW.slice(0, i).every(x => complete[x])
  }
  function go(s: FlowStep) {
    setStep(s)
    setMaxReached(m => Math.max(m, FLOW.indexOf(s)))
    window.scrollTo({ top: 0 })
  }

  const buildInput = (): BuildInput => ({
    name: name.trim(), raceLabel, race: resolvedRace, className: classLabel, cls,
    hitDie: cls?.hitDie ?? customHitDie, backgroundName: bgLabel, background: bg,
    groups, picks: cleanPicks, abilities, personality, alignment,
  })

  async function create() {
    setCreating(true)
    try {
      onComplete(await finalizeCharacter(buildCharacter(buildInput()), cls?.name ?? null))
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
  const idx = FLOW.indexOf(step)
  const next = () => go(FLOW[idx + 1])
  const back = () => (idx === 0 ? setStep('landing') : go(FLOW[idx - 1]))

  let body: React.ReactNode
  let title = ''
  let subtitle: React.ReactNode = null
  let hint = ''

  switch (step) {
    case 'name':
      title = "What is your character's name?"
      subtitle = 'You can change this any time on the sheet.'
      body = (
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && next()}
          placeholder="e.g. Lyria Ashveil"
          className="w-full bg-amber-950/50 border border-amber-800/40 rounded-lg px-4 py-3 text-lg text-amber-100 placeholder-amber-800/50 focus:border-amber-500 focus:outline-none"
        />
      )
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
          onPick={n => { if (n !== raceName) { setRaceName(n); setSubShort(null); clearPicks('race:') } }}
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
          onPick={n => { if (n !== className) { setClassName(n); clearPicks('class:') } }}
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
        />
      )
      break

    case 'proficiencies':
      title = 'Skills, languages & tools'
      subtitle = 'Everything your race, background and class give you. 🔒 chips are automatic; highlighted boxes need a choice from you.'
      hint = 'Finish the highlighted choices'
      body = <ProficiencyStep groups={groups} picks={cleanPicks} onPick={setPick} />
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
      const preview = buildCharacter(buildInput())
      const todo = [
        ...(cls ? CLASS_LEVEL1_TODO[cls.name] ?? [] : []),
        ...(resolvedRace?.traits.some(t => t.name === 'Feat') ? ['Choose one feat (Variant Human).'] : []),
        ...(resolvedRace?.traits.some(t => t.name === 'Cantrip') ? ['Pick one wizard cantrip (High Elf) in the Spells tab.'] : []),
        ...(preview.inventory ?? [])
          .filter(i => i.name.endsWith('(your choice)'))
          .map(i => `Pick a specific ${i.name.replace(' (your choice)', '').toLowerCase()} for your equipment.`),
      ]
      title = 'Ready to begin?'
      subtitle = 'Everything can still be edited on the sheet afterwards.'
      body = <ReviewStep preview={preview} groups={groups} picks={cleanPicks} todo={todo} />
      break
    }
  }

  const isReview = step === 'review'
  return (
    <WizardShell step={step} canReach={canReach} onJump={go}>
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
