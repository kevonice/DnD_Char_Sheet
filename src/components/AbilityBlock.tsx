import { ABILITY_KEYS, ABILITY_LABELS, modStr } from '../utils'
import type { AbilityScores } from '../types'

interface Props {
  abilities: AbilityScores
  onChange: (key: keyof AbilityScores, value: number) => void
}

export default function AbilityBlock({ abilities, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ABILITY_KEYS.map(key => {
        const score = abilities[key]
        const mod = modStr(score)
        return (
          <div
            key={key}
            className="flex flex-col items-center bg-amber-950/40 border border-amber-800/40 rounded-lg py-2 px-1"
          >
            <span className="text-[10px] uppercase tracking-widest text-amber-500/70 mb-1">
              {ABILITY_LABELS[key].slice(0, 3)}
            </span>
            <span className="text-2xl font-bold text-amber-100">{mod}</span>
            <input
              type="number"
              min={1}
              max={30}
              value={score}
              onChange={e => onChange(key, Number(e.target.value))}
              className="w-10 text-center text-xs bg-amber-900/30 border border-amber-800/30 rounded mt-1 py-0.5 text-amber-300"
            />
          </div>
        )
      })}
    </div>
  )
}
