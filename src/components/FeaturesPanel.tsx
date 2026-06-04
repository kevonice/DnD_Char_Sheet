import { useState } from 'react'
import type { ActiveFeature, PassiveTrait, ActionType, RechargeType } from '../types'
import { v4 as uuid } from '../uuid'

interface Props {
  activeFeatures: ActiveFeature[]
  passiveTraits: PassiveTrait[]
  backgroundFlavour: string
  onActiveChange: (features: ActiveFeature[]) => void
  onPassiveChange: (traits: PassiveTrait[]) => void
  onBackgroundChange: (text: string) => void
}

// ── Pill button row ──────────────────────────────────────────────────────────

function PillGroup<T extends string>({ value, onChange, options }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; color: string }[]
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border transition-colors ${
            value === opt.value
              ? `${opt.color} border-transparent`
              : 'border-amber-800/30 text-amber-700/50 hover:text-amber-500'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const ACTION_OPTIONS: { value: ActionType; label: string; color: string }[] = [
  { value: 'action',   label: 'Action',       color: 'bg-red-700/40 text-red-300' },
  { value: 'bonus',    label: 'Bonus Action', color: 'bg-orange-700/40 text-orange-300' },
  { value: 'reaction', label: 'Reaction',     color: 'bg-blue-700/40 text-blue-300' },
  { value: 'special',  label: 'Special',      color: 'bg-purple-700/40 text-purple-300' },
]

const RECHARGE_OPTIONS: { value: RechargeType; label: string; color: string }[] = [
  { value: 'atwill', label: 'At Will',     color: 'bg-green-800/40 text-green-300' },
  { value: 'short',  label: 'Short Rest',  color: 'bg-amber-800/50 text-amber-300' },
  { value: 'long',   label: 'Long Rest',   color: 'bg-amber-900/60 text-amber-400' },
  { value: 'dawn',   label: 'Dawn',        color: 'bg-yellow-800/40 text-yellow-300' },
]

const ACTION_BADGE: Record<ActionType, string> = {
  action:   'bg-red-700/30 text-red-300 border-red-700/30',
  bonus:    'bg-orange-700/30 text-orange-300 border-orange-700/30',
  reaction: 'bg-blue-700/30 text-blue-300 border-blue-700/30',
  special:  'bg-purple-700/30 text-purple-300 border-purple-700/30',
}

const ACTION_LABEL: Record<ActionType, string> = {
  action: 'Action', bonus: 'Bonus', reaction: 'Reaction', special: 'Special',
}

// ── Collapsible section wrapper ───────────────────────────────────────────────

function Section({ title, subtitle, defaultOpen = true, children }: {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-amber-800/25 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-amber-950/50 hover:bg-amber-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-amber-600/70 rounded-full" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-amber-500/90">{title}</span>
          {subtitle && <span className="text-[9px] text-amber-700/50">{subtitle}</span>}
        </div>
        <span className="text-amber-700/50 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  )
}

// ── Active feature card ───────────────────────────────────────────────────────

function FeatureCard({ feature, onChange, onRemove }: {
  feature: ActiveFeature
  onChange: (f: ActiveFeature) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(!feature.name)

  function upd(patch: Partial<ActiveFeature>) {
    onChange({ ...feature, ...patch })
  }

  const isAtWill = feature.recharge === 'atwill' || feature.maxUses === 0

  return (
    <div className="bg-amber-950/40 border border-amber-800/25 rounded-lg">
      {/* Collapsed row */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {/* action badge */}
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${ACTION_BADGE[feature.actionType]}`}>
          {ACTION_LABEL[feature.actionType]}
        </span>

        {/* name */}
        <input
          value={feature.name}
          onChange={e => upd({ name: e.target.value })}
          placeholder="Feature name…"
          className="bg-transparent text-amber-100 text-sm flex-1 min-w-0 focus:outline-none placeholder-amber-800/40"
        />

        {/* uses pips */}
        {!isAtWill && feature.maxUses > 0 && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {Array.from({ length: Math.min(feature.maxUses, 10) }).map((_, i) => (
              <button
                key={i}
                title={i < feature.usesLeft ? 'Mark used' : 'Recover use'}
                onClick={() => upd({ usesLeft: feature.usesLeft === i + 1 ? i : i + 1 })}
                className={`w-3 h-3 rounded-full border transition-colors ${
                  i < feature.usesLeft
                    ? 'bg-amber-400 border-amber-400'
                    : 'border-amber-700/50 hover:border-amber-500'
                }`}
              />
            ))}
          </div>
        )}
        {isAtWill && (
          <span className="text-[9px] text-green-400/60 flex-shrink-0">At will</span>
        )}

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-amber-700/40 hover:text-amber-400 text-xs flex-shrink-0"
        >⋯</button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-amber-800/20 px-2.5 pb-2.5 pt-2 space-y-2.5">
          <div>
            <span className="text-[8px] uppercase tracking-widest text-amber-600/50 block mb-1">Action Type</span>
            <PillGroup value={feature.actionType} onChange={v => upd({ actionType: v })} options={ACTION_OPTIONS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[8px] uppercase tracking-widest text-amber-600/50 block mb-1">Max Uses</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0} max={20}
                  value={feature.maxUses}
                  onChange={e => {
                    const max = Number(e.target.value)
                    upd({ maxUses: max, usesLeft: Math.min(feature.usesLeft, max) })
                  }}
                  className="w-14 bg-amber-900/30 border border-amber-800/30 rounded px-2 py-1 text-xs text-amber-200 text-center focus:outline-none focus:border-amber-600"
                />
                <span className="text-[9px] text-amber-700/40">0 = at will</span>
              </div>
            </div>
            <div>
              <span className="text-[8px] uppercase tracking-widest text-amber-600/50 block mb-1">Recharge</span>
              <PillGroup value={feature.recharge} onChange={v => upd({ recharge: v })} options={RECHARGE_OPTIONS} />
            </div>
          </div>

          <div>
            <span className="text-[8px] uppercase tracking-widest text-amber-600/50 block mb-1">Description</span>
            <textarea
              value={feature.description}
              onChange={e => upd({ description: e.target.value })}
              placeholder="What does this feature do?"
              rows={3}
              className="w-full bg-transparent border border-amber-800/20 rounded px-2 py-1.5 text-xs text-amber-200/70 resize-none focus:outline-none focus:border-amber-700/50 placeholder-amber-800/40"
            />
          </div>

          <div className="flex justify-between items-center">
            {!isAtWill && feature.maxUses > 0 && (
              <button
                onClick={() => upd({ usesLeft: feature.maxUses })}
                className="text-[9px] text-amber-600/50 hover:text-amber-400 underline decoration-dotted"
              >
                Restore all uses
              </button>
            )}
            <button onClick={onRemove} className="text-red-500/50 hover:text-red-400 text-xs ml-auto">
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Passive trait card ────────────────────────────────────────────────────────

function TraitCard({ trait, onChange, onRemove }: {
  trait: PassiveTrait
  onChange: (t: PassiveTrait) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(!trait.name)

  return (
    <div className="bg-amber-950/40 border border-amber-800/25 rounded-lg">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-600/60 flex-shrink-0" />
        <input
          value={trait.name}
          onChange={e => onChange({ ...trait, name: e.target.value })}
          placeholder="Trait name…"
          className="bg-transparent text-amber-100 text-sm flex-1 min-w-0 focus:outline-none placeholder-amber-800/40"
        />
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-amber-700/40 hover:text-amber-400 text-xs flex-shrink-0"
        >⋯</button>
      </div>

      {expanded && (
        <div className="border-t border-amber-800/20 px-2.5 pb-2.5 pt-2 space-y-2">
          <textarea
            value={trait.description}
            onChange={e => onChange({ ...trait, description: e.target.value })}
            placeholder="Describe this trait…"
            rows={3}
            className="w-full bg-transparent border border-amber-800/20 rounded px-2 py-1.5 text-xs text-amber-200/70 resize-none focus:outline-none focus:border-amber-700/50 placeholder-amber-800/40"
          />
          <button onClick={onRemove} className="text-red-500/50 hover:text-red-400 text-xs">
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function FeaturesPanel({
  activeFeatures, passiveTraits, backgroundFlavour,
  onActiveChange, onPassiveChange, onBackgroundChange,
}: Props) {
  function addFeature() {
    onActiveChange([...activeFeatures, {
      id: uuid(), name: '', actionType: 'action',
      maxUses: 1, usesLeft: 1, recharge: 'long', description: '',
    }])
  }

  function updateFeature(id: string, f: ActiveFeature) {
    onActiveChange(activeFeatures.map(x => x.id === id ? f : x))
  }

  function removeFeature(id: string) {
    onActiveChange(activeFeatures.filter(x => x.id !== id))
  }

  function addTrait() {
    onPassiveChange([...passiveTraits, { id: uuid(), name: '', description: '' }])
  }

  function updateTrait(id: string, t: PassiveTrait) {
    onPassiveChange(passiveTraits.map(x => x.id === id ? t : x))
  }

  function removeTrait(id: string) {
    onPassiveChange(passiveTraits.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-2">
      {/* ── Active Features ── */}
      <Section
        title="Active Features"
        subtitle={activeFeatures.length ? `${activeFeatures.length} feature${activeFeatures.length !== 1 ? 's' : ''}` : undefined}
      >
        <div className="space-y-1.5">
          {activeFeatures.map(f => (
            <FeatureCard
              key={f.id}
              feature={f}
              onChange={updated => updateFeature(f.id, updated)}
              onRemove={() => removeFeature(f.id)}
            />
          ))}
          <button
            onClick={addFeature}
            className="w-full text-xs text-amber-600/50 hover:text-amber-400 border border-dashed border-amber-800/30 rounded-lg py-1.5 transition-colors"
          >
            + Add feature
          </button>
        </div>
      </Section>

      {/* ── Passive Traits ── */}
      <Section
        title="Passive Traits"
        subtitle={passiveTraits.length ? `${passiveTraits.length} trait${passiveTraits.length !== 1 ? 's' : ''}` : undefined}
      >
        <div className="space-y-1.5">
          {passiveTraits.map(t => (
            <TraitCard
              key={t.id}
              trait={t}
              onChange={updated => updateTrait(t.id, updated)}
              onRemove={() => removeTrait(t.id)}
            />
          ))}
          <button
            onClick={addTrait}
            className="w-full text-xs text-amber-600/50 hover:text-amber-400 border border-dashed border-amber-800/30 rounded-lg py-1.5 transition-colors"
          >
            + Add trait
          </button>
        </div>
      </Section>

      {/* ── Background & Flavour ── */}
      <Section title="Background & Flavour" defaultOpen={false}>
        <textarea
          value={backgroundFlavour}
          onChange={e => onBackgroundChange(e.target.value)}
          placeholder="Background feature perks, class flavour, non-mechanical traits…"
          rows={4}
          className="w-full bg-amber-950/40 border border-amber-800/25 rounded-lg px-2.5 py-2 text-sm text-amber-100 resize-none focus:outline-none focus:border-amber-600/50 placeholder-amber-800/40 transition-colors"
        />
      </Section>
    </div>
  )
}
