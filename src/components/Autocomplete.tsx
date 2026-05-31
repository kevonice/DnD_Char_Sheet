import { useState, useRef, useEffect, useCallback } from 'react'

interface Props<T> {
  options: T[]
  getLabel: (item: T) => string
  getSublabel?: (item: T) => string
  onSelect: (item: T) => void
  placeholder?: string
  loading?: boolean
  className?: string
}

export default function Autocomplete<T>({
  options,
  getLabel,
  getSublabel,
  onSelect,
  placeholder = 'Search...',
  loading = false,
  className = '',
}: Props<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.length < 1
    ? []
    : options
        .filter(o => getLabel(o).toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 40)
        // then also include fuzzy contains matches after prefix matches
        .concat(
          options
            .filter(o =>
              !getLabel(o).toLowerCase().startsWith(query.toLowerCase()) &&
              getLabel(o).toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 20)
        )

  const handleSelect = useCallback((item: T) => {
    onSelect(item)
    setQuery('')
    setOpen(false)
    setCursor(0)
  }, [onSelect])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll cursor item into view
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[cursor]) handleSelect(filtered[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            setCursor(0)
          }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={loading ? 'Loading data...' : placeholder}
          disabled={loading}
          className="w-full bg-amber-950/30 border border-amber-800/40 rounded px-2 py-1.5 text-sm text-amber-100 placeholder-amber-700/60 focus:border-amber-500 transition-colors disabled:opacity-50"
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-600/50 text-xs animate-pulse">
            ⟳
          </span>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-[#1e1206] border border-amber-700/50 rounded shadow-2xl"
        >
          {filtered.map((item, i) => (
            <button
              key={i}
              onMouseDown={() => handleSelect(item)}
              onMouseEnter={() => setCursor(i)}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                i === cursor
                  ? 'bg-amber-800/40 text-amber-100'
                  : 'text-amber-200/80 hover:bg-amber-900/50'
              }`}
            >
              <span className="font-medium">{getLabel(item)}</span>
              {getSublabel && (
                <span className="text-amber-500/60 ml-2 shrink-0">{getSublabel(item)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
