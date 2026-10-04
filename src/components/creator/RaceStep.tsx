import { useState } from 'react'
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
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-amber-100">{race.name}</span>
        <span className="text-[10px] text-amber-600/80 font-mono">{SOURCE_SHORT[race.source]}</span>
      </div>
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
        <p className="text-[11px] text-amber-600/80">{SOURCE_LONG[race.source]}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <Badge>{r.size}</Badge>
          <Badge>Speed {r.speed} ft</Badge>
          {r.darkvision && <Badge className="bg-indigo-900/30 text-indigo-300/90 border-indigo-800/40">Darkvision {r.darkvision} ft</Badge>}
          {r.resist.map(x => <Badge key={x} className="bg-green-900/30 text-green-300/90 border-green-800/40">Resists {x}</Badge>)}
        </div>
        {pitch && (
          <>
            <p className="text-sm text-amber-300/80 mt-2">{pitch.tagline}</p>
            {pitch.goodFor && <p className="text-xs text-amber-500/70 mt-1">Often a good fit for: <span className="text-amber-300/80">{pitch.goodFor}</span></p>}
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

const SOURCE_SHORT: Record<string, string> = { PHB: 'PHB', VGM: "Volo's", MPMM: 'MPMM', TCE: "Tasha's" }
const SOURCE_LONG: Record<string, string> = {
  PHB: "Player's Handbook (2014)",
  VGM: "Volo's Guide to Monsters",
  MPMM: 'Mordenkainen Presents: Monsters of the Multiverse',
  TCE: "Tasha's Cauldron of Everything",
}

export default function RaceStep(p: Props) {
  const [source, setSource] = useState<string>('all')
  const shown = source === 'all' ? p.races : p.races.filter(r => r.source === source)
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
          {!p.loading && !p.error && (<>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['all', 'PHB', 'VGM', 'MPMM', 'TCE'].map(s => (
                <button key={s} onClick={() => setSource(s)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-bold ${source === s ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-500/70 hover:text-amber-300'}`}>
                  {s === 'all' ? 'All books' : SOURCE_SHORT[s]}
                </button>
              ))}
              {source === 'VGM' && <span className="text-[11px] text-amber-600/80 self-center">Most of these were updated in MPMM — ask your DM which version to use.</span>}
            </div>
            <PickerLayout
              items={shown}
              getKey={r => r.key}
              selectedKey={p.raceName}
              onSelect={p.onPick}
              renderCard={r => <RaceCard race={r} />}
              renderDetail={r => <RaceDetail race={r} subShort={p.subShort} onPickSub={p.onPickSub} />}
              chooseLabel={r => r.subraces.length > 0 && !r.subraces.some(s => s.short === p.subShort)
                ? `Close (pick a ${r.subraceLabel === 'Subrace' ? 'subrace' : 'ancestry'} first)`
                : `Choose ${r.name}`}
              emptyDetail={<p className="text-sm text-amber-600/70 text-center py-16">Click a race to read about it.</p>}
            />
          </>)}
        </>
      )}
    </>
  )
}
