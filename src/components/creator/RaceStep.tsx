import { resolveRace, type RaceOption } from '../../data/creator2014'
import { RACE_PITCH } from '../../data/creatorPitches'
import { abilityBonusText } from './format'
import { Badge, FixedRow, LoadState, ModeToggle, PickerLayout, SectionLabel, TraitBlock } from './ui'

interface Props {
  races: RaceOption[]
  loading: boolean
  error: string | null
  onRetry: () => void
  mode: 'list' | 'custom'
  onMode: (m: 'list' | 'custom') => void
  raceName: string | null
  subShort: string | null
  onPick: (name: string) => void
  onPickSub: (short: string) => void
  customRace: string
  onCustomRace: (v: string) => void
}

function RaceCard({ race }: { race: RaceOption }) {
  const preview = resolveRace(race, null)
  return (
    <>
      <div className="font-bold text-amber-100">{race.name}</div>
      <p className="text-xs text-amber-400/70 mt-0.5 line-clamp-2">{RACE_PITCH[race.name]?.tagline}</p>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {abilityBonusText(preview.grants).map(t => <Badge key={t}>{t}</Badge>)}
        {race.subraces.length > 0 && (
          <Badge className="bg-purple-900/30 text-purple-300/90 border-purple-800/40">
            {race.subraces.length} {race.subraceLabel === 'Subrace' ? 'subraces' : 'ancestries'}
          </Badge>
        )}
      </div>
    </>
  )
}

function RaceDetail({ race, subShort, onPickSub }: { race: RaceOption; subShort: string | null; onPickSub: (s: string) => void }) {
  const sub = race.subraces.find(s => s.short === subShort) ?? null
  const r = resolveRace(race, sub)
  const pitch = RACE_PITCH[race.name]
  const needsSub = race.subraces.length > 0
  const g = r.grants

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-amber-100">{r.label}</h3>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <Badge>{r.size}</Badge>
          <Badge>Speed {r.speed} ft</Badge>
          {r.darkvision && <Badge className="bg-indigo-900/30 text-indigo-300/90 border-indigo-800/40">Darkvision {r.darkvision} ft</Badge>}
          {r.resist.map(x => <Badge key={x} className="bg-green-900/30 text-green-300/90 border-green-800/40">Resists {x}</Badge>)}
        </div>
        {pitch && (
          <>
            <p className="text-sm text-amber-300/80 mt-2">{pitch.tagline}</p>
            <p className="text-xs text-amber-500/70 mt-1">Often a good fit for: <span className="text-amber-300/80">{pitch.goodFor}</span></p>
          </>
        )}
      </div>

      {needsSub && (
        <div className="rounded-lg border border-purple-800/40 bg-purple-950/20 p-3">
          <SectionLabel>{race.subraceLabel === 'Subrace' ? 'Choose a subrace' : 'Choose your draconic ancestry'}</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {race.subraces.map(s => (
              <button
                key={s.short}
                onClick={() => onPickSub(s.short)}
                className={`px-3 py-1 rounded-full border text-xs font-bold transition-colors ${
                  s.short === subShort
                    ? 'bg-purple-600/30 border-purple-400/70 text-purple-100'
                    : 'border-purple-800/40 text-purple-300/70 hover:border-purple-500/60 hover:text-purple-200'
                }`}
              >
                {race.subraceLabel !== 'Subrace' || s.short === 'Drow' ? s.short : `${s.short} ${race.name}`}
              </button>
            ))}
          </div>
          {!sub && <p className="text-[11px] text-purple-300/60 mt-2">Pick one to see what it adds. You need one to continue.</p>}
        </div>
      )}

      <div>
        <SectionLabel>Ability score increases</SectionLabel>
        <div className="flex flex-wrap gap-1">
          {abilityBonusText(g).map(t => <Badge key={t}>{t}</Badge>)}
          {abilityBonusText(g).length === 0 && <span className="text-xs text-amber-600/70">None</span>}
        </div>
        {g.abilityChoices.length > 0 && <p className="text-[11px] text-amber-500/70 mt-1">You'll pick these on the Abilities step.</p>}
      </div>

      {(g.skills.length + g.languages.length + g.tools.length + g.armor.length + g.weapons.length + g.choices.length) > 0 && (
        <div className="space-y-1.5">
          <SectionLabel>Proficiencies &amp; languages</SectionLabel>
          <FixedRow label="Skills" items={g.skills} />
          <FixedRow label="Languages" items={g.languages} />
          <FixedRow label="Tools" items={g.tools} />
          <FixedRow label="Armor" items={g.armor} />
          <FixedRow label="Weapons" items={g.weapons} />
          {g.choices.map(c => (
            <p key={c.id} className="text-xs text-amber-300/80">✦ {c.label} <span className="text-amber-600/70">(on the Proficiencies step)</span></p>
          ))}
        </div>
      )}

      <div>
        <SectionLabel>Traits</SectionLabel>
        {r.traits.map(t => <TraitBlock key={t.name} name={t.name} text={t.text} />)}
      </div>
    </div>
  )
}

export default function RaceStep(p: Props) {
  return (
    <>
      <ModeToggle mode={p.mode} onChange={p.onMode} />
      {p.mode === 'custom' ? (
        <div className="max-w-md">
          <SectionLabel>Race name</SectionLabel>
          <input
            autoFocus
            value={p.customRace}
            onChange={e => p.onCustomRace(e.target.value)}
            placeholder="e.g. Kenku, Changeling, Half-Dragon…"
            className="w-full bg-amber-950/50 border border-amber-800/40 rounded-lg px-3 py-2 text-sm text-amber-100 placeholder-amber-700/40 focus:border-amber-600 focus:outline-none"
          />
          <p className="text-[11px] text-amber-600/70 mt-1.5">Homebrew races don't come with automatic bonuses. Ask your DM what yours gets and add it on the sheet.</p>
        </div>
      ) : (
        <>
          <LoadState loading={p.loading} error={p.error} onRetry={p.onRetry} what="races" />
          {!p.loading && !p.error && (
            <PickerLayout
              items={p.races}
              getKey={r => r.name}
              selectedKey={p.raceName}
              onSelect={p.onPick}
              renderCard={r => <RaceCard race={r} />}
              renderDetail={r => <RaceDetail race={r} subShort={p.subShort} onPickSub={p.onPickSub} />}
              chooseLabel={r => r.subraces.length > 0 && !r.subraces.some(s => s.short === p.subShort)
                ? `Close (pick a ${r.subraceLabel === 'Subrace' ? 'subrace' : 'ancestry'} first)`
                : `Choose ${r.name}`}
              emptyDetail={<p className="text-sm text-amber-600/70 text-center py-16">Click a race to read about it.</p>}
            />
          )}
        </>
      )}
    </>
  )
}
