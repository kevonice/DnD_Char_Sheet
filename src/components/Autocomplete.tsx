import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props<T> {
  options: T[]
  getLabel: (item: T) => string
  getSublabel?: (item: T) => string
  onSelect: (item: T) => void
  placeholder?: string
  loading?: boolean
  loadedCount?: number
  className?: string
  toolbar?: React.ReactNode
}

export default function Autocomplete<T>({
  options,
  getLabel,
  getSublabel,
  onSelect,
  placeholder = 'Search...',
  loading = false,
  loadedCount,
  className = '',
  toolbar,
}: Props<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.length < 1
    ? []
    : options
        .filter(o => getLabel(o).toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 40)
        .concat(
          options
            .filter(o =>
              !getLabel(o).toLowerCase().startsWith(query.toLowerCase()) &&
              getLabel(o).toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 20)
        )

  // Compute dropdown position from the input element's bounding rect
  function updateDropdownPos() {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setDropdownPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width })
  }

  const handleSelect = useCallback((item: T) => {
    onSelect(item)
    setQuery('')
    setOpen(false)
    setCursor(0)
  }, [onSelect])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[cursor]) handleSelect(filtered[cursor]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  const dropdown = open && filtered.length > 0 && dropdownPos
    ? createPortal(
        <div
          ref={listRef}
          style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="max-h-56 overflow-y-auto bg-[#1e1206] border border-amber-700/50 rounded shadow-2xl"
        >
          {filtered.map((item, i) => (
            <button
              key={i}
              onMouseDown={() => handleSelect(item)}
              onMouseEnter={() => setCursor(i)}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                i === cursor ? 'bg-amber-800/40 text-amber-100' : 'text-amber-200/80 hover:bg-amber-900/50'
              }`}
            >
              <span className="font-medium">{getLabel(item)}</span>
              {getSublabel && (
                <span className="text-amber-500/60 ml-2 shrink-0">{getSublabel(item)}</span>
              )}
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <div ref={containerRef} className={className}>
      {toolbar && <div className="mb-1 flex items-center gap-2">
        {toolbar}
        {!loading && loadedCount !== undefined && (
          <span className="text-[9px] text-amber-700/50">{loadedCount} items</span>
        )}
      </div>}
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            setCursor(0)
            updateDropdownPos()
          }}
          onFocus={() => { if (query) { setOpen(true); updateDropdownPos() } }}
          onKeyDown={onKeyDown}
          placeholder={loading ? 'Loading 5e.tools data…' : placeholder}
          disabled={loading}
          className="w-full bg-amber-950/30 border border-amber-800/40 rounded px-2 py-1.5 text-sm text-amber-100 placeholder-amber-700/60 focus:border-amber-500 transition-colors disabled:opacity-50"
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-600/50 text-xs animate-pulse">⟳</span>
        )}
      </div>
      {dropdown}
    </div>
  )
}
