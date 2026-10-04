import { useEffect, useState } from 'react'
import type { ClassOption } from '../../data/creator2014'
import { CLASS_PITCH, COMPLEXITY_STYLE } from '../../data/creatorPitches'
import { fetchClassProgression, type ClassFeatureDesc } from '../../data/fiveEtoolsProgression'
import { themeForClass } from '../../data/classThemes'
import { ABILITY_LABELS } from '../../utils'
import { Badge, FixedRow, LoadState, ModeToggle, PickerLayout, SectionLabel } from './ui'

interface Props {
  classes: ClassOption[]
  loading: boolean
  error: string | null
  onRetry: () => void
  mode: 'list' | 'custom'
  onMode: (m: 'list' | 'custom') => void
  className: string | null
  onPick: (name: string) => void
  customClass: string
  onCustomClass: (v: string) => void
  customHitDie: number
  onCustomHitDie: (v: number) => void
}

function ClassCard({ cls }: { cls: ClassOption }) {
  const pitch = CLASS_PITCH[cls.name]
  return (
    <>
      <div className="flex items-center gap-1.5 font-bold text-amber-100">
        <span>{themeForClass(cls.name).glyph}</span>{cls.name}
      </div>
      <p className="text-xs text-amber-400/70 mt-0.5 line-clamp-2">{pitch?.tagline}</p>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {pitch && <Badge className={COMPLEXITY_STYLE[pitch.complexity]}>{pitch.complexity}</Badge>}
        <Badge>d{cls.hitDie} hit die</Badge>
        {cls.spellcastingAbility && <Badge className="bg-purple-900/30 text-purple-300/90 border-purple-800/40">Spellcaster</Badge>}
      </div>
    </>
  )
}

/** Level-1 features, fetched lazily from the class progression data. */
function Level1Features({ className }: { className: string }) {
  const [features, setFeatures] = useState<ClassFeatureDesc[] | null>(null)
  useEffect(() => {
    let alive = true
    setFeatures(null)
    fetchClassProgression(className, '2014')
      .then(d => {
        if (!alive || !d) return
        setFeatures(d.levels[0].features.map(n => d.featureMap.get(`${n}|1`) ?? { name: n, level: 1, description: '' }))
      })
      .catch(() => alive && setFeatures([]))
    return () => { alive = false }
  }, [className])

  if (!features) return <p className="text-xs text-amber-600/70 animate-pulse">Loading level 1 features…</p>
  if (features.length === 0) return <p className="text-xs text-amber-600/70">Couldn't load features — see the Class tab after creating.</p>
  return (
    <div className="space-y-1">
      {features.map(f => (
        <details key={f.name} className="rounded-lg border border-amber-900/50 bg-amber-950/40 px-2.5 py-1.5">
          <summary className="text-sm font-semibold text-amber-200 cursor-pointer">{f.name}</summary>
          <p className="text-xs text-amber-300/70 whitespace-pre-wrap leading-relaxed mt-1">{f.description || 'No description available.'}</p>
        </details>
      ))}
    </div>
  )
}

function ClassDetail({ cls }: { cls: ClassOption }) {
  const pitch = CLASS_PITCH[cls.name]
  const g = cls.grants
  const skillChoice = g.choices.find(c => c.kind === 'skill')
  const toolChoices = g.choices.filter(c => c.kind === 'tool')
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-amber-100 flex items-center gap-2">{themeForClass(cls.name).glyph} {cls.name}</h3>
        {pitch && (
          <>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge className={COMPLEXITY_STYLE[pitch.complexity]}>{pitch.complexity} to play</Badge>
              <Badge>Key abilities: {pitch.keyAbilities}</Badge>
            </div>
            <p className="text-sm text-amber-300/80 mt-2">{pitch.tagline}</p>
            <p className="text-xs text-amber-400/70 mt-1">{pitch.playstyle}</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-amber-950/50 border border-amber-900/50 p-2">
          <div className="text-amber-600/80 text-[10px] uppercase tracking-widest">Hit points at level 1</div>
          <div className="text-amber-200 mt-0.5">{cls.hitDie} + your CON modifier</div>
        </div>
        <div className="rounded-lg bg-amber-950/50 border border-amber-900/50 p-2">
          <div className="text-amber-600/80 text-[10px] uppercase tracking-widest">Spellcasting</div>
          <div className="text-amber-200 mt-0.5">{cls.spellcastingAbility ? ABILITY_LABELS[cls.spellcastingAbility] : 'None'}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <SectionLabel>Proficiencies</SectionLabel>
        <FixedRow label="Saving throws" items={cls.saves.map(s => ABILITY_LABELS[s])} />
        <FixedRow label="Armor" items={g.armor} />
        <FixedRow label="Weapons" items={g.weapons} />
        <FixedRow label="Tools" items={g.tools} />
        {toolChoices.map(c => <p key={c.id} className="text-xs text-amber-300/80">✦ Tools: {c.label}</p>)}
        {skillChoice && (
          <p className="text-xs text-amber-300/80">
            ✦ Skills: {skillChoice.label.toLowerCase()} from{' '}
            <span className="text-amber-400/70">{skillChoice.options.length === 18 ? 'any skill' : skillChoice.options.join(', ')}</span>
          </p>
        )}
      </div>

      <div>
        <SectionLabel>What you get at level 1</SectionLabel>
        <Level1Features className={cls.name} />
      </div>

      {cls.equipment.length > 0 && (
        <div>
          <SectionLabel>Starting equipment</SectionLabel>
          <p className="text-xs text-amber-300/70">{cls.equipment.map(i => i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name).join(', ')}</p>
        </div>
      )}
    </div>
  )
}

export default function ClassStep(p: Props) {
  return (
    <>
      <ModeToggle mode={p.mode} onChange={p.onMode} />
      {p.mode === 'custom' ? (
        <div className="max-w-md space-y-3">
          <div>
            <SectionLabel>Class name</SectionLabel>
            <input
              autoFocus
              value={p.customClass}
              onChange={e => p.onCustomClass(e.target.value)}
              placeholder="e.g. Blood Hunter, Artificer…"
              className="w-full bg-amber-950/50 border border-amber-800/40 rounded-lg px-3 py-2 text-sm text-amber-100 placeholder-amber-700/40 focus:border-amber-600 focus:outline-none"
            />
          </div>
          <div>
            <SectionLabel>Hit die</SectionLabel>
            <div className="flex gap-1.5">
              {[6, 8, 10, 12].map(d => (
                <button
                  key={d}
                  onClick={() => p.onCustomHitDie(d)}
                  className={`px-3 py-1 rounded-lg border text-sm font-bold ${
                    p.customHitDie === d ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-500/70'
                  }`}
                >d{d}</button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <LoadState loading={p.loading} error={p.error} onRetry={p.onRetry} what="classes" />
          {!p.loading && !p.error && (
            <PickerLayout
              items={p.classes}
              getKey={c => c.name}
              selectedKey={p.className}
              onSelect={p.onPick}
              renderCard={c => <ClassCard cls={c} />}
              renderDetail={c => <ClassDetail cls={c} />}
              chooseLabel={c => `Choose ${c.name}`}
              emptyDetail={<p className="text-sm text-amber-600/70 text-center py-16">Click a class to read about it.</p>}
            />
          )}
        </>
      )}
    </>
  )
}
