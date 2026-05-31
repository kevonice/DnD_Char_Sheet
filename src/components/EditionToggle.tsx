import type { Edition } from '../data/fiveEtools'

interface Props {
  value: Edition
  onChange: (e: Edition) => void
}

const OPTIONS: { key: Edition; label: string; title: string }[] = [
  { key: '2014', label: '2014', title: 'PHB, Xanathar’s, Tasha’s' },
  { key: '2024', label: '2024', title: '2024 Player’s Handbook' },
  { key: 'all', label: 'All', title: 'Every source' },
]

export default function EditionToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded border border-amber-800/40 overflow-hidden text-[10px]">
      {OPTIONS.map(opt => (
        <button
          key={opt.key}
          title={opt.title}
          onClick={() => onChange(opt.key)}
          className={`px-2 py-0.5 uppercase tracking-wider font-bold transition-colors ${
            value === opt.key
              ? 'bg-amber-600/40 text-amber-100'
              : 'text-amber-700/60 hover:text-amber-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
