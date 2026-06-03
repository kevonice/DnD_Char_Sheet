import { useState } from 'react'
import { CONDITIONS, CONDITION_DESC } from '../utils'

interface Props {
  conditions: string[]
  exhaustion: number
  onToggle: (condition: string) => void
  onExhaustion: (level: number) => void
}

const EXHAUSTION_DESC = [
  'Disadvantage on ability checks',
  'Speed halved',
  'Disadvantage on attack rolls and saving throws',
  'Hit point maximum halved',
  'Speed reduced to 0',
  'Death',
]

export default function ConditionsTracker({ conditions, exhaustion, onToggle, onExhaustion }: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {CONDITIONS.map(cond => {
          const active = conditions.includes(cond)
          const isShowing = tooltip === cond
          return (
            <div key={cond} className="relative">
              <button
                onClick={() => onToggle(cond)}
                onMouseEnter={() => setTooltip(cond)}
                onMouseLeave={() => setTooltip(null)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-red-500/25 border-red-400/70 text-red-200'
                    : 'border-amber-800/40 text-amber-700/60 hover:border-amber-600/60 hover:text-amber-400'
                }`}
              >
                {cond}
              </button>

              {isShowing && CONDITION_DESC[cond] && (
                <div className="absolute bottom-full left-0 mb-1.5 z-50 w-64 bg-[#1a1008] border border-amber-700/50 rounded-lg shadow-2xl p-2.5 pointer-events-none">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1.5">
                    {cond}
                  </div>
                  <ul className="space-y-1">
                    {CONDITION_DESC[cond].map((line, i) => (
                      <li key={i} className="flex gap-1.5 text-[10px] text-amber-200/70 leading-snug">
                        <span className="text-amber-600/60 mt-px flex-shrink-0">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  {/* arrow */}
                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-700/50" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Exhaustion track */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] uppercase tracking-widest text-amber-600/70">Exhaustion</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(lvl => (
            <div key={lvl} className="relative">
              <button
                onClick={() => onExhaustion(exhaustion === lvl ? lvl - 1 : lvl)}
                onMouseEnter={() => setTooltip(`exhaustion-${lvl}`)}
                onMouseLeave={() => setTooltip(null)}
                className={`w-5 h-5 rounded text-[10px] font-bold border transition-colors ${
                  lvl <= exhaustion
                    ? 'bg-red-600/40 border-red-400/70 text-red-100'
                    : 'border-amber-800/40 text-amber-700/50 hover:border-amber-600/60'
                }`}
              >
                {lvl}
              </button>
              {tooltip === `exhaustion-${lvl}` && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-52 bg-[#1a1008] border border-amber-700/50 rounded-lg shadow-2xl p-2.5 pointer-events-none">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">
                    Exhaustion {lvl}
                  </div>
                  <ul className="space-y-0.5">
                    {EXHAUSTION_DESC.slice(0, lvl).map((line, i) => (
                      <li key={i} className={`flex gap-1.5 text-[10px] leading-snug ${i === lvl - 1 ? 'text-amber-200/80' : 'text-amber-700/50'}`}>
                        <span className={`mt-px flex-shrink-0 ${i === lvl - 1 ? 'text-red-400/70' : 'text-amber-800/50'}`}>•</span>
                        <span>Lvl {i + 1}: {line}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-700/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
