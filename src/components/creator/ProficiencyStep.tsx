import { EXOTIC_LANGUAGES, type Choice, type Grants } from '../../data/creator2014'
import { choiceRemaining, grantedNames, ownedElsewhere, type Picks } from '../../data/creatorBuild'
import { ABILITY_LABELS, SKILL_ABILITIES } from '../../utils'
import { FixedRow, SectionLabel } from './ui'

interface Props {
  groups: Grants[]
  picks: Picks
  onPick: (choiceId: string, values: string[]) => void
}

const SOURCE_TITLE: Record<Grants['source'], string> = {
  race: 'From your race',
  background: 'From your background',
  class: 'From your class',
}

const skillTitle = (s: string) => SKILL_ABILITIES[s] ? `Uses ${ABILITY_LABELS[SKILL_ABILITIES[s]]}` : ''

function ChoicePicker({ choice, groups, picks, onPick }: { choice: Choice; groups: Grants[]; picks: Picks; onPick: Props['onPick'] }) {
  const picked = picks[choice.id] ?? []
  const owned = ownedElsewhere(groups, picks, choice.kind, choice.id)
  const remaining = choiceRemaining(choice, groups, picks)
  const full = picked.length >= choice.count

  return (
    <div className={`rounded-lg border p-2.5 ${remaining > 0 ? 'border-amber-500/50 bg-amber-900/15' : 'border-green-800/40 bg-green-950/10'}`}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-sm text-amber-100 font-semibold">{choice.label}</span>
        <span className={`text-xs font-bold shrink-0 ${remaining > 0 ? 'text-amber-400' : 'text-green-400'}`}>
          {remaining > 0 ? `${picked.length} / ${choice.count}` : '✓ Done'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {choice.options.map((opt, i) => {
          const firstExotic = choice.kind === 'language' && EXOTIC_LANGUAGES.includes(opt) && !EXOTIC_LANGUAGES.includes(choice.options[i - 1])
          const on = picked.includes(opt)
          const from = owned.get(opt.toLowerCase())
          const disabled = !on && (!!from || full)
          return (<span key={opt} className="contents">
            {firstExotic && <span className="basis-full text-[10px] uppercase tracking-widest text-amber-600/70 mt-1">Exotic — usually needs your DM's OK</span>}
            <button
              disabled={disabled}
              title={from ? `You already have this from ${from}` : choice.kind === 'skill' ? skillTitle(opt) : undefined}
              onClick={() => onPick(choice.id, on ? picked.filter(p => p !== opt) : [...picked, opt])}
              className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                on ? 'bg-amber-600/40 border-amber-400/70 text-amber-50 font-bold'
                : from ? 'border-amber-900/40 text-amber-700/60 line-through cursor-not-allowed'
                : full ? 'border-amber-900/40 text-amber-600/40 cursor-not-allowed'
                : 'border-amber-700/50 text-amber-300/90 hover:border-amber-400/70 hover:text-amber-100'
              }`}
            >
              {on && '✓ '}{opt}
              {choice.kind === 'skill' && SKILL_ABILITIES[opt] && (
                <span className="ml-1 text-[9px] opacity-60">{SKILL_ABILITIES[opt].toUpperCase()}</span>
              )}
            </button>
          </span>)
        })}
      </div>
    </div>
  )
}

export default function ProficiencyStep({ groups, picks, onPick }: Props) {
  const skills = grantedNames(groups, picks, 'skill')
  const languages = grantedNames(groups, picks, 'language')
  const tools = grantedNames(groups, picks, 'tool')

  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_16rem] gap-4 items-start">
      <div className="space-y-4">
        {groups.map(g => {
          const hasFixed = g.skills.length + g.languages.length + g.tools.length + g.armor.length + g.weapons.length + g.saves.length > 0
          return (
            <section key={g.source} className="rounded-xl border border-amber-800/30 bg-amber-950/30 p-3 md:p-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-amber-600/80 font-bold">{SOURCE_TITLE[g.source]}</span>
                <span className="text-base font-bold text-amber-100">{g.sourceLabel}</span>
              </div>
              {!hasFixed && g.choices.length === 0 && (
                <p className="text-xs text-amber-600/70">Nothing automatic here. Add proficiencies on the sheet if your DM gives you any.</p>
              )}
              {hasFixed && (
                <div className="space-y-1.5 mb-3">
                  <FixedRow label="Skills" items={g.skills} title={skillTitle} />
                  <FixedRow label="Saving throws" items={g.saves.map(s => ABILITY_LABELS[s])} />
                  <FixedRow label="Languages" items={g.languages} />
                  <FixedRow label="Tools" items={g.tools} />
                  <FixedRow label="Armor" items={g.armor} />
                  <FixedRow label="Weapons" items={g.weapons} />
                </div>
              )}
              <div className="space-y-2">
                {g.choices.map(c => <ChoicePicker key={c.id} choice={c} groups={groups} picks={picks} onPick={onPick} />)}
              </div>
            </section>
          )
        })}
      </div>

      {/* Running totals */}
      <aside className="rounded-xl border border-amber-800/30 bg-amber-950/50 p-3 md:sticky md:top-4 space-y-3">
        <SectionLabel>Your character so far</SectionLabel>
        {([['Skills', skills], ['Languages', languages], ['Tools', tools]] as const).map(([label, list]) => (
          <div key={label}>
            <div className="text-[11px] text-amber-500/80 mb-0.5">{label} ({list.length})</div>
            <p className="text-xs text-amber-200/90">{list.length ? list.join(', ') : '—'}</p>
          </div>
        ))}
      </aside>
    </div>
  )
}
