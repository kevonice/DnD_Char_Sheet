import { useEffect, useState } from 'react'
import type { ClassLevelData, SubclassOption } from '../../data/creatorLevels'
import { averageHitDieRoll, subclassPreparedNames } from '../../data/creatorLevels'
import { fetchClassProgression, type ClassFeatureDesc } from '../../data/fiveEtoolsProgression'
import { modifier } from '../../utils'
import { Badge, PickerLayout, SectionLabel } from './ui'

interface Props {
  className: string
  level: number
  hitDie: number
  con: number
  data: ClassLevelData | null          // null → custom class or still loading
  subclassName: string | null
  onSubclass: (name: string) => void
  customSubclass: string
  onCustomSubclass: (v: string) => void
  hpMethod: 'average' | 'roll'
  onHpMethod: (m: 'average' | 'roll') => void
  hpRolls: Array<number | null>        // die result for levels 2..N
  onHpRolls: (r: Array<number | null>) => void
}

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase())

/** Subclass features the character would have by `level`, fetched lazily. */
function SubclassFeatures({ className, sub, level }: { className: string; sub: SubclassOption; level: number }) {
  const [features, setFeatures] = useState<ClassFeatureDesc[] | null>(null)
  useEffect(() => {
    let alive = true
    setFeatures(null)
    fetchClassProgression(className, '2014', sub.name)
      .then(d => {
        if (!alive || !d) return
        setFeatures(d.levels.slice(0, 20).flatMap(l => l.subclassFeatures.map(n => d.featureMap.get(`${n}|${l.level}`) ?? { name: n, level: l.level, description: '' })))
      })
      .catch(() => alive && setFeatures([]))
    return () => { alive = false }
  }, [className, sub.name])
  if (!features) return <p className="text-xs text-amber-600/70 animate-pulse">Loading features…</p>
  const now = features.filter(f => f.level <= level)
  const later = features.filter(f => f.level > level)
  return (
    <div className="space-y-1">
      {now.map(f => (
        <details key={`${f.name}${f.level}`} className="rounded-lg border border-purple-800/40 bg-purple-950/20 px-2.5 py-1.5">
          <summary className="text-sm font-semibold text-purple-100 cursor-pointer">{f.name} <span className="text-[10px] text-purple-400/80">level {f.level}</span></summary>
          <p className="text-xs text-amber-300/70 whitespace-pre-wrap leading-relaxed mt-1">{f.description || 'No description available.'}</p>
        </details>
      ))}
      {later.length > 0 && (
        <p className="text-[11px] text-amber-600/70 pt-1">Later: {later.map(f => `${f.name} (${f.level})`).join(', ')}</p>
      )}
    </div>
  )
}

export default function LevelsStep(p: Props) {
  const cm = modifier(p.con)
  const needsSubclass = !p.data || p.level >= p.data.subclassLevel

  function roll(i: number) {
    const next = [...p.hpRolls]
    next[i] = 1 + Math.floor(Math.random() * p.hitDie)
    p.onHpRolls(next)
  }

  return (
    <div className="space-y-6">
      {needsSubclass && (
        <section>
          <SectionLabel>{p.data ? `${p.data.subclassTitle} (your subclass)` : 'Subclass'}</SectionLabel>
          {p.data ? (
            <>
              <p className="text-xs text-amber-400/70 mb-3">
                A {p.className} picks this at level {p.data.subclassLevel}. It shapes your powers for the rest of the game. Books other than the PHB are marked; check which ones your DM allows.
              </p>
              <PickerLayout
                items={p.data.subclasses}
                getKey={s => s.name}
                selectedKey={p.subclassName}
                onSelect={p.onSubclass}
                renderCard={s => (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-amber-100">{s.name}</span>
                    {s.source !== 'PHB' && <span className="text-[10px] text-amber-600/80 font-mono">{s.source}</span>}
                  </div>
                )}
                renderDetail={s => {
                  const prepared = subclassPreparedNames(s, p.level)
                  const expanded = Object.entries(s.expanded).flatMap(([lvl, names]) => names.map(n => `${titleCase(n)} (${lvl})`))
                  return (
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-amber-100">{s.name}</h3>
                      {prepared.length > 0 && (
                        <div>
                          <SectionLabel>Always-prepared spells</SectionLabel>
                          <div className="flex flex-wrap gap-1">{prepared.map(n => <Badge key={n}>{titleCase(n)}</Badge>)}</div>
                        </div>
                      )}
                      {expanded.length > 0 && (
                        <div>
                          <SectionLabel>Extra spells you can choose from</SectionLabel>
                          <p className="text-xs text-amber-300/80">{expanded.join(', ')}</p>
                        </div>
                      )}
                      <div>
                        <SectionLabel>Features up to level {p.level}</SectionLabel>
                        <SubclassFeatures className={p.className} sub={s} level={p.level} />
                      </div>
                    </div>
                  )
                }}
                chooseLabel={s => `Choose ${s.name}`}
                emptyDetail={<p className="text-sm text-amber-600/70 text-center py-16">Click a subclass to read about it.</p>}
              />
            </>
          ) : (
            <input
              value={p.customSubclass}
              onChange={e => p.onCustomSubclass(e.target.value)}
              placeholder="Subclass (optional)"
              className="w-full max-w-md bg-amber-950/50 border border-amber-800/40 rounded-lg px-3 py-2 text-sm text-amber-100 placeholder-amber-700/40 focus:border-amber-600 focus:outline-none"
            />
          )}
        </section>
      )}

      {p.level > 1 && (
        <section className="rounded-xl border border-amber-800/30 bg-amber-950/30 p-3 md:p-4">
          <SectionLabel>Hit points</SectionLabel>
          <p className="text-xs text-amber-400/70 mb-2">
            Level 1 gives the full d{p.hitDie}. Each level after adds a d{p.hitDie} plus your CON modifier ({fmt(cm)}).
            Take the average (the safe choice), or roll if your DM allows it.
          </p>
          <div className="flex gap-1.5 mb-3">
            {(['average', 'roll'] as const).map(m => (
              <button key={m} onClick={() => p.onHpMethod(m)}
                className={`px-3 py-1 rounded-lg border text-sm font-bold ${p.hpMethod === m ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-500/70'}`}>
                {m === 'average' ? `Average (${averageHitDieRoll(p.hitDie)})` : 'Roll'}
              </button>
            ))}
            {p.hpMethod === 'roll' && (
              <button onClick={() => p.onHpRolls(p.hpRolls.map(() => 1 + Math.floor(Math.random() * p.hitDie)))}
                className="ml-auto px-3 py-1 rounded-lg bg-amber-700/50 text-amber-100 text-sm font-bold">🎲 Roll all</button>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-amber-300/90"><span>Level 1</span><span>{p.hitDie} {fmt(cm)} = <b className="text-amber-100">{Math.max(1, p.hitDie + cm)}</b></span></div>
            {p.hpRolls.map((r, i) => {
              const die = p.hpMethod === 'average' ? averageHitDieRoll(p.hitDie) : r
              return (
                <div key={i} className="flex justify-between items-center text-amber-300/90">
                  <span>Level {i + 2}</span>
                  {die == null
                    ? <button onClick={() => roll(i)} className="px-2 py-0.5 rounded border border-amber-700/50 text-amber-300 text-xs">🎲 Roll d{p.hitDie}</button>
                    : <span>{die} {fmt(cm)} = <b className="text-amber-100">{Math.max(1, die + cm)}</b></span>}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
