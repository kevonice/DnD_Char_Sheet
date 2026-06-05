import { useState, useEffect, useRef } from 'react'
import type { Character, AbilityKey } from './types'
import { v4 as uuid } from './uuid'
import { makeDefaultCharacter } from './defaultCharacter'
import { proficiencyBonus, passivePerception, weaponAttack, takeShortRest, takeLongRest } from './utils'
import SectionHeader from './components/SectionHeader'
import AbilityBlock from './components/AbilityBlock'
import SkillList from './components/SkillList'
import SavingThrows from './components/SavingThrows'
import CombatStats from './components/CombatStats'
import AttacksPanel from './components/AttacksPanel'
import SpellsPanel from './components/SpellsPanel'
import InventoryPanel from './components/InventoryPanel'
import CurrencyTracker from './components/CurrencyTracker'
import ConditionsTracker from './components/ConditionsTracker'
import CharacterCreator from './components/CharacterCreator'
import FeaturesPanel from './components/FeaturesPanel'
import PortraitUploader from './components/PortraitUploader'
import ClassTab from './components/ClassTab'
import NotesTab from './components/NotesTab'
import AppearancePanel, { overrideToTheme } from './components/AppearancePanel'
import { themeForClassAndSubclass, themeVars, bgVars, DEFAULT_THEME } from './data/classThemes'

const STORAGE_KEY    = 'dnd5e_character'
const CREATED_KEY    = 'dnd5e_created'   // flag: has user completed wizard or chosen manual?

function loadCharacter(): Character {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const merged: Character = { ...makeDefaultCharacter(), ...parsed }
      // Migrate old freeform features string → first PassiveTrait entry
      if (!merged.passiveTraits?.length && merged.features) {
        merged.passiveTraits = [{ id: uuid(), name: 'Traits', description: merged.features }]
      }
      // Migrate old notes string → first NoteNode
      if (!merged.noteTree?.length && merged.notes) {
        merged.noteTree = [{ id: uuid(), title: 'Notes', content: merged.notes, children: [] }]
      }
      if (!merged.noteTree) merged.noteTree = []
      return merged
    }
  } catch {}
  return makeDefaultCharacter()
}

function TextArea({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number
}) {
  return (
    <div>
      {label && <label className="text-[9px] uppercase tracking-widest text-amber-600/60 block mb-1">{label}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-amber-950/40 border border-amber-800/30 rounded-lg px-2.5 py-1.5 text-sm text-amber-100 resize-none focus:border-amber-600/60 transition-colors placeholder-amber-800/40"
      />
    </div>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-amber-950/30 border border-amber-800/25 rounded-xl p-3 ${className}`}>
      {children}
    </div>
  )
}

type Tab = 'main' | 'spells' | 'backstory' | 'class' | 'notes'

export default function App() {
  const [char, setChar] = useState<Character>(loadCharacter)
  const [activeTab, setActiveTab] = useState<Tab>('main')
  const [showCreator, setShowCreator] = useState<boolean>(
    () => !localStorage.getItem(CREATED_KEY)
  )
  const [glyphOpen, setGlyphOpen] = useState(false)
  const glyphRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!glyphOpen) return
    function handleClick(e: MouseEvent) {
      if (glyphRef.current && !glyphRef.current.contains(e.target as Node)) setGlyphOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [glyphOpen])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(char))
  }, [char])

  function update(updates: Partial<Character>) {
    setChar(prev => ({ ...prev, ...updates }))
  }

  function handleCreatorComplete(updates: Partial<Character>) {
    setChar(prev => ({ ...prev, ...updates }))
    localStorage.setItem(CREATED_KEY, '1')
    setShowCreator(false)
  }

  function handleManual() {
    localStorage.setItem(CREATED_KEY, '1')
    setShowCreator(false)
  }

  function startNewCharacter() {
    if (!confirm('Start a new character? Your current sheet will be cleared.')) return
    const blank = makeDefaultCharacter()
    setChar(blank)
    localStorage.removeItem(CREATED_KEY)
    localStorage.removeItem(STORAGE_KEY)
    setShowCreator(true)
  }

  const pb = proficiencyBonus(char.level)
  const classTheme = themeForClassAndSubclass(char.class, char.subclass)
  const theme = char.appearanceOverride ? overrideToTheme(char.appearanceOverride) : classTheme

  // Background image stored separately — excluded from character JSON exports
  const BG_IMAGE_KEY = 'dnd5e_bgImage'
  const [bgImage, setBgImageState] = useState<string | null>(() => localStorage.getItem(BG_IMAGE_KEY))
  function setBgImage(img: string | null) {
    setBgImageState(img)
    if (img) localStorage.setItem(BG_IMAGE_KEY, img)
    else localStorage.removeItem(BG_IMAGE_KEY)
  }

  const bgGradient = char.appearanceOverride?.bgGradient ?? null
  const bgBlur     = char.appearanceOverride?.bgBlur     ?? 12
  const bgOverlay  = char.appearanceOverride?.bgOverlay  ?? 0.6
  const hasBg = bgImage || bgGradient

  const derivedAttacks = char.inventory
    .filter(it => it.category === 'weapon' && it.equipped)
    .map(it => weaponAttack(it, char))

  function toggleCondition(cond: string) {
    update({
      conditions: char.conditions.includes(cond)
        ? char.conditions.filter(c => c !== cond)
        : [...char.conditions, cond],
    })
  }

  function exportCharacter() {
    const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${char.name || 'character'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importCharacter(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        setChar({ ...makeDefaultCharacter(), ...parsed })
        localStorage.setItem(CREATED_KEY, '1')
        setShowCreator(false)
      } catch {
        alert('Could not read that file — make sure it\'s a valid character JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''   // reset so same file can be re-imported
  }

  if (showCreator) {
    return <CharacterCreator onComplete={handleCreatorComplete} onManual={handleManual} />
  }

  return (
    <div
      className="min-h-screen text-amber-100 font-sans relative"
      style={{
        ...themeVars(theme),
        ...(char.appearanceOverride?.bgHex ? bgVars(char.appearanceOverride.bgHex) : {}),
        backgroundColor: char.appearanceOverride?.bgHex
          ? char.appearanceOverride.bgHex
          : theme === DEFAULT_THEME
            ? '#130e06'
            : `oklch(15% ${(0.04 * theme.chroma).toFixed(3)} ${theme.hue})`,
      }}
    >
      {/* ── Background image / gradient layer ── */}
      {hasBg && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 0,
              backgroundImage: bgImage ? `url(${bgImage})` : bgGradient!,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: `blur(${bgBlur}px)`,
              transform: 'scale(1.08)',
            }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1, backgroundColor: `rgba(0,0,0,${bgOverlay})` }} />
        </>
      )}

      {/* All content sits above the background layers */}
      <div style={{ position: 'relative', zIndex: 2 }}>

      {/* ── Banner header ── */}
      <header
        className="border-b px-6 py-4 transition-colors"
        style={{
          borderColor: theme.accentSoft,
          background: `linear-gradient(to bottom, ${theme.accentSoft}, rgba(20,14,6,0.4))`,
        }}
      >
        <div className="max-w-[1400px] mx-auto space-y-2">
          {/* Character name row */}
          <div className="flex items-center gap-4">
            <div className="rounded-xl" style={{ boxShadow: `0 0 0 2px ${theme.accent}` }}>
              <PortraitUploader
                portrait={char.portrait}
                characterName={char.name}
                onChange={portrait => update({ portrait })}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div ref={glyphRef} className="relative flex-shrink-0">
                  <button
                    title="Change icon"
                    onClick={() => setGlyphOpen(o => !o)}
                    className="text-2xl leading-none hover:scale-110 transition-transform p-1 cursor-pointer select-none"
                  >
                    {theme.glyph}
                  </button>
                  {glyphOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 z-50 bg-amber-950 border border-amber-700/40 rounded-xl p-2 shadow-2xl"
                      style={{ width: 220 }}
                    >
                      <p className="text-[9px] uppercase tracking-widest text-amber-600/60 mb-1.5 px-1">Choose icon</p>
                      <div className="grid grid-cols-7 gap-0.5">
                        {[
                          '⚔️','🛡️','🏹','🪄','📖','🔮','🎵',
                          '🐉','💀','🌙','☀️','🔥','❄️','⚡',
                          '🌿','🐾','🗡️','🪓','🔱','⚜️','🏺',
                          '🎲','🃏','🎭','🧿','💎','🌊','🌑',
                          '🦅','🐺','🦁','🐍','🕷️','🦇','🦉',
                          '⚗️','🧪','📜','🗺️','🧭','🔔','🕯️',
                          '👁️','💫','✨','🌟','🌈','🩸','🎨',
                        ].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              const base = char.appearanceOverride ?? {
                                hue: classTheme.hue,
                                chroma: classTheme.chroma,
                                accent: classTheme.accent,
                              }
                              update({ appearanceOverride: { ...base, glyph: emoji } })
                              setGlyphOpen(false)
                            }}
                            className={`text-xl p-1 rounded hover:bg-amber-800/40 transition-colors ${
                              theme.glyph === emoji ? 'bg-amber-800/60 ring-1 ring-amber-500/50' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (char.appearanceOverride) {
                            const { glyph: _g, ...rest } = char.appearanceOverride as any
                            update({ appearanceOverride: Object.keys(rest).length ? rest : null })
                          }
                          setGlyphOpen(false)
                        }}
                        className="mt-1.5 w-full text-[10px] text-amber-600/50 hover:text-amber-400 text-center"
                      >
                        Reset to class icon
                      </button>
                    </div>
                  )}
                </div>
                <input
                  value={char.name}
                  onChange={e => update({ name: e.target.value })}
                  placeholder="Character Name"
                  className="bg-transparent text-3xl font-bold text-amber-100 placeholder-amber-800/50 focus:outline-none border-b-2 w-full pb-0.5 transition-colors"
                  style={{ borderColor: theme.accentSoft }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => update({ inspiration: !char.inspiration })}
                title="Inspiration"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-widest transition-colors ${
                  char.inspiration
                    ? 'bg-amber-500/20 border-amber-500/80 text-amber-400'
                    : 'border-amber-800/40 text-amber-700/50 hover:border-amber-600/50 hover:text-amber-600'
                }`}
              >
                ★ Inspiration
              </button>
              {/* Appearance */}
              <AppearancePanel
                override={char.appearanceOverride}
                onChangeOverride={appearanceOverride => update({ appearanceOverride })}
                currentClassTheme={classTheme}
                bgImage={bgImage}
                onBgImage={setBgImage}
              />
              {/* Export */}
              <button
                onClick={exportCharacter}
                title="Export character as JSON"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-900/50 text-amber-700/40 hover:border-amber-700/50 hover:text-amber-500 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                ↓ Export
              </button>
              {/* Import */}
              <label
                title="Import character from JSON"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-900/50 text-amber-700/40 hover:border-amber-700/50 hover:text-amber-500 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
              >
                ↑ Import
                <input type="file" accept=".json,application/json" className="hidden" onChange={importCharacter} />
              </label>
              <button
                onClick={startNewCharacter}
                title="New character"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-900/50 text-amber-700/40 hover:border-amber-700/50 hover:text-amber-500 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                + New
              </button>
            </div>
          </div>

          {/* Subtitle identity row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {(
              [
                { field: 'class' as const,      placeholder: 'Class',       label: 'Class' },
                { field: 'subclass' as const,   placeholder: 'Subclass',    label: 'Subclass' },
                { field: 'race' as const,        placeholder: 'Race',        label: 'Race' },
                { field: 'background' as const, placeholder: 'Background',  label: 'Background' },
                { field: 'alignment' as const,  placeholder: 'Alignment',   label: 'Alignment' },
              ] as const
            ).map(({ field, placeholder, label }) => (
              <div key={field} className="flex flex-col">
                <input
                  value={char[field]}
                  onChange={e => update({ [field]: e.target.value })}
                  placeholder={placeholder}
                  className="bg-transparent text-amber-300/90 placeholder-amber-800/40 focus:outline-none border-b border-amber-800/30 focus:border-amber-600/50 text-sm min-w-[72px] pb-0.5 transition-colors"
                />
                <span className="text-[8px] uppercase tracking-widest text-amber-700/50 mt-0.5">{label}</span>
              </div>
            ))}

            <div className="flex flex-col">
              <input
                type="number" min={1} max={20}
                value={char.level}
                onChange={e => update({ level: Number(e.target.value) })}
                className="bg-transparent text-amber-300/90 focus:outline-none border-b border-amber-800/30 focus:border-amber-600/50 w-10 text-sm text-center pb-0.5 transition-colors"
              />
              <span className="text-[8px] uppercase tracking-widest text-amber-700/50 mt-0.5 text-center">Level</span>
            </div>

            <div className="flex flex-col">
              <input
                type="number"
                value={char.xp}
                onChange={e => update({ xp: Number(e.target.value) })}
                className="bg-transparent text-amber-300/90 focus:outline-none border-b border-amber-800/30 focus:border-amber-600/50 w-20 text-sm text-center pb-0.5 transition-colors"
              />
              <span className="text-[8px] uppercase tracking-widest text-amber-700/50 mt-0.5 text-center">Experience</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="border-b border-amber-800/25 bg-amber-950/30">
        <div className="max-w-[1400px] mx-auto flex">
          {(['main', 'spells', 'class', 'backstory', 'notes'] as Tab[]).map(tab => {
            const isActive = activeTab === tab
            const labels: Record<Tab, string> = { main: 'Character', spells: 'Spells', class: 'Class', backstory: 'Background', notes: 'Notes' }
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-7 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${
                  isActive ? '' : 'border-transparent text-amber-700/50 hover:text-amber-500/70'
                }`}
                style={isActive ? { borderColor: theme.accent, color: theme.accent } : undefined}
              >
                {labels[tab]}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Page content ── */}
      <main className="max-w-[1400px] mx-auto p-4">

        {/* ════ MAIN TAB ════ */}
        {activeTab === 'main' && (
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-4 items-start">

            {/* ─── LEFT: Stats column ─── */}
            <div className="space-y-4">

              <Panel>
                <SectionHeader title="Ability Scores" />
                <AbilityBlock
                  abilities={char.abilities}
                  onChange={(key, value) => update({ abilities: { ...char.abilities, [key]: value } })}
                />
              </Panel>

              <Panel>
                <SectionHeader title="Saving Throws" />
                <SavingThrows
                  abilities={char.abilities}
                  savingThrows={char.savingThrows}
                  level={char.level}
                  onChange={(key: AbilityKey, val: boolean) =>
                    update({ savingThrows: { ...char.savingThrows, [key]: val } })
                  }
                />
                <p className="text-[8px] text-amber-700/40 mt-1.5">Proficiency Bonus: +{pb}</p>
              </Panel>

              <Panel>
                <SectionHeader title="Skills" />
                <p className="text-[8px] text-amber-700/40 mb-2">Left dot = Expertise · Right dot = Proficiency</p>
                <SkillList
                  abilities={char.abilities}
                  skills={char.skills}
                  level={char.level}
                  onChange={(skill, entry) =>
                    update({ skills: { ...char.skills, [skill]: entry } })
                  }
                />
              </Panel>

              <div className="bg-amber-950/50 border border-amber-700/40 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-amber-600/70 block">Passive</span>
                  <span className="text-[9px] uppercase tracking-widest text-amber-600/70">Perception</span>
                </div>
                <span className="text-4xl font-bold text-amber-100">
                  {passivePerception(char.abilities, char.skills['Perception'], char.level)}
                </span>
              </div>

            </div>

            {/* ─── CENTRE: Action column ─── */}
            <div className="space-y-4">

              <Panel>
                <SectionHeader title="Combat" />
                <CombatStats char={char} onChange={update} />
              </Panel>

              {/* ─ Rest buttons ─ */}
              <div className="flex gap-2">
                <button
                  onClick={() => update(takeShortRest(char))}
                  className="flex-1 py-1.5 rounded-lg border border-amber-800/40 text-amber-400/70 hover:bg-amber-900/30 hover:border-amber-600/50 hover:text-amber-300 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  ⏾ Short Rest
                </button>
                <button
                  onClick={() => {
                    if (confirm('Take a long rest? This will restore HP, spell slots, and all long-rest features.')) {
                      update(takeLongRest(char))
                    }
                  }}
                  className="flex-1 py-1.5 rounded-lg border border-amber-800/40 text-amber-400/70 hover:bg-amber-900/30 hover:border-amber-600/50 hover:text-amber-300 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  ☽ Long Rest
                </button>
              </div>

              <Panel>
                <SectionHeader title="Conditions" />
                <ConditionsTracker
                  conditions={char.conditions}
                  exhaustion={char.exhaustion}
                  onToggle={toggleCondition}
                  onExhaustion={lvl => update({ exhaustion: lvl })}
                />
              </Panel>

              <Panel>
                <SectionHeader title="Attacks" />
                <AttacksPanel
                  attacks={char.attacks}
                  derived={derivedAttacks}
                  onChange={attacks => update({ attacks })}
                />
              </Panel>

            </div>

            {/* ─── RIGHT: Inventory & lore column ─── */}
            <div className="space-y-4">

              <Panel>
                <SectionHeader title="Inventory" />
                <InventoryPanel
                  inventory={char.inventory}
                  str={char.abilities.str}
                  onChange={inventory => update({ inventory })}
                />
              </Panel>

              <Panel>
                <SectionHeader title="Currency" />
                <CurrencyTracker
                  currency={char.currency}
                  onChange={currency => update({ currency })}
                />
              </Panel>

              <Panel>
                <SectionHeader title="Features & Traits" />
                <FeaturesPanel
                  activeFeatures={char.activeFeatures ?? []}
                  passiveTraits={char.passiveTraits ?? []}
                  backgroundFlavour={char.backgroundFlavour ?? ''}
                  onActiveChange={activeFeatures => update({ activeFeatures })}
                  onPassiveChange={passiveTraits => update({ passiveTraits })}
                  onBackgroundChange={backgroundFlavour => update({ backgroundFlavour })}
                />
              </Panel>

              <Panel>
                <SectionHeader title="Proficiencies & Languages" />
                <TextArea label="" value={char.proficiencies} onChange={v => update({ proficiencies: v })} rows={3} />
              </Panel>

            </div>
          </div>
        )}

        {/* ════ SPELLS TAB ════ */}
        {activeTab === 'spells' && (
          <SpellsPanel char={char} onChange={update} />
        )}

        {/* ════ CLASS TAB ════ */}
        {activeTab === 'class' && (
          <ClassTab className={char.class} subclass={char.subclass} />
        )}

        {/* ════ NOTES TAB ════ */}
        {activeTab === 'notes' && (
          <NotesTab noteTree={char.noteTree ?? []} onChange={noteTree => update({ noteTree })} />
        )}

        {/* ════ BACKGROUND TAB ════ */}
        {activeTab === 'backstory' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: character traits */}
            <div className="space-y-4">
              <Panel>
                <TextArea label="Personality Traits" value={char.personalityTraits} onChange={v => update({ personalityTraits: v })} rows={4} />
              </Panel>
              <Panel>
                <TextArea label="Ideals" value={char.ideals} onChange={v => update({ ideals: v })} rows={4} />
              </Panel>
              <Panel>
                <TextArea label="Bonds" value={char.bonds} onChange={v => update({ bonds: v })} rows={4} />
              </Panel>
              <Panel>
                <TextArea label="Flaws" value={char.flaws} onChange={v => update({ flaws: v })} rows={4} />
              </Panel>
            </div>

            {/* Right: backstory + growth */}
            <div className="space-y-4">
              <Panel className="flex flex-col">
                <TextArea
                  label="Backstory"
                  value={char.backstory}
                  onChange={v => update({ backstory: v })}
                  rows={14}
                />
              </Panel>
              <Panel>
                <div className="mb-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-amber-600/60 block">Character Revelations</label>
                  <p className="text-[9px] text-amber-700/40 mt-0.5">Things your character learns or discovers about themselves over the course of the campaign.</p>
                </div>
                <TextArea
                  label=""
                  value={char.characterGrowth}
                  onChange={v => update({ characterGrowth: v })}
                  rows={7}
                />
              </Panel>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-amber-900/30 mt-8 px-6 py-2 text-center text-[9px] text-amber-800/40 tracking-wide">
        Autosaved · {char.name || 'Unnamed'} · Level {char.level} {char.class || 'Adventurer'}
      </footer>

      </div>{/* end content z-index wrapper */}
    </div>
  )
}
