import { useState } from 'react'
import type { BoardTile, PlayerEntry, SectionKey, Snapshot } from '../../data/dmStore'
import { v4 as uuid } from '../../uuid'
import { SECTIONS, SectionView } from './sections'

interface Props {
  players: PlayerEntry[]
  latest: Map<string, Snapshot>          // playerKey → newest snapshot
  tiles: BoardTile[]
  onTiles: (tiles: BoardTile[]) => void
}

const selectStyle = { background: 'var(--color-amber-950)', color: 'var(--color-amber-200)' }

export default function CompareBoard({ players, latest, tiles, onTiles }: Props) {
  const [everyone, setEveryone] = useState<SectionKey>('overview')
  const nameOf = (key: string) => latest.get(key)?.data.name || key

  const patch = (id: string, p: Partial<BoardTile>) => onTiles(tiles.map(t => (t.id === id ? { ...t, ...p } : t)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= tiles.length) return
    const next = [...tiles]
    ;[next[i], next[j]] = [next[j], next[i]]
    onTiles(next)
  }

  if (!players.length) {
    return <p className="text-sm text-amber-600/70 text-center py-16">Import your players' sheets first; then build a board to compare them.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-800/30 bg-amber-950/40 p-2.5">
        <span className="text-xs text-amber-400">Compare everyone on</span>
        <select value={everyone} onChange={e => setEveryone(e.target.value as SectionKey)} style={selectStyle}
          className="text-xs rounded border border-amber-800/50 px-2 py-1">
          {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
        </select>
        <button onClick={() => onTiles(players.map(p => ({ id: uuid(), playerKey: p.key, section: everyone })))}
          className="px-2.5 py-1 rounded bg-amber-700/50 hover:bg-amber-600/60 text-amber-100 text-xs font-bold">Show side by side</button>
        <span className="flex-1" />
        <button onClick={() => onTiles([...tiles, { id: uuid(), playerKey: players[0].key, section: 'overview' }])}
          className="px-2.5 py-1 rounded border border-amber-600/60 text-amber-200 text-xs font-bold hover:bg-amber-800/30">＋ Add panel</button>
        {tiles.length > 0 && (
          <button onClick={() => confirm('Remove every panel from the board?') && onTiles([])}
            className="px-2.5 py-1 rounded border border-red-900/50 text-red-400/80 text-xs hover:text-red-300">Clear</button>
        )}
      </div>

      {tiles.length === 0 ? (
        <div className="text-center py-14 text-amber-600/70 text-sm border border-dashed border-amber-800/40 rounded-xl">
          Pick a section above and press <b>Show side by side</b>, or add panels one at a time with <b>＋ Add panel</b><br />
          (e.g. one player's background next to another's equipment).
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">
          {tiles.map((t, i) => {
            const snap = latest.get(t.playerKey)
            return (
              <div key={t.id} className={`rounded-xl border border-amber-800/40 bg-amber-950/40 flex flex-col min-w-0 ${t.wide ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center gap-1 p-2 border-b border-amber-900/50">
                  <select value={t.playerKey} onChange={e => patch(t.id, { playerKey: e.target.value })} style={selectStyle}
                    className="min-w-0 flex-1 text-xs font-bold rounded border border-amber-800/50 px-1.5 py-1">
                    {players.map(p => <option key={p.key} value={p.key}>{nameOf(p.key)}{p.playerName ? ` (${p.playerName})` : ''}</option>)}
                  </select>
                  <select value={t.section} onChange={e => patch(t.id, { section: e.target.value as SectionKey })} style={selectStyle}
                    className="min-w-0 flex-1 text-xs rounded border border-amber-800/50 px-1.5 py-1">
                    {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                  </select>
                  <button title="Move left" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-amber-600 disabled:opacity-20">◀</button>
                  <button title="Move right" onClick={() => move(i, 1)} disabled={i === tiles.length - 1} className="px-1 text-amber-600 disabled:opacity-20">▶</button>
                  <button title={t.wide ? 'Make narrow' : 'Make wide'} onClick={() => patch(t.id, { wide: !t.wide })} className="hidden md:block px-1 text-amber-600">{t.wide ? '⇥⇤' : '⇤⇥'}</button>
                  <button title="Remove panel" onClick={() => onTiles(tiles.filter(x => x.id !== t.id))} className="px-1 text-amber-700 hover:text-red-400">✕</button>
                </div>
                <div className="p-3 overflow-y-auto max-h-[60vh]">
                  {snap ? <SectionView section={t.section} char={snap.data} /> : <p className="text-xs text-amber-700/70">No sheet for this player.</p>}
                </div>
                {snap && <div className="px-3 pb-2 text-[10px] text-amber-700/80">From “{snap.label}”</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
