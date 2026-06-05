import { useState, useRef } from 'react'
import type { Character, MapEntry, MapAnnotation } from '../types'
import { v4 as uuid } from '../uuid'
import MapEditor from './MapEditor'
import { saveMapImage, deleteMapImage, compressImage } from '../mapImageStore'

interface Props {
  char: Character
  onChange: (updates: Partial<Character>) => void
}

export default function MapsTab({ char, onChange }: Props) {
  const maps = char.maps ?? []
  const [activeId, setActiveId] = useState<string | null>(maps[0]?.id ?? null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const activeMap = maps.find(m => m.id === activeId) ?? null

  function updateMaps(updated: MapEntry[]) {
    onChange({ maps: updated })
  }

  async function addMap(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const id = uuid()
      await saveMapImage(id, compressed)
      const newMap: MapEntry = { id, name: file.name.replace(/\.[^.]+$/, ''), annotations: [] }
      updateMaps([...maps, newMap])
      setActiveId(id)
    } catch (err) {
      alert('Failed to save image: ' + (err instanceof Error ? err.message : err))
    } finally {
      setUploading(false)
    }
  }

  async function deleteMap(id: string) {
    if (!confirm('Remove this map? Annotations will be lost.')) return
    await deleteMapImage(id)
    const updated = maps.filter(m => m.id !== id)
    updateMaps(updated)
    if (activeId === id) setActiveId(updated[0]?.id ?? null)
  }

  function commitRename(id: string) {
    const name = renameVal.trim()
    if (name) updateMaps(maps.map(m => m.id === id ? { ...m, name } : m))
    setRenamingId(null)
  }

  function updateAnnotations(mapId: string, annotations: MapAnnotation[]) {
    updateMaps(maps.map(m => m.id === mapId ? { ...m, annotations } : m))
  }

  return (
    <div className="flex gap-3" style={{ height: 'calc(100vh - 220px)', minHeight: 420 }}>

      {/* ── Map list sidebar ── */}
      <div className="w-44 flex-shrink-0 flex flex-col gap-1.5">
        <button
          onClick={() => !uploading && fileRef.current?.click()}
          disabled={uploading}
          className="w-full text-xs text-amber-600/50 hover:text-amber-400 border border-dashed border-amber-800/40 hover:border-amber-700/50 rounded-lg py-2 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Processing…' : '+ Upload map'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={addMap}
        />

        <div className="flex-1 overflow-y-auto space-y-0.5">
          {maps.map(m => (
            <div
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-xs ${
                m.id === activeId
                  ? 'bg-amber-800/40 text-amber-200'
                  : 'text-amber-600/50 hover:bg-amber-900/30 hover:text-amber-300'
              }`}
            >
              {renamingId === m.id ? (
                <input
                  autoFocus
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => commitRename(m.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(m.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 bg-amber-900/40 rounded px-1 outline-none text-amber-100 min-w-0"
                />
              ) : (
                <span className="flex-1 truncate">{m.name}</span>
              )}
              <button
                title="Rename"
                onClick={e => { e.stopPropagation(); setRenamingId(m.id); setRenameVal(m.name) }}
                className="opacity-0 group-hover:opacity-100 text-amber-700/50 hover:text-amber-400 transition-opacity flex-shrink-0"
              >
                ✎
              </button>
              <button
                title="Delete"
                onClick={e => { e.stopPropagation(); deleteMap(m.id) }}
                className="opacity-0 group-hover:opacity-100 text-amber-700/50 hover:text-red-400 transition-opacity flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {maps.length > 0 && (
          <p className="text-[9px] text-amber-800/40 text-center px-1 pb-1">
            Images stored locally — not included in JSON exports
          </p>
        )}
      </div>

      {/* ── Editor area ── */}
      <div className="flex-1 min-w-0">
        {activeMap ? (
          <MapEditor
            map={activeMap}
            onAnnotationsChange={ann => updateAnnotations(activeMap.id, ann)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4 opacity-30">🗺️</div>
            <p className="text-amber-700/50 text-sm mb-1">No maps yet</p>
            <p className="text-amber-800/40 text-xs mb-4">Upload a PNG or JPEG of your map</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-amber-500/60 hover:text-amber-400 border border-amber-800/40 hover:border-amber-700/50 rounded-lg px-4 py-2 transition-colors"
            >
              Upload first map
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
