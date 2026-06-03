import { useState, useEffect } from 'react'
import type { Character, AbilityKey } from '../types'
import {
  fetchCreatorRaces, fetchCreatorClasses,
  SOURCE_LABELS, PRIMARY_SOURCES,
  type CreatorRace, type CreatorClass,
} from '../data/fiveEtoolsCreator'

interface Props {
  onComplete: (char: Partial<Character>) => void
  onManual:   () => void
}

type Step = 'landing' | 'name' | 'race' | 'class' | 'review'

const ABILITY_LABELS: Record<string, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}

// ---------------------------------------------------------------------------
// Small shared UI pieces
// ---------------------------------------------------------------------------

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div className={`w-2 h-2 rounded-full transition-colors ${
      done ? 'bg-amber-500' : active ? 'bg-amber-400 ring-2 ring-amber-400/40' : 'bg-amber-900'
    }`} />
  )
}

function WizardShell({ step, children }: { step: Step; children: React.ReactNode }) {
  const steps: Step[] = ['name', 'race', 'class', 'review']
  const idx = steps.indexOf(step)
  return (
    <div className="min-h-screen bg-[#130e06] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {step !== 'landing' && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <StepDot active={i === idx} done={i < idx} />
                {i < steps.length - 1 && (
                  <div className={`w-8 h-px ${i < idx ? 'bg-amber-600/60' : 'bg-amber-900/60'}`} />
                )}
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-amber-950/40 border border-amber-800/30 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  )
}

function Label({ text }: { text: string }) {
  return <span className="text-[9px] uppercase tracking-widest text-amber-600/70 block mb-1">{text}</span>
}

// ---------------------------------------------------------------------------
// Source picker sub-component
// ---------------------------------------------------------------------------

function SourcePicker({ selected, onChange }: {
  selected: string; onChange: (s: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const allSources = Object.entries(SOURCE_LABELS)
  const shown = showAll ? allSources : allSources.filter(([k]) => PRIMARY_SOURCES.includes(k))

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 gap-1.5">
        {shown.map(([code, label]) => (
          <button
            key={code}
            onClick={() => onChange(code)}
            className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
              selected === code
                ? 'bg-amber-600/20 border-amber-500/70 text-amber-200'
                : 'border-amber-800/30 text-amber-400/60 hover:border-amber-700/50 hover:text-amber-300'
            }`}
          >
            <span className="font-bold text-amber-300/80 mr-2">{code}</span>
            {label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setShowAll(v => !v)}
        className="text-[10px] text-amber-700/50 hover:text-amber-500 underline decoration-dotted"
      >
        {showAll ? 'Show fewer sources' : 'Show all sources…'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Race picker sub-component
// ---------------------------------------------------------------------------

function RacePicker({ races, loading, source, selected, onSelect }: {
  races: CreatorRace[]
  loading: boolean
  source: string
  selected: CreatorRace | null
  onSelect: (r: CreatorRace) => void
}) {
  const [query, setQuery] = useState('')
  const filtered = races
    .filter(r => source === 'any' || r.source === source)
    .filter(r => !query || r.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-2">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={loading ? 'Loading races…' : `Search races from ${source === 'any' ? 'all sources' : source}…`}
        disabled={loading}
        className="w-full bg-amber-950/50 border border-amber-800/40 rounded-lg px-3 py-2 text-sm text-amber-100 placeholder-amber-700/50 focus:border-amber-600 transition-colors disabled:opacity-50"
      />
      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
        {filtered.map(r => (
          <button
            key={r.name + r.source}
            onClick={() => onSelect(r)}
            className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
              selected?.name === r.name && selected?.source === r.source
                ? 'bg-amber-600/20 border-amber-500/70 text-amber-100'
                : 'border-amber-800/25 text-amber-300/70 hover:border-amber-700/50 hover:text-amber-200'
            }`}
          >
            <span className="font-semibold">{r.name}</span>
            <span className="ml-2 text-amber-600/50">{r.source}</span>
            {r.darkvision && <span className="ml-2 text-indigo-400/50">Darkvision {r.darkvision}ft</span>}
            {r.resistances.length > 0 && (
              <span className="ml-2 text-green-400/50">Res: {r.resistances.join(', ')}</span>
            )}
          </button>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-amber-700/50 text-xs text-center py-4">No races found for this source.</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Class picker sub-component
// ---------------------------------------------------------------------------

function ClassPicker({ classes, loading, selected, onSelect }: {
  classes: CreatorClass[]
  loading: boolean
  selected: CreatorClass | null
  onSelect: (c: CreatorClass) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {loading ? (
        <p className="col-span-2 text-amber-700/50 text-xs text-center py-4 animate-pulse">Loading classes…</p>
      ) : (
        classes.map(c => (
          <button
            key={c.name}
            onClick={() => onSelect(c)}
            className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
              selected?.name === c.name
                ? 'bg-amber-600/20 border-amber-500/70 text-amber-100'
                : 'border-amber-800/25 text-amber-300/70 hover:border-amber-700/50 hover:text-amber-200'
            }`}
          >
            <div className="font-semibold text-sm">{c.name}</div>
            <div className="text-amber-600/50 mt-0.5">d{c.hitDie} · {c.savingThrows.map(s => s.toUpperCase()).join('/')}</div>
            {c.spellcastingAbility && (
              <div className="text-purple-400/50 mt-0.5">
                Spellcasting ({ABILITY_LABELS[c.spellcastingAbility]?.slice(0,3) ?? c.spellcastingAbility})
              </div>
            )}
          </button>
        ))
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export default function CharacterCreator({ onComplete, onManual }: Props) {
  const [step, setStep]         = useState<Step>('landing')
  const [charName, setCharName] = useState('')

  const [races, setRaces]           = useState<CreatorRace[]>([])
  const [racesLoading, setRacesLoading] = useState(false)
  const [raceSource, setRaceSource] = useState('PHB')
  const [selectedRace, setSelectedRace] = useState<CreatorRace | null>(null)
  const [customRace, setCustomRace] = useState('')

  const [classes, setClasses]         = useState<CreatorClass[]>([])
  const [classesLoading, setClassesLoading] = useState(false)
  const [selectedClass, setSelectedClass] = useState<CreatorClass | null>(null)
  const [customClass, setCustomClass] = useState('')

  const [raceTab, setRaceTab]   = useState<'search' | 'custom'>('search')
  const [classTab, setClassTab] = useState<'search' | 'custom'>('search')

  // Prefetch race + class data as soon as wizard opens
  useEffect(() => {
    if (step === 'landing') return
    if (!races.length && !racesLoading) {
      setRacesLoading(true)
      fetchCreatorRaces()
        .then(setRaces)
        .finally(() => setRacesLoading(false))
    }
    if (!classes.length && !classesLoading) {
      setClassesLoading(true)
      fetchCreatorClasses()
        .then(setClasses)
        .finally(() => setClassesLoading(false))
    }
  }, [step])

  function buildCharacter(): Partial<Character> {
    const raceName  = raceTab  === 'custom' ? customRace  : (selectedRace?.name  ?? '')
    const className = classTab === 'custom' ? customClass : (selectedClass?.name ?? '')

    // Build Features & Traits from race
    const featureParts: string[] = []
    if (selectedRace && raceTab === 'search') {
      if (selectedRace.size.length) featureParts.push(`Size: ${selectedRace.size.join(' or ')}`)
      if (selectedRace.darkvision) featureParts.push(`Darkvision: ${selectedRace.darkvision} ft`)
      if (selectedRace.resistances.length) featureParts.push(`Damage Resistances: ${selectedRace.resistances.join(', ')}`)
      if (selectedRace.traits) featureParts.push('\n' + selectedRace.traits)
    }

    // Build proficiency string from class
    const profParts: string[] = []
    if (selectedClass && classTab === 'search') {
      if (selectedClass.armorProfs.length)  profParts.push(`Armor: ${selectedClass.armorProfs.join(', ')}`)
      if (selectedClass.weaponProfs.length) profParts.push(`Weapons: ${selectedClass.weaponProfs.join(', ')}`)
      if (selectedClass.savingThrows.length)
        profParts.push(`Saving Throws: ${selectedClass.savingThrows.map(s => s.toUpperCase()).join(', ')}`)
    }

    const updates: Partial<Character> = {
      name:  charName,
      race:  raceName,
      class: className,
    }

    if (selectedRace && raceTab === 'search') {
      updates.speed = selectedRace.speed
    }
    if (selectedClass && classTab === 'search') {
      updates.hitDice = `1d${selectedClass.hitDie}`
      if (selectedClass.spellcastingAbility) {
        updates.spellcastingAbility = selectedClass.spellcastingAbility as AbilityKey
      }
      // Tick saving throw proficiencies
      const savingThrows: Record<string, boolean> = {}
      for (const key of selectedClass.savingThrows) savingThrows[key] = true
      if (Object.keys(savingThrows).length) updates.savingThrows = savingThrows as any
    }
    if (featureParts.length) updates.features    = featureParts.join('\n')
    if (profParts.length)    updates.proficiencies = profParts.join('\n')

    return updates
  }

  const raceSummary  = raceTab  === 'custom' ? customRace  : selectedRace?.name  ?? ''
  const classSummary = classTab === 'custom' ? customClass : selectedClass?.name ?? ''

  // ── Landing ──────────────────────────────────────────────────────────────
  if (step === 'landing') {
    return (
      <WizardShell step="landing">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-100 mb-2">⚔ Character Sheet</h1>
          <p className="text-amber-600/60 text-sm">How would you like to begin?</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => setStep('name')}
            className="group bg-amber-950/50 border border-amber-700/40 hover:border-amber-500/70 rounded-2xl p-6 text-left transition-all hover:bg-amber-900/30"
          >
            <div className="text-lg font-bold text-amber-200 mb-1 group-hover:text-amber-100">
              ✦ Guided Creation
            </div>
            <p className="text-amber-600/60 text-sm">
              Choose your race and class from 5e sourcebooks. Traits, hit dice, and proficiencies
              are filled in automatically. You can still customise everything afterwards.
            </p>
          </button>
          <button
            onClick={onManual}
            className="group bg-amber-950/30 border border-amber-800/25 hover:border-amber-700/40 rounded-2xl p-6 text-left transition-all"
          >
            <div className="text-lg font-bold text-amber-400/70 mb-1 group-hover:text-amber-300">
              ✎ Manual Entry
            </div>
            <p className="text-amber-700/50 text-sm">
              Start with a blank sheet and fill in everything yourself.
            </p>
          </button>
        </div>
      </WizardShell>
    )
  }

  // ── Step: Name ───────────────────────────────────────────────────────────
  if (step === 'name') {
    return (
      <WizardShell step="name">
        <Card>
          <h2 className="text-xl font-bold text-amber-100 mb-1">What is your character's name?</h2>
          <p className="text-amber-600/50 text-xs mb-5">You can change this at any time on the sheet.</p>
          <input
            autoFocus
            value={charName}
            onChange={e => setCharName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setStep('race')}
            placeholder="e.g. Lyria Ashveil"
            className="w-full bg-amber-950/50 border border-amber-800/40 rounded-lg px-4 py-3 text-lg text-amber-100 placeholder-amber-800/40 focus:border-amber-500 transition-colors focus:outline-none mb-6"
          />
          <div className="flex justify-between">
            <button onClick={() => setStep('landing')} className="text-amber-700/50 hover:text-amber-500 text-sm">← Back</button>
            <button
              onClick={() => setStep('race')}
              className="px-5 py-2 bg-amber-700/60 hover:bg-amber-600/70 text-amber-100 rounded-lg text-sm font-bold transition-colors"
            >
              Next →
            </button>
          </div>
        </Card>
      </WizardShell>
    )
  }

  // ── Step: Race ───────────────────────────────────────────────────────────
  if (step === 'race') {
    const canContinue = raceTab === 'custom' ? customRace.trim().length > 0 : selectedRace !== null
    return (
      <WizardShell step="race">
        <Card>
          <h2 className="text-xl font-bold text-amber-100 mb-1">Choose a Race</h2>
          <p className="text-amber-600/50 text-xs mb-4">
            {charName ? `Who is ${charName}?` : 'Select your character\'s race.'}
          </p>

          {/* Tab toggle */}
          <div className="flex gap-1 mb-4 bg-amber-950/60 rounded-lg p-1">
            {(['search', 'custom'] as const).map(t => (
              <button
                key={t}
                onClick={() => setRaceTab(t)}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  raceTab === t ? 'bg-amber-700/50 text-amber-100' : 'text-amber-600/50 hover:text-amber-400'
                }`}
              >
                {t === 'search' ? '5e.tools Search' : 'Custom / Homebrew'}
              </button>
            ))}
          </div>

          {raceTab === 'search' ? (
            <div className="space-y-3">
              <div>
                <Label text="Sourcebook" />
                <SourcePicker selected={raceSource} onChange={setRaceSource} />
              </div>
              <div>
                <Label text="Race" />
                <RacePicker
                  races={races} loading={racesLoading}
                  source={raceSource}
                  selected={selectedRace}
                  onSelect={setSelectedRace}
                />
              </div>
              {selectedRace && (
                <div className="bg-amber-950/60 border border-amber-800/20 rounded-lg p-3 text-xs text-amber-300/70 max-h-32 overflow-y-auto">
                  <div className="font-bold text-amber-200 mb-1">{selectedRace.name} traits</div>
                  {selectedRace.darkvision && <div>• Darkvision {selectedRace.darkvision} ft</div>}
                  {selectedRace.resistances.length > 0 && <div>• Resistances: {selectedRace.resistances.join(', ')}</div>}
                  {selectedRace.abilityBonuses && (
                    <div>• Ability bonuses: {Object.entries(selectedRace.abilityBonuses).map(([k,v]) => `+${v} ${ABILITY_LABELS[k] ?? k}`).join(', ')}</div>
                  )}
                  {!selectedRace.abilityBonuses && <div>• Free +2/+1 ability score increases (choose after)</div>}
                </div>
              )}
            </div>
          ) : (
            <div>
              <Label text="Race name" />
              <input
                autoFocus
                value={customRace}
                onChange={e => setCustomRace(e.target.value)}
                placeholder="e.g. Half-Dragon, Kenku, Changeling…"
                className="w-full bg-amber-950/50 border border-amber-800/40 rounded-lg px-3 py-2 text-sm text-amber-100 placeholder-amber-700/40 focus:border-amber-600 transition-colors focus:outline-none"
              />
              <p className="text-[10px] text-amber-700/40 mt-1.5">You can fill in traits manually in the Features & Traits field on the sheet.</p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button onClick={() => setStep('name')} className="text-amber-700/50 hover:text-amber-500 text-sm">← Back</button>
            <button
              onClick={() => setStep('class')}
              disabled={!canContinue}
              className="px-5 py-2 bg-amber-700/60 hover:bg-amber-600/70 disabled:opacity-30 disabled:cursor-not-allowed text-amber-100 rounded-lg text-sm font-bold transition-colors"
            >
              Next →
            </button>
          </div>
        </Card>
      </WizardShell>
    )
  }

  // ── Step: Class ──────────────────────────────────────────────────────────
  if (step === 'class') {
    const canContinue = classTab === 'custom' ? customClass.trim().length > 0 : selectedClass !== null
    return (
      <WizardShell step="class">
        <Card>
          <h2 className="text-xl font-bold text-amber-100 mb-1">Choose a Class</h2>
          <p className="text-amber-600/50 text-xs mb-4">What path does your character walk?</p>

          <div className="flex gap-1 mb-4 bg-amber-950/60 rounded-lg p-1">
            {(['search', 'custom'] as const).map(t => (
              <button
                key={t}
                onClick={() => setClassTab(t)}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  classTab === t ? 'bg-amber-700/50 text-amber-100' : 'text-amber-600/50 hover:text-amber-400'
                }`}
              >
                {t === 'search' ? '5e.tools Search' : 'Custom / Homebrew'}
              </button>
            ))}
          </div>

          {classTab === 'search' ? (
            <ClassPicker
              classes={classes} loading={classesLoading}
              selected={selectedClass}
              onSelect={setSelectedClass}
            />
          ) : (
            <div>
              <Label text="Class name" />
              <input
                autoFocus
                value={customClass}
                onChange={e => setCustomClass(e.target.value)}
                placeholder="e.g. Blood Hunter, Artificer variant…"
                className="w-full bg-amber-950/50 border border-amber-800/40 rounded-lg px-3 py-2 text-sm text-amber-100 placeholder-amber-700/40 focus:border-amber-600 transition-colors focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button onClick={() => setStep('race')} className="text-amber-700/50 hover:text-amber-500 text-sm">← Back</button>
            <button
              onClick={() => setStep('review')}
              disabled={!canContinue}
              className="px-5 py-2 bg-amber-700/60 hover:bg-amber-600/70 disabled:opacity-30 disabled:cursor-not-allowed text-amber-100 rounded-lg text-sm font-bold transition-colors"
            >
              Review →
            </button>
          </div>
        </Card>
      </WizardShell>
    )
  }

  // ── Step: Review ─────────────────────────────────────────────────────────
  const preview = buildCharacter()
  return (
    <WizardShell step="review">
      <Card>
        <h2 className="text-xl font-bold text-amber-100 mb-1">Ready to begin?</h2>
        <p className="text-amber-600/50 text-xs mb-5">Everything can be edited on the sheet afterwards.</p>

        <div className="space-y-2 mb-6">
          {[
            { label: 'Name',  value: charName || '(unnamed)' },
            { label: 'Race',  value: raceSummary  || '—' },
            { label: 'Class', value: classSummary || '—' },
            selectedClass && classTab === 'search'
              ? { label: 'Hit Die', value: `d${selectedClass.hitDie}` } : null,
            selectedClass?.spellcastingAbility && classTab === 'search'
              ? { label: 'Spellcasting', value: ABILITY_LABELS[selectedClass.spellcastingAbility] ?? selectedClass.spellcastingAbility } : null,
            selectedRace && raceTab === 'search'
              ? { label: 'Speed', value: `${selectedRace.speed} ft` } : null,
            selectedRace?.darkvision && raceTab === 'search'
              ? { label: 'Darkvision', value: `${selectedRace.darkvision} ft` } : null,
          ].filter(Boolean).map(row => row && (
            <div key={row.label} className="flex justify-between text-sm border-b border-amber-900/40 pb-1.5">
              <span className="text-amber-600/60 text-xs uppercase tracking-widest">{row.label}</span>
              <span className="text-amber-200">{row.value}</span>
            </div>
          ))}
        </div>

        {selectedRace && raceTab === 'search' && selectedRace.traits && (
          <div className="bg-amber-950/60 border border-amber-800/20 rounded-lg p-3 mb-5 max-h-28 overflow-y-auto">
            <div className="text-[9px] uppercase tracking-widest text-amber-600/60 mb-1">Race traits → Features & Traits</div>
            <p className="text-xs text-amber-300/60 whitespace-pre-wrap">{preview.features?.slice(0, 300)}{(preview.features?.length ?? 0) > 300 ? '…' : ''}</p>
          </div>
        )}

        <div className="flex justify-between">
          <button onClick={() => setStep('class')} className="text-amber-700/50 hover:text-amber-500 text-sm">← Back</button>
          <button
            onClick={() => onComplete(buildCharacter())}
            className="px-6 py-2.5 bg-amber-600/70 hover:bg-amber-500/80 text-amber-50 rounded-lg text-sm font-bold transition-colors"
          >
            Create Character ✦
          </button>
        </div>
      </Card>
    </WizardShell>
  )
}
