import { useState, useEffect } from 'react'
import { fetchClassProgression, type ClassProgressionData, type ClassFeatureDesc } from '../data/fiveEtoolsProgression'
import EditionToggle from './EditionToggle'

type ProgressionEdition = '2014' | '2024'

interface Props {
  className: string
  subclass: string
}

const PROF_COLOR = [
  '', // placeholder for index 0
  'text-amber-400', // +2 levels 1-4
  'text-amber-400',
  'text-amber-400',
  'text-amber-400',
  'text-amber-500', // +3 levels 5-8
  'text-amber-500',
  'text-amber-500',
  'text-amber-500',
  'text-amber-300', // +4 levels 9-12
  'text-amber-300',
  'text-amber-300',
  'text-amber-300',
  'text-amber-200', // +5 levels 13-16
  'text-amber-200',
  'text-amber-200',
  'text-amber-200',
  'text-amber-100', // +6 levels 17-20
  'text-amber-100',
  'text-amber-100',
  'text-amber-100',
]

function FeatureDetail({ feature }: { feature: ClassFeatureDesc }) {
  return (
    <div className="mt-2 bg-amber-950/60 border border-amber-800/30 rounded-lg p-3 text-xs text-amber-200/70 max-h-48 overflow-y-auto whitespace-pre-wrap">
      <div className="text-amber-300 font-semibold mb-1">{feature.name} <span className="text-amber-700/60 font-normal">· Level {feature.level}</span></div>
      {feature.description || <span className="text-amber-700/50 italic">No description available.</span>}
    </div>
  )
}

export default function ClassTab({ className, subclass }: Props) {
  const [edition, setEdition] = useState<ProgressionEdition>('2014')
  const [data, setData] = useState<ClassProgressionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ClassFeatureDesc | null>(null)

  useEffect(() => {
    if (!className) return
    setLoading(true)
    setError(null)
    setSelected(null)
    fetchClassProgression(className, edition, subclass)
      .then(d => {
        setData(d)
        if (!d) setError(`No class data found for "${className}".`)
      })
      .catch(e => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [className, subclass, edition])

  if (!className) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-amber-700/50">
        <span className="text-4xl mb-3">⚔️</span>
        <p className="text-sm">Set a class on the Character tab to see its progression.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-amber-600/50 animate-pulse text-sm">
        Loading {className} progression…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-amber-700/50">
        <p className="text-sm">{error ?? 'Unknown error'}</p>
        <p className="text-xs mt-1 text-amber-800/40">Make sure the class name matches a standard 5e class.</p>
      </div>
    )
  }

  function toggle(name: string, level: number) {
    const key = `${name}|${level}`
    const feat = data!.featureMap.get(key)
    if (!feat) {
      // try to find by name alone (some features appear at different levels)
      const fallback = [...data!.featureMap.values()].find(f => f.name === name)
      if (fallback) {
        setSelected(prev => prev?.name === name && prev?.level === fallback.level ? null : fallback)
        return
      }
    }
    setSelected(prev => prev?.name === name && prev?.level === level ? null : (feat ?? null))
  }

  // Determine which columns to show — skip all-"—" columns
  const visibleColIdxs = data.colLabels
    .map((_, i) => i)
    .filter(i => data.levels.some(l => l.columns[i] !== undefined && l.columns[i] !== '—'))

  // Build visible group info for the spanning header row
  const visibleGroups: Array<{ title?: string; visibleCount: number }> = []
  {
    let colOffset = 0
    for (const g of data.colGroups) {
      const count = visibleColIdxs.filter(i => i >= colOffset && i < colOffset + g.count).length
      if (count > 0) visibleGroups.push({ title: g.title, visibleCount: count })
      colOffset += g.count
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-amber-100">
            {data.name} Progression
            {data.subclassName && <span className="text-purple-300/80"> · {data.subclassName}</span>}
          </h2>
          <p className="text-[10px] text-amber-700/50 uppercase tracking-widest">
            d{data.hitDie} Hit Die · {data.source}
          </p>
          {subclass && !data.subclassName && (
            <p className="text-[10px] text-red-400/60 mt-1">
              Subclass "{subclass}" not found for this edition.
              {data.subclasses.length > 0 && (
                <span className="text-amber-700/60"> Try: {data.subclasses.map(s => s.name).join(', ')}</span>
              )}
            </p>
          )}
        </div>
        <EditionToggle value={edition} onChange={v => { if (v !== 'all') setEdition(v) }} />
      </div>

      {/* Feature detail panel */}
      {selected && <FeatureDetail feature={selected} />}

      {/* Progression table */}
      <div className="overflow-x-auto rounded-xl border border-amber-800/25">
        <table className="w-full text-xs border-collapse">
          <thead>
            {/* Group title row — only rendered if any group has a title */}
            {visibleGroups.some(g => g.title) && (
              <tr className="bg-amber-950/80 text-amber-500/60 text-[8px] uppercase tracking-widest">
                <th colSpan={3} />
                {visibleGroups.map((g, gi) =>
                  g.visibleCount > 0 ? (
                    <th
                      key={gi}
                      colSpan={g.visibleCount}
                      className="px-3 py-1 text-center border-l border-amber-800/30 whitespace-nowrap"
                    >
                      {g.title ?? ''}
                    </th>
                  ) : null
                )}
              </tr>
            )}
            <tr className="bg-amber-950/70 text-amber-600/70 uppercase tracking-widest text-[9px]">
              <th className="px-3 py-2 text-left w-12">Level</th>
              <th className="px-3 py-2 text-center w-10">Prof</th>
              <th className="px-3 py-2 text-left">Features</th>
              {visibleColIdxs.map(i => (
                <th key={i} className="px-3 py-2 text-center whitespace-nowrap">{data.colLabels[i]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.levels.map(row => {
              const isHighlighted = [1, 5, 11, 17].includes(row.level)
              return (
                <tr
                  key={row.level}
                  className={`border-t border-amber-900/30 transition-colors ${
                    isHighlighted ? 'bg-amber-950/50' : 'hover:bg-amber-950/30'
                  }`}
                >
                  {/* Level */}
                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold ${isHighlighted ? 'text-amber-300' : 'text-amber-500/70'}`}>
                      {row.level}
                    </span>
                  </td>

                  {/* Prof bonus */}
                  <td className={`px-3 py-2 text-center font-mono font-bold ${PROF_COLOR[row.level]}`}>
                    +{row.profBonus}
                  </td>

                  {/* Features */}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.features.map(name => {
                        const hasDesc = data.featureMap.has(`${name}|${row.level}`) ||
                          [...data.featureMap.values()].some(f => f.name === name)
                        const isSelected = selected?.name === name
                        return (
                          <button
                            key={name}
                            onClick={() => toggle(name, row.level)}
                            disabled={!hasDesc}
                            className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                              isSelected
                                ? 'bg-amber-600/30 text-amber-200 border border-amber-500/50'
                                : hasDesc
                                  ? 'text-amber-300/80 hover:text-amber-100 hover:bg-amber-800/30 border border-amber-800/20'
                                  : 'text-amber-600/40 border border-transparent'
                            }`}
                          >
                            {name}
                          </button>
                        )
                      })}
                      {/* Subclass features — purple-tinted */}
                      {row.subclassFeatures.map(name => {
                        const hasDesc = data.featureMap.has(`${name}|${row.level}`) ||
                          [...data.featureMap.values()].some(f => f.name === name)
                        const isSelected = selected?.name === name
                        return (
                          <button
                            key={`sub-${name}`}
                            onClick={() => toggle(name, row.level)}
                            disabled={!hasDesc}
                            title={data.subclassName}
                            className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                              isSelected
                                ? 'bg-purple-600/30 text-purple-100 border border-purple-400/50'
                                : hasDesc
                                  ? 'text-purple-300/80 hover:text-purple-100 hover:bg-purple-800/30 border border-purple-700/30'
                                  : 'text-purple-400/40 border border-transparent'
                            }`}
                          >
                            ◆ {name}
                          </button>
                        )
                      })}
                    </div>
                  </td>

                  {/* Class-specific columns */}
                  {visibleColIdxs.map(i => (
                    <td key={i} className="px-3 py-2 text-center text-amber-400/70 font-mono text-[10px]">
                      {row.columns[i] ?? '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[9px] text-amber-800/40 text-center">
        Click a feature name to view its description · <span className="text-purple-400/60">◆ purple</span> = subclass features · Highlighted rows = ASI levels (1, 5, 11, 17)
      </p>
    </div>
  )
}
