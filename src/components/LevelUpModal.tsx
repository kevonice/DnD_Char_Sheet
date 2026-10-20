// "Level up" on the sheet: walks one level (L → L+1) for 2014 PHB classes and
// asks only about what changes at that level. Reuses the creator's pickers.

import { useEffect, useState } from 'react'
import type { AbilityScores, Character, ClassOptionPick, PassiveTrait, ProficiencyEntry, Spell } from '../types'
import { v4 as uuid } from '../uuid'
import { ABILITY_KEYS, ALL_SKILLS, modifier } from '../utils'
import {
  averageHitDieRoll, casterInfo, fetchClassLevelData, fetchClassSpellOptions, hpBonusPerLevel, spellsByName,
  subclassPreparedNames, unarmoredAC, type ClassLevelData, type SpellOption,
} from '../data/creatorLevels'
import {
  asiBonus, asiComplete, checkPrereq, emptyAsi, expertiseAllowsThievesTools, expertiseCountAt, fetchFeats,
  fetchOptionalFeatures, optionSlotsAt, rangerSlotsAt,
  type AsiChoice, type FeatOption, type OptionalFeature, type OptionSlot, type PrereqContext,
} from '../data/classOptions'
import { featuresGainedAt } from '../data/creatorBuild'
import { rescaleFeatures } from '../data/featureMetadata'
import { AsiPicker, ExpertisePicker, OptionPicker, SectionNote } from './creator/ChoicePickers'
import { SpellList } from './creator/SpellStep'
import LevelsStep from './creator/LevelsStep'

const PHB_CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
const ORD = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
const plus = (a: AbilityScores, b: Record<string, number>) =>
  Object.fromEntries(ABILITY_KEYS.map(k => [k, a[k] + (b[k] ?? 0)])) as unknown as AbilityScores

interface Props {
  char: Character
  onApply: (updates: Partial<Character>) => void
  onClose: () => void
}

export default function LevelUpModal({ char, onApply, onClose }: Props) {
  const className = PHB_CLASSES.find(c => c.toLowerCase() === char.class.trim().toLowerCase()) ?? null
  const L = char.level
  const N = Math.min(20, L + 1)
  const die = Number(char.maxHitDice.match(/d(\d+)/)?.[1] ?? char.hitDice.match(/d(\d+)/)?.[1] ?? 8)

  const [data, setData] = useState<ClassLevelData | null>(null)
  const [hpMethod, setHpMethod] = useState<'average' | 'roll'>('average')
  const [roll, setRoll] = useState<number | null>(null)
  const [subclass, setSubclass] = useState<string | null>(null)
  const [asi, setAsi] = useState<AsiChoice>(emptyAsi())
  const [feats, setFeats] = useState<FeatOption[] | null>(null)
  const [opts, setOpts] = useState<OptionalFeature[] | null>(null)
  const [optionPicks, setOptionPicks] = useState<Record<string, string[]>>({})
  const [expertise, setExpertise] = useState<string[]>([])
  const [spellOpts, setSpellOpts] = useState<SpellOption[] | null>(null)
  const [newCantrips, setNewCantrips] = useState<string[]>([])
  const [newSpells, setNewSpells] = useState<string[]>([])
  const [preview, setPreview] = useState<string[] | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (className) fetchClassLevelData(className).then(setData).catch(() => {})
  }, [className])

  // ── Subclass & ASI ────────────────────────────────────────────────────────
  const needsSubclass = !!data && N >= data.subclassLevel && !char.subclass.trim()
  const subName = char.subclass.trim() || subclass || ''
  const subObj = data?.subclasses.find(s => s.name === subName) ?? null
  const isAsi = !!data?.asiLevels.includes(N)
  useEffect(() => {
    if (isAsi && !feats) fetchFeats().then(setFeats).catch(() => {})
  }, [isAsi, feats])
  const asiFeat = asi.mode === 'feat' ? feats?.find(f => f.key === asi.feat) ?? null : null
  const abilities = isAsi ? plus(char.abilities, asiBonus([asi], feats ?? [])) : char.abilities

  // ── Hit points (CON and per-level bonuses apply retroactively) ─────────────
  const oldFeats = (char.feats ?? []).map(f => f.name)
  const oldMod = modifier(char.abilities.con)
  const newMod = modifier(abilities.con)
  const oldPer = hpBonusPerLevel(char.race, char.subclass, oldFeats)
  const newPer = hpBonusPerLevel(char.race, subName, [...oldFeats, ...(asiFeat ? [asiFeat.name] : [])])
  const dieGain = hpMethod === 'average' ? averageHitDieRoll(die) : roll
  const hpGain = dieGain == null ? null : Math.max(1, dieGain + newMod) + newPer + (newMod - oldMod + newPer - oldPer) * L

  // ── Spells ────────────────────────────────────────────────────────────────
  const infoOld = data ? casterInfo(data, L, char.abilities) : null
  const infoNew = data ? casterInfo(data, N, abilities) : null
  const cantripGain = infoOld && infoNew ? Math.max(0, infoNew.cantrips - infoOld.cantrips) : 0
  const spellGain = !infoOld || !infoNew ? 0
    : infoNew.mode === 'known' ? Math.max(0, infoNew.spells - infoOld.spells)
    : infoNew.mode === 'spellbook' ? 2 : 0
  const known = new Set(char.spells.map(s => s.name.toLowerCase()))
  const maxSpell = infoNew?.maxSpellLevel ?? 0
  useEffect(() => {
    if (!className || (cantripGain === 0 && spellGain === 0)) return
    let alive = true
    fetchClassSpellOptions(className, maxSpell, subObj).then(o => alive && setSpellOpts(o)).catch(() => {})
    return () => { alive = false }
  }, [className, cantripGain, spellGain, maxSpell, subObj])
  const fresh = (spellOpts ?? []).filter(o => !known.has(o.name.toLowerCase()))
  const cantripOpts = fresh.filter(o => o.level === 0)
  const spellOptsLevelled = fresh.filter(o => o.level > 0)
  const newDomainSpells = subclassPreparedNames(subObj, N)
    .filter(n => !known.has(n) && !(char.subclass === subName && subclassPreparedNames(subObj, L).includes(n)))

  // ── Class options (Metamagic, Invocations, Pact Boon, Fighting Style, Ranger) ──
  const owned = char.classOptions ?? []
  const classSlots: OptionSlot[] = data ? optionSlotsAt(data.optionalFeatureProgression, N) : []
  useEffect(() => {
    if (classSlots.length && !opts) fetchOptionalFeatures().then(setOpts).catch(() => {})
  }, [classSlots.length, opts])
  const ownedFor = (s: OptionSlot) => owned.filter(o => s.featureTypes.includes(o.featureType))
  const slotNeeds = [
    ...classSlots.map(slot => ({ slot, options: opts ?? [] })),
    ...(className ? rangerSlotsAt(className, N) : []),
  ]
    .map(x => ({ ...x, need: Math.max(0, x.slot.count - ownedFor(x.slot).length) }))
    .filter(x => x.need > 0)
    .sort((a, b) => Number(b.slot.featureTypes.includes('PB')) - Number(a.slot.featureTypes.includes('PB')))
  const ownedPact = owned.find(o => o.featureType === 'PB')?.name ?? (optionPicks['Pact Boon'] ?? [])[0]?.split('|')[0]
  const ctx: PrereqContext = {
    className: className ?? char.class, level: N, subclass: subName,
    pact: ownedPact ? ownedPact.replace(/^Pact of the /, '') : null,
    spells: [...known, ...fresh.filter(o => [...newCantrips, ...newSpells].includes(o.key)).map(o => o.name.toLowerCase())],
  }
  const ownedKeys = owned.map(o => `${o.name}|${o.source}`)
  const eligible = (s: OptionSlot, options: OptionalFeature[]) => options.filter(o =>
    o.featureTypes.some(t => s.featureTypes.includes(t)) && !ownedKeys.includes(o.key) && checkPrereq(o.prerequisite, ctx).ok)
  const validOptions = (s: OptionSlot, options: OptionalFeature[], need: number) =>
    (optionPicks[s.name] ?? []).filter(k => eligible(s, options).some(o => o.key === k)).slice(0, need)

  // ── Expertise ─────────────────────────────────────────────────────────────
  const expertiseNeed = className ? expertiseCountAt(className, N) - expertiseCountAt(className, L) : 0
  const expertiseOptions = [
    ...ALL_SKILLS.filter(s => char.skills[s]?.proficient),
    ...(className && expertiseAllowsThievesTools(className) && char.proficiencyList.some(p => /thieves/i.test(p.name)) ? ["Thieves' tools"] : []),
  ]
  const expertiseAlready = [
    ...ALL_SKILLS.filter(s => char.skills[s]?.expertise),
    ...(char.passiveTraits.some(t => t.name === "Expertise: Thieves' tools") ? ["Thieves' tools"] : []),
  ]
  const expertiseValid = expertise.filter(x => expertiseOptions.includes(x) && !expertiseAlready.includes(x)).slice(0, expertiseNeed)
  const expertiseTarget = Math.min(expertiseNeed, expertiseOptions.length - expertiseAlready.length)

  // ── New features preview ──────────────────────────────────────────────────
  useEffect(() => {
    if (!className) return
    let alive = true
    featuresGainedAt(className, subName, N, { ...char, level: N })
      .then(g => alive && setPreview(g.names)).catch(() => alive && setPreview([]))
    return () => { alive = false }
  }, [className, subName, N, char])

  const done = {
    hp: hpGain != null,
    subclass: !needsSubclass || !!subclass,
    asi: !isAsi || asiComplete(asi, feats ?? []),
    options: slotNeeds.every(({ slot, options, need }) =>
      (options.length > 0 || classSlots.length === 0) && validOptions(slot, options, need).length >= Math.min(need, eligible(slot, options).length)),
    expertise: expertiseValid.length >= expertiseTarget,
    spells: (cantripGain === 0 && spellGain === 0) || (!!spellOpts
      && newCantrips.length >= Math.min(cantripGain, cantripOpts.length)
      && newSpells.length >= Math.min(spellGain, spellOptsLevelled.length)),
  }
  const ready = Object.values(done).every(Boolean) && !!className === !!data

  async function apply() {
    setApplying(true)
    try {
      const after: Character = { ...char, level: N, abilities, subclass: subName }
      const gained = className ? await featuresGainedAt(className, subName, N, after).catch(() => null) : null
      const traits: PassiveTrait[] = [...char.passiveTraits, ...(gained?.passive ?? [])]
      const activeFeatures = rescaleFeatures([...char.activeFeatures, ...(gained?.active ?? [])], after, className ?? undefined)

      const classOptions: ClassOptionPick[] = [...owned]
      for (const { slot, options, need } of slotNeeds) {
        for (const key of validOptions(slot, options, need)) {
          const o = options.find(x => x.key === key)!
          const isRanger = o.featureTypes[0] === 'RFE' || o.featureTypes[0] === 'RNE'
          classOptions.push({ featureType: o.featureTypes.find(t => slot.featureTypes.includes(t)) ?? o.featureTypes[0], name: o.name, source: o.source, cost: o.cost })
          traits.push({ id: uuid(), name: isRanger ? `${slot.name.replace(/ \(.*\)$/, '')}: ${o.name}` : o.name, description: o.description })
        }
      }

      const savingThrows = { ...char.savingThrows }
      const proficiencyList: ProficiencyEntry[] = [...char.proficiencyList]
      const featsList = [...(char.feats ?? [])]
      if (asiFeat) {
        featsList.push({ name: asiFeat.name, source: asiFeat.source })
        traits.push({ id: uuid(), name: asiFeat.name, description: asiFeat.description })
        if (asiFeat.saveFollowsChoice && asi.featAbility) savingThrows[asi.featAbility] = true
        for (const a of asiFeat.armor) if (!proficiencyList.some(p => p.name === a)) proficiencyList.push({ id: uuid(), name: a, category: 'armor' })
      }

      const skills = { ...char.skills }
      for (const x of expertiseValid) {
        if (skills[x]) skills[x] = { proficient: true, expertise: true }
        else traits.push({ id: uuid(), name: `Expertise: ${x}`, description: `Double your proficiency bonus for ability checks using ${x}.` })
      }

      const toSheet = ({ key: _k, tag: _t, ...s }: SpellOption | (Spell & { key?: string; tag?: string }), prepared: boolean): Spell => ({ ...s, id: uuid(), prepared })
      let domain: Spell[] = []
      try { domain = newDomainSpells.length ? await spellsByName(newDomainSpells) : [] } catch { /* skip */ }
      const spells = [
        ...char.spells,
        ...fresh.filter(o => newCantrips.includes(o.key)).map(o => toSheet(o, true)),
        ...fresh.filter(o => newSpells.includes(o.key)).map(o => toSheet(o, infoNew?.mode !== 'spellbook')),
        ...domain.map(s => toSheet(s, true)),
      ]

      const spellSlots = { ...char.spellSlots }
      if (infoNew && infoNew.maxSpellLevel > 0) {
        for (let l = 1; l <= 9; l++) {
          const cur = char.spellSlots[l] ?? { max: 0, used: 0 }
          spellSlots[l] = { ...cur, max: infoNew.slots[l]?.max ?? 0, used: Math.min(cur.used, (infoNew.slots[l]?.max ?? 0) + (cur.bonus ?? 0)) }
        }
      }

      const remaining = Number(char.hitDice.match(/^(\d+)/)?.[1] ?? L)
      const oldAC = unarmoredAC(char.class, char.subclass, char.abilities)
      onApply({
        level: N,
        subclass: subName,
        abilities,
        maxHp: char.maxHp + (hpGain ?? 0),
        currentHp: char.currentHp + (hpGain ?? 0),
        hitDice: `${Math.min(N, remaining + 1)}d${die}`,
        maxHitDice: `${N}d${die}`,
        // Only follow the unarmored formula if the player hasn't set their AC by hand.
        ...(char.ac === oldAC ? { ac: unarmoredAC(char.class, subName, abilities) } : {}),
        activeFeatures, passiveTraits: traits, classOptions, feats: featsList,
        savingThrows, proficiencyList, skills, spells, spellSlots,
      })
      onClose()
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-start justify-center overflow-y-auto p-3 md:p-8" onClick={onClose}>
      <div className="w-full max-w-4xl bg-[#1b1408] border border-amber-700/50 rounded-2xl p-4 md:p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-amber-100">Level up: {char.class || 'Character'} {L} → {N}</h2>
            <p className="text-sm text-amber-500/80">Only what changes at level {N} is asked here. Everything stays editable on the sheet.</p>
          </div>
          <button onClick={onClose} className="text-amber-600 hover:text-amber-300 text-xl">✕</button>
        </div>

        {!className && (
          <SectionNote>“{char.class || 'No class'}” isn't one of the Player's Handbook classes, so only hit points can be handled here. Add new features on the sheet by hand.</SectionNote>
        )}
        {className && !data && <p className="text-amber-600/70 text-sm animate-pulse">Loading {className} data…</p>}

        {/* Hit points */}
        <section className={`rounded-xl border p-3 md:p-4 ${done.hp ? 'border-green-800/40 bg-green-950/10' : 'border-amber-500/50 bg-amber-900/10'}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-amber-100">Hit points</span>
            {hpGain != null && <span className="text-sm text-green-400 font-bold">+{hpGain} → {char.maxHp + hpGain} max</span>}
          </div>
          <p className="text-xs text-amber-400/70 mb-2">
            d{die} {fmt(newMod)} CON{newPer ? ` ${fmt(newPer)} per level` : ''}. Take the average or roll if your DM allows it.
            {newMod !== oldMod && <> Your CON modifier changed, so every earlier level gains {fmt(newMod - oldMod)} too.</>}
          </p>
          <div className="flex gap-1.5 items-center">
            {(['average', 'roll'] as const).map(m => (
              <button key={m} onClick={() => setHpMethod(m)}
                className={`px-3 py-1 rounded-lg border text-sm font-bold ${hpMethod === m ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-500/70'}`}>
                {m === 'average' ? `Average (${averageHitDieRoll(die)})` : 'Roll'}
              </button>
            ))}
            {hpMethod === 'roll' && (
              <button onClick={() => setRoll(1 + Math.floor(Math.random() * die))} className="px-3 py-1 rounded-lg bg-amber-700/50 text-amber-100 text-sm font-bold">
                🎲 {roll == null ? `Roll d${die}` : `Rolled ${roll} (reroll)`}
              </button>
            )}
          </div>
        </section>

        {needsSubclass && data && className && (
          <LevelsStep className={className} level={N} hitDie={die} con={abilities.con} data={data}
            subclassName={subclass} onSubclass={setSubclass} customSubclass="" onCustomSubclass={() => {}}
            hpMethod="average" onHpMethod={() => {}} hpRolls={[]} onHpRolls={() => {}} showHp={false} />
        )}

        {isAsi && (
          <AsiPicker title={`Level ${N}: Ability Score Improvement`} choice={asi} onChange={setAsi}
            scores={char.abilities} feats={feats}
            featCtx={{ abilities: char.abilities, race: char.race, spellcaster: !!char.spellcastingAbility, armor: char.proficiencyList.filter(p => p.category === 'armor').map(p => p.name) }}
            takenFeats={(char.feats ?? []).map(f => `${f.name}|${f.source}`)} />
        )}

        {infoOld && infoNew && infoNew.maxSpellLevel > 0 && (
          <SectionNote>
            Spell slots at level {N}: {Object.entries(infoNew.slots).filter(([, s]) => s.max).map(([l, s]) => `${s.max}× ${ORD[Number(l)]}`).join(', ')}.
            {infoNew.mode === 'prepared' && <> You can now prepare <b>{infoNew.spells}</b> spells{infoOld.mode === 'prepared' ? ` (was ${infoOld.spells})` : ''}: change them on the Spells tab after a long rest.</>}
            {infoNew.mode === 'known' && <> Known casters may also swap one known spell for another when they level up: do that on the Spells tab.</>}
            {newDomainSpells.length > 0 && <> New always-prepared spells: {newDomainSpells.map(n => n.replace(/\b\w/g, c => c.toUpperCase())).join(', ')}.</>}
          </SectionNote>
        )}
        {(cantripGain > 0 || spellGain > 0) && !spellOpts && <p className="text-amber-600/70 text-sm animate-pulse">Loading spells…</p>}
        {cantripGain > 0 && spellOpts && (
          <SpellList title="New cantrips" hint={`You learn ${cantripGain} new cantrip${cantripGain > 1 ? 's' : ''}.`}
            count={Math.min(cantripGain, cantripOpts.length)} options={cantripOpts} picked={newCantrips} onChange={setNewCantrips} />
        )}
        {spellGain > 0 && spellOpts && (
          <SpellList title={infoNew?.mode === 'spellbook' ? 'New spellbook spells' : 'New spells known'}
            hint={infoNew?.mode === 'spellbook' ? 'Wizards add two spells to their spellbook each level.' : `You learn ${spellGain} new spell${spellGain > 1 ? 's' : ''}, up to ${ORD[maxSpell]} level.`}
            count={Math.min(spellGain, spellOptsLevelled.length)} options={spellOptsLevelled} picked={newSpells} onChange={setNewSpells} />
        )}

        {classSlots.length > 0 && !opts && <p className="text-amber-600/70 text-sm animate-pulse">Loading class options…</p>}
        {slotNeeds.map(({ slot, options, need }) => (
          <OptionPicker key={slot.name} slot={slot} need={Math.min(need, eligible(slot, options).length)}
            options={options.filter(o => !ownedKeys.includes(o.key) || ownedFor(slot).some(p => `${p.name}|${p.source}` === o.key))}
            picked={validOptions(slot, options, need)} owned={ownedFor(slot).map(p => `${p.name}|${p.source}`)} ctx={ctx}
            onChange={keys => setOptionPicks(p => ({ ...p, [slot.name]: keys }))}
            intro={ownedFor(slot).length > 0
              ? `You have ${ownedFor(slot).length}; at level ${N} you get ${slot.count}. Choose ${need} more.`
              : `At level ${N} you have ${slot.count}. Choose ${need}.`} />
        ))}

        {expertiseNeed > 0 && (
          <ExpertisePicker need={expertiseTarget} proficient={expertiseOptions} already={expertiseAlready} picked={expertiseValid} onChange={setExpertise} />
        )}

        {preview && preview.length > 0 && (
          <SectionNote>New at level {N}: {preview.join(', ')}. Trackable ones (like Sorcery Points or Action Surge) are added to your features, and existing trackers grow to their new maximums.</SectionNote>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-amber-900/50">
          <button onClick={onClose} className="text-amber-600/80 hover:text-amber-300 text-sm">Cancel</button>
          <div className="flex items-center gap-3">
            {!ready && <span className="text-[11px] text-amber-600/80">Finish the highlighted sections</span>}
            <button onClick={apply} disabled={!ready || applying}
              className="px-5 py-2 bg-amber-600/70 hover:bg-amber-500/80 disabled:opacity-30 text-amber-50 rounded-lg text-sm font-bold">
              {applying ? 'Applying…' : `Apply level ${N} ✦`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
