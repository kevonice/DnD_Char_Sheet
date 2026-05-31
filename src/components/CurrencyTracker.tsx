import type { Currency } from '../types'

interface Props {
  currency: Currency
  onChange: (currency: Currency) => void
}

const COINS: { key: keyof Currency; label: string; color: string }[] = [
  { key: 'cp', label: 'CP', color: 'text-orange-400' },
  { key: 'sp', label: 'SP', color: 'text-gray-300' },
  { key: 'ep', label: 'EP', color: 'text-lime-300' },
  { key: 'gp', label: 'GP', color: 'text-yellow-400' },
  { key: 'pp', label: 'PP', color: 'text-cyan-200' },
]

export default function CurrencyTracker({ currency, onChange }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {COINS.map(({ key, label, color }) => (
        <div
          key={key}
          className="flex flex-col items-center bg-amber-950/40 border border-amber-800/40 rounded py-1.5"
        >
          <input
            type="number"
            min={0}
            value={currency[key]}
            onChange={e => onChange({ ...currency, [key]: Number(e.target.value) })}
            className="w-12 text-center text-sm font-bold bg-transparent text-amber-100"
          />
          <span className={`text-[9px] font-bold tracking-wider ${color}`}>{label}</span>
        </div>
      ))}
    </div>
  )
}
