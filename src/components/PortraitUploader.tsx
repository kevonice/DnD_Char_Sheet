import { useState, useRef } from 'react'

interface Props {
  portrait?: string
  characterName?: string
  onChange: (url: string) => void
}

export default function PortraitUploader({ portrait, characterName, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      onChange(ev.target?.result as string)
      setOpen(false)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  function handleUrl() {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('URL must start with http:// or https://')
      return
    }
    onChange(trimmed)
    setUrlInput('')
    setOpen(false)
    setError('')
  }

  function handleRemove() {
    onChange('')
    setOpen(false)
  }

  const initials = characterName
    ? characterName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="relative flex-shrink-0">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Set portrait"
        className="w-16 h-16 rounded-xl border-2 border-amber-800/50 hover:border-amber-600/60 overflow-hidden bg-amber-950/60 flex items-center justify-center transition-colors flex-shrink-0"
      >
        {portrait ? (
          <img src={portrait} alt="Portrait" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-amber-700/60">{initials}</span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-[#1a1008] border border-amber-700/50 rounded-xl shadow-2xl p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-amber-600/70 font-bold">Portrait</p>

            {/* File upload */}
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2 rounded-lg border border-dashed border-amber-700/40 text-xs text-amber-500/70 hover:border-amber-500/60 hover:text-amber-400 transition-colors"
              >
                Upload image (max 2 MB)
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>

            {/* URL paste */}
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleUrl()}
                placeholder="Paste image URL…"
                className="flex-1 bg-amber-950/60 border border-amber-800/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-100 placeholder-amber-800/40 focus:outline-none focus:border-amber-600/50"
              />
              <button
                onClick={handleUrl}
                className="px-3 py-1.5 bg-amber-700/50 hover:bg-amber-600/60 rounded-lg text-xs text-amber-100 font-bold transition-colors"
              >
                Set
              </button>
            </div>

            {error && <p className="text-red-400/80 text-[10px]">{error}</p>}

            {portrait && (
              <button
                onClick={handleRemove}
                className="text-[10px] text-amber-800/60 hover:text-red-400/70 underline decoration-dotted transition-colors"
              >
                Remove portrait
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
