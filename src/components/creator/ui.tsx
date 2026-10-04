// Shared building blocks for the character creation wizard.

import { useEffect, useState } from 'react'

export type FlowStep = 'name' | 'race' | 'class' | 'background' | 'abilities' | 'proficiencies' | 'levels' | 'spells' | 'personality' | 'review'

/** Full order; 'levels' and 'spells' are dropped when a character has nothing to choose there. */
export const FLOW: FlowStep[] = ['name', 'race', 'class', 'background', 'abilities', 'proficiencies', 'levels', 'spells', 'personality', 'review']

export const STEP_LABELS: Record<FlowStep, string> = {
  name: 'Name', race: 'Race', class: 'Class', background: 'Background',
  abilities: 'Abilities', proficiencies: 'Proficiencies', levels: 'Level & Subclass', spells: 'Spells', personality: 'Personality', review: 'Review',
}

export function useIsDesktop(): boolean {
  const query = '(min-width: 768px)'
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatch(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return match
}

// ── Page shell with stepper ───────────────────────────────────────────────────

export function WizardShell({ step, steps = FLOW, canReach, onJump, children }: {
  step: FlowStep | 'landing'
  steps?: FlowStep[]
  canReach?: (s: FlowStep) => boolean
  onJump?: (s: FlowStep) => void
  children: React.ReactNode
}) {
  const idx = step === 'landing' ? -1 : steps.indexOf(step)
  const wide = step !== 'landing' && step !== 'name'
  return (
    <div className="min-h-screen bg-[#130e06] flex flex-col items-center px-4 py-6 md:py-10">
      <div className={`w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} ${step === 'landing' || step === 'name' ? 'my-auto' : ''}`}>
        {idx >= 0 && (
          <>
            {/* Desktop: labelled steps */}
            <ol className="hidden md:flex items-center justify-center gap-1 mb-6 flex-wrap">
              {steps.map((s, i) => {
                const reachable = canReach?.(s) ?? false
                const state = i === idx ? 'current' : i < idx ? 'done' : 'todo'
                return (
                  <li key={s} className="flex items-center gap-1">
                    <button
                      onClick={() => reachable && i !== idx && onJump?.(s)}
                      disabled={!reachable || i === idx}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-colors border ${
                        state === 'current' ? 'bg-amber-600/30 border-amber-500/70 text-amber-100'
                        : state === 'done' ? 'border-amber-700/50 text-amber-400 hover:text-amber-200 hover:border-amber-500/60'
                        : reachable ? 'border-amber-800/40 text-amber-600/70 hover:text-amber-300'
                        : 'border-amber-900/40 text-amber-800/60 cursor-default'
                      }`}
                    >
                      {state === 'done' ? '✓ ' : `${i + 1}. `}{STEP_LABELS[s]}
                    </button>
                    {i < steps.length - 1 && <span className={`w-3 h-px ${i < idx ? 'bg-amber-600/60' : 'bg-amber-900/60'}`} />}
                  </li>
                )
              })}
            </ol>
            {/* Mobile: compact progress */}
            <div className="md:hidden mb-4">
              <div className="flex justify-between text-[11px] text-amber-500/80 mb-1.5">
                <span className="font-bold uppercase tracking-widest">{STEP_LABELS[steps[idx]]}</span>
                <span>Step {idx + 1} of {steps.length}</span>
              </div>
              <div className="h-1 bg-amber-950 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500/70 transition-all" style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
              </div>
            </div>
          </>
        )}
        {children}
      </div>
    </div>
  )
}

// ── Step card with title + back/next footer ──────────────────────────────────

export function StepCard({ title, subtitle, children, onBack, onNext, nextLabel = 'Next →', nextDisabled, nextHint }: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextHint?: string            // shown when next is disabled, explains why
}) {
  return (
    <div className="bg-amber-950/40 border border-amber-800/30 rounded-2xl p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-amber-100">{title}</h2>
      {subtitle && <p className="text-amber-500/70 text-sm mt-1 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
      {(onBack || onNext) && (
        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-amber-900/40">
          {onBack
            ? <button onClick={onBack} className="text-amber-600/70 hover:text-amber-400 text-sm">← Back</button>
            : <span />}
          <div className="flex items-center gap-3">
            {nextDisabled && nextHint && <span className="text-[11px] text-amber-600/70 text-right">{nextHint}</span>}
            {onNext && (
              <button
                onClick={onNext}
                disabled={nextDisabled}
                className="px-5 py-2 bg-amber-700/60 hover:bg-amber-600/70 disabled:opacity-30 disabled:cursor-not-allowed text-amber-100 rounded-lg text-sm font-bold transition-colors"
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Source toggle: Player's Handbook vs custom/homebrew ───────────────────────

export function ModeToggle({ mode, onChange }: { mode: 'list' | 'custom'; onChange: (m: 'list' | 'custom') => void }) {
  return (
    <div className="flex gap-1 mb-4 bg-amber-950/60 rounded-lg p-1 max-w-sm">
      {(['list', 'custom'] as const).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${
            mode === m ? 'bg-amber-700/50 text-amber-100' : 'text-amber-600/60 hover:text-amber-400'
          }`}
        >
          {m === 'list' ? "Player's Handbook (2014)" : 'Custom / Homebrew'}
        </button>
      ))}
    </div>
  )
}

// ── List + detail picker (side-by-side on desktop, overlay sheet on mobile) ───

export function PickerLayout<T>({ items, getKey, selectedKey, onSelect, renderCard, renderDetail, chooseLabel, emptyDetail }: {
  items: T[]
  getKey: (item: T) => string
  selectedKey: string | null
  onSelect: (key: string) => void
  renderCard: (item: T, selected: boolean) => React.ReactNode
  renderDetail: (item: T) => React.ReactNode
  chooseLabel: (item: T) => string
  emptyDetail: React.ReactNode
}) {
  const isDesktop = useIsDesktop()
  const [sheetOpen, setSheetOpen] = useState(false)
  const selected = items.find(i => getKey(i) === selectedKey) ?? null

  const list = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start md:max-h-[62vh] md:overflow-y-auto md:pr-1">
      {items.map(item => {
        const key = getKey(item)
        const isSel = key === selectedKey
        return (
          <button
            key={key}
            onClick={() => { onSelect(key); if (!isDesktop) setSheetOpen(true) }}
            className={`text-left rounded-xl border p-3 transition-colors ${
              isSel ? 'bg-amber-600/20 border-amber-500/70' : 'bg-amber-950/30 border-amber-800/30 hover:border-amber-600/50 hover:bg-amber-900/20'
            }`}
          >
            {renderCard(item, isSel)}
          </button>
        )
      })}
    </div>
  )

  if (isDesktop) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4">
        {list}
        <div className="md:max-h-[62vh] md:overflow-y-auto rounded-xl border border-amber-800/30 bg-amber-950/50 p-4">
          {selected ? renderDetail(selected) : emptyDetail}
        </div>
      </div>
    )
  }

  return (
    <>
      {list}
      {sheetOpen && selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setSheetOpen(false)}>
          <div
            className="w-full max-h-[88vh] flex flex-col bg-[#1b1408] border-t border-amber-700/50 rounded-t-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-amber-900/50">
              <button onClick={() => setSheetOpen(false)} className="text-amber-500 text-sm">← Back to list</button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">{renderDetail(selected)}</div>
            <div className="p-3 border-t border-amber-900/50">
              <button
                onClick={() => setSheetOpen(false)}
                className="w-full py-2.5 bg-amber-600/70 text-amber-50 rounded-lg text-sm font-bold"
              >
                {chooseLabel(selected)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Small pieces ──────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-amber-600/80 font-bold mb-1.5">{children}</div>
}

export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${className || 'bg-amber-900/40 text-amber-300/90 border-amber-800/40'}`}>
      {children}
    </span>
  )
}

/** A labelled row of fixed grants shown as locked chips. Renders nothing when empty. */
export function FixedRow({ label, items, title }: { label: string; items: string[]; title?: (item: string) => string }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="text-[11px] text-amber-600/80 w-24 shrink-0">{label}</span>
      {items.map(i => (
        <span key={i} title={title?.(i)} className="px-2 py-0.5 rounded-full text-xs bg-amber-800/30 border border-amber-700/40 text-amber-200">
          🔒 {i}
        </span>
      ))}
    </div>
  )
}

export function TraitBlock({ name, text }: { name: string; text: string }) {
  return (
    <div className="mb-2.5">
      <div className="text-sm font-semibold text-amber-200">{name}</div>
      <p className="text-xs text-amber-300/70 whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  )
}

export function LoadState({ loading, error, onRetry, what }: { loading: boolean; error: string | null; onRetry: () => void; what: string }) {
  if (loading) return <p className="text-amber-600/70 text-sm text-center py-10 animate-pulse">Loading {what} from 5e.tools…</p>
  if (error) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-red-400/80 text-sm">Couldn't load {what}: {error}</p>
        <button onClick={onRetry} className="px-3 py-1 rounded border border-amber-700/50 text-amber-300 text-xs">Retry</button>
        <p className="text-amber-700/70 text-xs">You can also switch to Custom / Homebrew above.</p>
      </div>
    )
  }
  return null
}
