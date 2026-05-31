import { ABILITY_KEYS, ABILITY_LABELS, saveBonus } from '../utils'
import type { AbilityKey, AbilityScores } from '../types'

interface Props {
  abilities: AbilityScores
  savingThrows: Record<AbilityKey, boolean>
  level: number
  onChange: (key: AbilityKey, val: boolean) => void
}

export default function SavingThrows({ abilities, savingThrows, level, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-1">
      {ABILITY_KEYS.map(key => {
        const proficient = savingThrows[key]
        const bonus = saveBonus(key, abilities, proficient, level)
        return (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => onChange(key, !proficient)}
              className={`w-3 h-3 rounded-full border flex-shrink-0 transition-colors ${
                proficient ? 'bg-amber-400 border-amber-400' : 'border-amber-700/50 hover:border-amber-500'
              }`}
            />
            <span className="w-5 text-amber-500/60">{bonus}</span>
            <span className="text-amber-100">{ABILITY_LABELS[key].slice(0, 3)}</span>
          </div>
        )
      })}
    </div>
  )
}
