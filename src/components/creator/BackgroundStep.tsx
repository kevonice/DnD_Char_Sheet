import type { BackgroundOption } from '../../data/creator2014'
import { BACKGROUND_PITCH } from '../../data/creatorPitches'
import { Badge, LoadState, ModeToggle, PickerLayout, SectionLabel, TraitBlock } from './ui'

interface Props {
  backgrounds: BackgroundOption[]
  loading: boolean
  error: string | null
  onRetry: () => void
  mode: 'list' | 'custom'
  onMode: (m: 'list' | 'custom') => void
  backgroundName: string | null
  onPick: (name: string) => void
  customBackground: string
  onCustomBackground: (v: string) => void
}

function BackgroundCard({ bg }: { bg: BackgroundOption }) {
  return (
    <>
      <div className="font-bold text-amber-100">{bg.name}</div>
      <p className="text-xs text-amber-400/70 mt-0.5 line-clamp-2">{BACKGROUND_PITCH[bg.name]}</p>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {bg.grants.skills.map(s => <Badge key={s}>{s}</Badge>)}
      </div>
    </>
  )
}

function BackgroundDetail({ bg }: { bg: BackgroundOption }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-amber-100">{bg.name}</h3>
        <p className="text-sm text-amber-300/80 mt-1">{BACKGROUND_PITCH[bg.name]}</p>
      </div>
      <div className="space-y-1.5">
        <SectionLabel>What you get</SectionLabel>
        {bg.summary.map(s => (
          <div key={s.name} className="text-xs">
            <span className="text-amber-500/90 font-semibold">{s.name}: </span>
            <span className="text-amber-300/80">{s.text}</span>
          </div>
        ))}
        {bg.gp > 0 && <p className="text-[11px] text-amber-500/70">Includes {bg.gp} gp, added to your coin purse.</p>}
      </div>
      {bg.feature && (
        <div>
          <SectionLabel>Background feature</SectionLabel>
          <TraitBlock name={bg.feature.name} text={bg.feature.text} />
        </div>
      )}
      {bg.tables.traits.length > 0 && (
        <p className="text-xs text-amber-500/70 border-t border-amber-900/40 pt-3">
          This background comes with suggested personality traits, ideals, bonds and flaws. You can pick or roll them on the Personality step.
        </p>
      )}
    </div>
  )
}

export default function BackgroundStep(p: Props) {
  return (
    <>
      <ModeToggle mode={p.mode} onChange={p.onMode} />
      {p.mode === 'custom' ? (
        <div className="max-w-md">
          <SectionLabel>Background name</SectionLabel>
          <input
            autoFocus
            value={p.customBackground}
            onChange={e => p.onCustomBackground(e.target.value)}
            placeholder="e.g. Haunted One, Far Traveler…"
            className="w-full bg-amber-950/50 border border-amber-800/40 rounded-lg px-3 py-2 text-sm text-amber-100 placeholder-amber-700/40 focus:border-amber-600 focus:outline-none"
          />
          <p className="text-[11px] text-amber-600/70 mt-1.5">Add its skills, tools and languages on the sheet afterwards.</p>
        </div>
      ) : (
        <>
          <LoadState loading={p.loading} error={p.error} onRetry={p.onRetry} what="backgrounds" />
          {!p.loading && !p.error && (
            <PickerLayout
              items={p.backgrounds}
              getKey={b => b.name}
              selectedKey={p.backgroundName}
              onSelect={p.onPick}
              renderCard={b => <BackgroundCard bg={b} />}
              renderDetail={b => <BackgroundDetail bg={b} />}
              chooseLabel={b => `Choose ${b.name}`}
              emptyDetail={<p className="text-sm text-amber-600/70 text-center py-16">Click a background to read about it.</p>}
            />
          )}
        </>
      )}
    </>
  )
}
