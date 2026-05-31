import { CONDITIONS } from '../utils'

interface Props {
  conditions: string[]
  exhaustion: number
  onToggle: (condition: string) => void
  onExhaustion: (level: number) => void
}

export default function ConditionsTracker({ conditions, exhaustion, onToggle, onExhaustion }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {CONDITIONS.map(cond => {
          const active = conditions.includes(cond)
          return (
            <button
              key={cond}
              onClick={() => onToggle(cond)}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                active
                  ? 'bg-red-500/25 border-red-400/70 text-red-200'
                  : 'border-amber-800/40 text-amber-700/60 hover:border-amber-600/60 hover:text-amber-400'
              }`}
            >
              {cond}
            </button>
          )
        })}
      </div>

      {/* Exhaustion track */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] uppercase tracking-widest text-amber-600/70">Exhaustion</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(lvl => (
            <button
              key={lvl}
              onClick={() => onExhaustion(exhaustion === lvl ? lvl - 1 : lvl)}
              title={`Level ${lvl}`}
              className={`w-5 h-5 rounded text-[10px] font-bold border transition-colors ${
                lvl <= exhaustion
                  ? 'bg-red-600/40 border-red-400/70 text-red-100'
                  : 'border-amber-800/40 text-amber-700/50 hover:border-amber-600/60'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
