interface Props {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: 'text' | 'number'
  className?: string
}

export default function FieldInput({ label, value, onChange, type = 'text', className = '' }: Props) {
  return (
    <div className={`flex flex-col ${className}`}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-amber-950/30 border border-amber-800/40 rounded px-2 py-1 text-sm text-amber-100 focus:border-amber-500 transition-colors"
      />
      <label className="text-[10px] text-amber-600/70 uppercase tracking-wider mt-1 text-center">
        {label}
      </label>
    </div>
  )
}
