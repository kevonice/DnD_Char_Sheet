import { useState } from 'react'
import type { PlayerEntry, Snapshot } from '../../data/dmStore'
import { diffSheets, type DiffGroup, type DiffLine } from '../../data/sheetDiff'

interface Props {
  players: PlayerEntry[]
  snapshots: Snapshot[]                       // all snapshots in the campaign, oldest first
  onRelabel: (oldLabel: string, newLabel: string) => void
  onDeleteSnapshot: (id: string) => void
}

const selectStyle = { background: 'var(--color-amber-950)', color: 'var(--color-amber-200)' }
const toneClass: Record<DiffLine['tone'], string> = { good: 'text-green-300', bad: 'text-red-300', neutral: 'text-amber-200/90' }
const when = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** Snapshot labels in the order they were first used ("Session 1 start", "Session 1 end", …). */
export function labelsInOrder(snapshots: Snapshot[]): string[] {
  return [...new Map(snapshots.map(s => [s.label, s])).keys()]
}

function Group({ g }: { g: DiffGroup }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-amber-600/80 font-bold mb-0.5">{g.title}</div>
      <ul className="space-y-0.5">{g.lines.map((l, i) => <li key={i} className={`text-xs ${toneClass[l.tone]}`}>{l.text}</li>)}</ul>
    </div>
  )
}

function PlayerDiff({ name, from, to }: { name: string; from?: Snapshot; to?: Snapshot }) {
  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
      <span className="text-base font-bold text-amber-100">{name}</span>
      {from && to && <span className="text-[11px] text-amber-600/80">{from.label} ({when(from.takenAt)}) → {to.label} ({when(to.takenAt)})</span>}
    </div>
  )
  if (!from || !to) {
    return (
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/30 p-3">
        {header}
        <p className="text-xs text-amber-700/80">{!to ? 'No sheet with the later label.' : 'No sheet with the earlier label: this is their first one.'}</p>
      </div>
    )
  }
  const groups = diffSheets(from.data, to.data)
  const primary = groups.filter(g => g.primary)
  const secondary = groups.filter(g => !g.primary)
  return (
    <div className="rounded-xl border border-amber-800/40 bg-amber-950/40 p-3">
      {header}
      {groups.length === 0 && <p className="text-xs text-amber-600/80">No changes.</p>}
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">{primary.map(g => <Group key={g.key} g={g} />)}</div>
      {secondary.length > 0 && (
        <details className="mt-2 rounded-lg border border-amber-900/40 px-2.5 py-1.5">
          <summary className="cursor-pointer text-xs text-amber-400">
            Level-ups &amp; other changes ({secondary.reduce((n, g) => n + g.lines.length, 0)}): {secondary.map(g => g.title).join(', ')}
          </summary>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">{secondary.map(g => <Group key={g.key} g={g} />)}</div>
        </details>
      )}
    </div>
  )
}

export default function ChangesView({ players, snapshots, onRelabel, onDeleteSnapshot }: Props) {
  const labels = labelsInOrder(snapshots)
  const [mode, setMode] = useState<string>('party')       // 'party' or a playerKey
  const [fromLabel, setFromLabel] = useState<string | null>(null)
  const [toLabel, setToLabel] = useState<string | null>(null)
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const latestWith = (key: string, label: string) =>
    [...snapshots].reverse().find(s => s.playerKey === key && s.label === label)
  const nameOf = (key: string) => [...snapshots].reverse().find(s => s.playerKey === key)?.data.name || key

  if (labels.length === 0) return <p className="text-sm text-amber-600/70 text-center py-16">No sheets imported yet.</p>

  const fL = fromLabel && labels.includes(fromLabel) ? fromLabel : labels[Math.max(0, labels.length - 2)]
  const tL = toLabel && labels.includes(toLabel) ? toLabel : labels[labels.length - 1]
  const playerSnaps = mode === 'party' ? [] : snapshots.filter(s => s.playerKey === mode)
  const fS = playerSnaps.find(s => s.id === fromId) ?? playerSnaps[playerSnaps.length - 2]
  const tS = playerSnaps.find(s => s.id === toId) ?? playerSnaps[playerSnaps.length - 1]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-800/30 bg-amber-950/40 p-2.5 text-xs">
        <select value={mode} onChange={e => { setMode(e.target.value); setFromId(null); setToId(null) }} style={selectStyle}
          className="rounded border border-amber-800/50 px-2 py-1 font-bold">
          <option value="party">Whole party</option>
          {players.map(p => <option key={p.key} value={p.key}>{nameOf(p.key)}</option>)}
        </select>
        <span className="text-amber-500">from</span>
        {mode === 'party' ? (
          <>
            <select value={fL} onChange={e => setFromLabel(e.target.value)} style={selectStyle} className="rounded border border-amber-800/50 px-2 py-1">
              {labels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span className="text-amber-500">to</span>
            <select value={tL} onChange={e => setToLabel(e.target.value)} style={selectStyle} className="rounded border border-amber-800/50 px-2 py-1">
              {labels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </>
        ) : (
          <>
            <select value={fS?.id ?? ''} onChange={e => setFromId(e.target.value)} style={selectStyle} className="rounded border border-amber-800/50 px-2 py-1">
              {playerSnaps.map(s => <option key={s.id} value={s.id}>{s.label} · {when(s.takenAt)}</option>)}
            </select>
            <span className="text-amber-500">to</span>
            <select value={tS?.id ?? ''} onChange={e => setToId(e.target.value)} style={selectStyle} className="rounded border border-amber-800/50 px-2 py-1">
              {playerSnaps.map(s => <option key={s.id} value={s.id}>{s.label} · {when(s.takenAt)}</option>)}
            </select>
          </>
        )}
      </div>

      {mode === 'party'
        ? (fL === tL
            ? <p className="text-xs text-amber-600/80">Pick two different imports to compare. Import the players' sheets again after a session to see what changed.</p>
            : players.map(p => <PlayerDiff key={p.key} name={nameOf(p.key)} from={latestWith(p.key, fL)} to={latestWith(p.key, tL)} />))
        : playerSnaps.length < 2
          ? <p className="text-xs text-amber-600/80">Only one sheet so far for {nameOf(mode)}. Import a newer one to see changes.</p>
          : <PlayerDiff name={nameOf(mode)} from={fS} to={tS} />}

      <details className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3">
        <summary className="cursor-pointer text-xs text-amber-400 font-bold">Manage imports ({snapshots.length} sheets)</summary>
        <div className="mt-2 space-y-2">
          {labels.map(l => (
            <div key={l} className="text-xs">
              <div className="flex items-center gap-2">
                {renaming === l ? (
                  <>
                    <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                      className="bg-amber-950/60 border border-amber-700/50 rounded px-2 py-0.5 text-amber-100" />
                    <button onClick={() => { if (draft.trim() && draft.trim() !== l) onRelabel(l, draft.trim()); setRenaming(null) }} className="text-green-400">Save</button>
                    <button onClick={() => setRenaming(null)} className="text-amber-600">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-amber-200">{l}</span>
                    <button onClick={() => { setRenaming(l); setDraft(l) }} className="text-amber-600 hover:text-amber-300">✎ rename</button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {snapshots.filter(s => s.label === l).map(s => (
                  <span key={s.id} className="px-2 py-0.5 rounded-full border border-amber-800/40 text-amber-300/90">
                    {s.data.name || 'Unnamed'} · {when(s.takenAt)}
                    <button title="Delete this sheet" onClick={() => confirm(`Delete ${s.data.name}'s “${s.label}” sheet?`) && onDeleteSnapshot(s.id)}
                      className="ml-1.5 text-amber-700 hover:text-red-400">✕</button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
