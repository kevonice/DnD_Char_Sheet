import { useState, useEffect, useMemo } from 'react'
import type { Character, ChangelogEntry, ChangeCategory } from '../types'
import { modifier, passivePerception } from '../utils'
import { v4 as uuid } from '../uuid'
import {
  deleteCampaign, deleteSnapshot, exportCampaign, importCampaign, listSnapshots, makeCampaign,
  normalizeCharacter, openCampaigns, playerKeyOf, putCampaign, putSnapshot,
  type Campaign, type InitiativeEntry, type Snapshot,
} from '../data/dmStore'
import CompareBoard from './dm/CompareBoard'
import ChangesView, { labelsInOrder } from './dm/ChangesView'

const ACTIVE_KEY = 'dnd5e_dm_active_campaign'
type DmTab = 'party' | 'compare' | 'changes' | 'chronicle'

const CATEGORY_META: Record<ChangeCategory, { label: string; color: string }> = {
  combat:      { label: 'Combat',      color: 'text-red-400' },
  inventory:   { label: 'Inventory',   color: 'text-green-400' },
  magic:       { label: 'Magic',       color: 'text-purple-400' },
  progression: { label: 'Progression', color: 'text-amber-300' },
  note:        { label: 'Notes',       color: 'text-blue-400' },
}

const hpColor = (pct: number) => (pct > 0.5 ? 'bg-green-500/70' : pct > 0.25 ? 'bg-yellow-500/70' : 'bg-red-500/80')
const when = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/** Next label after the last one: "Session 2 start" → "Session 2 end" → "Session 3 start". */
function labelOptions(labels: string[]): string[] {
  const last = [...labels].reverse().map(l => l.match(/^Session (\d+) (start|end)$/i)).find(Boolean)
  if (!last) return labels.length ? [`Session ${labels.length + 1} start`, 'Campaign start'] : ['Session 1 start', 'Campaign start']
  const n = Number(last[1])
  return /start/i.test(last[2])
    ? [`Session ${n} end`, `Session ${n + 1} start`]
    : [`Session ${n + 1} start`, `Session ${n} end`]
}

// ── Party member card ─────────────────────────────────────────────────────────

function PartyCard({ char, snap, count, playerName, dmNote, onPlayerName, onDmNote, onRemove, expanded, onToggle }: {
  char: Character
  snap: Snapshot
  count: number
  playerName: string
  dmNote: string
  onPlayerName: (v: string) => void
  onDmNote: (v: string) => void
  onRemove: () => void
  expanded: boolean
  onToggle: () => void
}) {
  const hpPct = char.maxHp > 0 ? Math.max(0, Math.min(1, char.currentHp / char.maxHp)) : 0
  const pp = passivePerception(char.abilities, char.skills?.Perception ?? { proficient: false, expertise: false }, char.level)
  const slots = Object.entries(char.spellSlots ?? {}).filter(([, s]) => s.max + (s.bonus ?? 0) > 0)
  const dying = char.currentHp <= 0 && char.maxHp > 0

  return (
    <div className={`rounded-xl border transition-colors ${dying ? 'border-red-700/60 bg-red-950/20' : 'border-amber-800/30 bg-amber-950/40'}`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        {char.portrait
          ? <img src={char.portrait} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-lg bg-amber-900/50 flex items-center justify-center text-lg shrink-0">⚔️</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-100 truncate">{char.name || 'Unnamed'}</span>
            {playerName && <span className="text-[10px] text-amber-500/80 truncate">({playerName})</span>}
            {dying && <span className="text-[9px] uppercase tracking-widest text-red-400 font-bold animate-pulse">Down!</span>}
            {char.inspiration && <span title="Has inspiration" className="text-amber-400 text-xs">★</span>}
          </div>
          <div className="text-[10px] text-amber-600/70 truncate">
            {char.class}{char.subclass ? ` (${char.subclass})` : ''} · Lv {char.level} · {char.race}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0 text-center">
          <div><div className="text-sm font-bold text-amber-200">{char.ac}</div><div className="text-[8px] uppercase tracking-widest text-amber-700/60">AC</div></div>
          <div><div className="text-sm font-bold text-amber-200">{pp}</div><div className="text-[8px] uppercase tracking-widest text-amber-700/60">Pass. Per</div></div>
        </div>
        <div className="w-20 sm:w-24 shrink-0">
          <div className="text-[10px] text-amber-300 font-mono mb-0.5">{char.currentHp}/{char.maxHp}{char.tempHp > 0 ? ` +${char.tempHp}` : ''}</div>
          <div className="h-1.5 bg-amber-950 rounded-full overflow-hidden border border-amber-900/50">
            <div className={`h-full rounded-full ${hpColor(hpPct)}`} style={{ width: `${hpPct * 100}%` }} />
          </div>
        </div>
        <span className="text-amber-700/50 text-xs shrink-0">{expanded ? '▼' : '▶'}</span>
      </div>

      {(char.conditions.length > 0 || char.exhaustion > 0 || slots.length > 0) && (
        <div className="px-3 pb-2 flex flex-wrap gap-1 -mt-1">
          {char.conditions.map(c => <span key={c} className="px-1.5 py-0.5 rounded text-[9px] bg-red-900/40 text-red-300 border border-red-800/40">{c}</span>)}
          {char.exhaustion > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-900/40 text-orange-300">Exhaustion {char.exhaustion}</span>}
          {slots.map(([l, s]) => (
            <span key={l} className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950/40 text-purple-300 border border-purple-800/30 font-mono">
              L{l} {s.max + (s.bonus ?? 0) - s.used}/{s.max + (s.bonus ?? 0)}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="border-t border-amber-800/25 p-3 space-y-2">
          <label className="block">
            <span className="text-[9px] uppercase tracking-widest text-amber-700/80">Played by</span>
            <input value={playerName} onChange={e => onPlayerName(e.target.value)} placeholder="Player's name"
              className="mt-0.5 w-full bg-amber-950/60 border border-amber-800/30 rounded-lg px-2 py-1 text-xs text-amber-200 placeholder:text-amber-800/50 focus:outline-none focus:border-amber-700/50" />
          </label>
          <label className="block">
            <span className="text-[9px] uppercase tracking-widest text-amber-700/80">🔒 DM notes (private, never in the players' files)</span>
            <textarea value={dmNote} onChange={e => onDmNote(e.target.value)} rows={3} placeholder="Secrets, plot hooks, patron clauses…"
              className="mt-0.5 w-full bg-amber-950/60 border border-amber-800/30 rounded-lg p-2 text-xs text-amber-200/90 placeholder:text-amber-800/50 focus:outline-none focus:border-amber-700/50 resize-y" />
          </label>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-amber-700/80">Latest: “{snap.label}” ({when(snap.takenAt)}) · {count} sheet{count === 1 ? '' : 's'} on file</span>
            <span className="flex-1" />
            <button onClick={onRemove} className="px-2 py-1 rounded border border-red-900/40 text-red-500/70 hover:text-red-400">✕ Remove from campaign</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Initiative tracker (kept for combat nights) ───────────────────────────────

function InitiativeTracker({ campaign, characters, onChange }: {
  campaign: Campaign
  characters: Character[]
  onChange: (patch: Partial<Campaign>) => void
}) {
  const [newName, setNewName] = useState('')
  const [newInit, setNewInit] = useState('')
  const sorted = [...campaign.initiative].sort((a, b) => b.init - a.init)
  const add = (e: Omit<InitiativeEntry, 'id'>) => onChange({ initiative: [...campaign.initiative, { id: uuid(), ...e }] })
  const patchEntry = (id: string, p: Partial<InitiativeEntry>) => onChange({ initiative: campaign.initiative.map(e => (e.id === id ? { ...e, ...p } : e)) })
  const addCustom = () => {
    if (!newName.trim()) return
    add({ name: newName.trim(), init: Number(newInit) || 0, isPC: false })
    setNewName(''); setNewInit('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {characters.filter(c => !campaign.initiative.some(e => e.isPC && e.name === c.name)).map(c => (
          <button key={c.name} onClick={() => add({ name: c.name, init: modifier(c.abilities.dex) + 10, isPC: true, hp: c.currentHp, maxHp: c.maxHp })}
            className="px-2 py-0.5 rounded text-[10px] border border-amber-800/40 text-amber-500/80 hover:text-amber-300">+ {c.name || 'Unnamed'}</button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()} placeholder="Monster / NPC name"
          className="flex-1 min-w-0 bg-amber-950/60 border border-amber-800/30 rounded-lg px-2 py-1 text-xs text-amber-200 placeholder:text-amber-800/40 focus:outline-none" />
        <input value={newInit} onChange={e => setNewInit(e.target.value)} placeholder="Init" type="number"
          className="w-14 bg-amber-950/60 border border-amber-800/30 rounded-lg px-2 py-1 text-xs text-amber-200 text-center placeholder:text-amber-800/40 focus:outline-none" />
        <button onClick={addCustom} className="px-2.5 rounded-lg border border-amber-700/50 text-amber-400 text-xs">＋</button>
      </div>
      {sorted.length > 0 && (
        <>
          <div className="flex gap-2">
            <button onClick={() => onChange({ initiativeActive: (campaign.initiativeActive + 1) % sorted.length })}
              className="flex-1 py-1.5 rounded-lg bg-amber-700/30 border border-amber-600/40 text-amber-200 text-xs font-bold uppercase tracking-widest">▶ Next turn</button>
            <button onClick={() => onChange({ initiative: [], initiativeActive: -1 })} className="px-3 py-1.5 rounded-lg border border-red-900/40 text-red-500/70 text-xs">Clear</button>
          </div>
          {sorted.map((e, i) => (
            <div key={e.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${i === campaign.initiativeActive ? 'bg-amber-700/30 border-amber-500/60' : 'bg-amber-950/40 border-amber-900/40'}`}>
              {i === campaign.initiativeActive && <span className="text-amber-300 text-xs">▶</span>}
              <input value={e.init} type="number" onChange={ev => patchEntry(e.id, { init: Number(ev.target.value) })}
                className="w-10 bg-transparent text-center text-sm font-bold text-amber-200 focus:outline-none" />
              <span className={`flex-1 text-xs truncate ${e.isPC ? 'text-amber-200' : 'text-red-300/90'}`}>{e.name}</span>
              {!e.isPC && (
                <input value={e.hp ?? ''} type="number" placeholder="HP" onChange={ev => patchEntry(e.id, { hp: Number(ev.target.value) })}
                  className="w-12 bg-amber-950/60 border border-amber-900/40 rounded px-1 py-0.5 text-[10px] text-center text-amber-300 focus:outline-none" />
              )}
              <button onClick={() => onChange({ initiative: campaign.initiative.filter(x => x.id !== e.id) })} className="text-amber-800/60 hover:text-red-400 text-xs">✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ── Merged chronicle ──────────────────────────────────────────────────────────

function MergedChronicle({ characters }: { characters: Character[] }) {
  const [filter, setFilter] = useState<ChangeCategory | 'all'>('all')
  const merged = useMemo(() => characters
    .flatMap(c => (c.changelog ?? []).map((e: ChangelogEntry) => ({ ...e, charName: c.name || 'Unnamed' })))
    .sort((a, b) => b.timestamp - a.timestamp), [characters])
  const shown = filter === 'all' ? merged : merged.filter(e => e.category === filter)
  return (
    <div className="space-y-2">
      <p className="text-xs text-amber-600/80">Every logged event from the players' own sheets, newest first. For a short summary of a session, use the Changes tab.</p>
      <div className="flex flex-wrap gap-1">
        {(['all', ...Object.keys(CATEGORY_META)] as Array<ChangeCategory | 'all'>).map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-2 py-0.5 rounded text-[10px] border ${filter === cat ? 'bg-amber-700/40 border-amber-600/50 text-amber-200' : 'border-amber-800/30 text-amber-600/60'}`}>
            {cat === 'all' ? 'All' : CATEGORY_META[cat].label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? <p className="text-xs text-amber-800/60 italic text-center py-6">No events.</p> : (
        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {shown.slice(0, 300).map(e => (
            <div key={`${e.charName}-${e.id}`} className="flex items-baseline gap-2 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-900/30 text-xs">
              <span className="text-amber-400 font-semibold shrink-0">{e.charName}</span>
              <span className={`${CATEGORY_META[e.category]?.color ?? 'text-amber-300'} flex-1`}>{e.summary}</span>
              <span className="text-[9px] text-amber-800/60 shrink-0">{when(e.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Import dialog ─────────────────────────────────────────────────────────────

interface PendingFile { fileName: string; data: Character | null; status: 'new' | 'update' | 'same' | 'error' }

function ImportDialog({ files, labels, onCancel, onConfirm }: {
  files: PendingFile[]
  labels: string[]
  onCancel: () => void
  onConfirm: (label: string) => void
}) {
  const options = labelOptions(labels)
  const [label, setLabel] = useState(options[0])
  const usable = files.filter(f => f.status !== 'error')
  const statusText: Record<PendingFile['status'], string> = {
    new: 'new player', update: 'updated sheet', same: 'no changes since their last sheet', error: 'not a character file: skipped',
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-lg bg-[#1b1408] border border-amber-700/50 rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-amber-100">Import {files.length} sheet{files.length === 1 ? '' : 's'}</h3>
        <ul className="space-y-1 text-xs">
          {files.map(f => (
            <li key={f.fileName} className="flex justify-between gap-2">
              <span className="text-amber-200 truncate">{f.data?.name || f.fileName}</span>
              <span className={f.status === 'error' ? 'text-red-400/80' : f.status === 'same' ? 'text-amber-500' : 'text-green-400'}>{statusText[f.status]}</span>
            </li>
          ))}
        </ul>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-amber-600/80 font-bold mb-1">Label this import</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {options.map(o => (
              <button key={o} onClick={() => setLabel(o)}
                className={`px-2.5 py-1 rounded-full border text-xs font-bold ${label === o ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-500/80'}`}>{o}</button>
            ))}
          </div>
          <input value={label} onChange={e => setLabel(e.target.value)}
            className="w-full bg-amber-950/60 border border-amber-800/40 rounded-lg px-3 py-1.5 text-sm text-amber-100 focus:outline-none focus:border-amber-600" />
          <p className="text-[11px] text-amber-600/80 mt-1">Use the same label for everyone's sheets from the same moment, so the Changes tab can line them up.</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="text-amber-600 text-sm">Cancel</button>
          <button disabled={!usable.length || !label.trim()} onClick={() => onConfirm(label.trim())}
            className="px-4 py-1.5 rounded-lg bg-amber-600/70 text-amber-50 text-sm font-bold disabled:opacity-30">
            Import {usable.length}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DMMode({ onExit }: { onExit: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(ACTIVE_KEY))
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [tab, setTab] = useState<DmTab>('party')
  const [pending, setPending] = useState<PendingFile[] | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    openCampaigns().then(cs => alive && setCampaigns(cs)).catch(e => setError(String(e?.message ?? e)))
    return () => { alive = false }
  }, [])

  const campaign = campaigns?.find(c => c.id === activeId) ?? campaigns?.[0] ?? null
  const campaignId = campaign?.id
  useEffect(() => {
    if (!campaignId) return
    localStorage.setItem(ACTIVE_KEY, campaignId)
    setSnapshots([])
    listSnapshots(campaignId).then(setSnapshots).catch(e => setError(String(e?.message ?? e)))
  }, [campaignId])

  const latest = useMemo(() => {
    const m = new Map<string, Snapshot>()
    for (const s of snapshots) m.set(s.playerKey, s)
    return m
  }, [snapshots])
  const labels = labelsInOrder(snapshots)

  if (error) return <div className="min-h-screen bg-[#130e06] text-red-300 p-8">DM data couldn't be opened: {error}</div>
  if (!campaigns || !campaign) return <div className="min-h-screen bg-[#130e06] text-amber-600/70 p-8 animate-pulse">Opening your campaigns…</div>

  const save = (next: Campaign) => {
    setCampaigns(cs => cs!.map(c => (c.id === next.id ? next : c)))
    putCampaign(next).catch(e => setError(String(e?.message ?? e)))
  }
  const patch = (p: Partial<Campaign>) => save({ ...campaign, ...p })
  const patchPlayer = (key: string, p: Partial<Campaign['players'][number]>) =>
    patch({ players: campaign.players.map(x => (x.key === key ? { ...x, ...p } : x)) })

  async function chooseFiles(list: FileList) {
    const parsed = await Promise.all([...list].map(async (f): Promise<PendingFile> => {
      try {
        const data = normalizeCharacter(JSON.parse(await f.text()))
        if (typeof data.name !== 'string' || !data.abilities) throw new Error('not a sheet')
        const prev = latest.get(playerKeyOf(data))
        const status = !prev ? 'new' : JSON.stringify(prev.data) === JSON.stringify(data) ? 'same' : 'update'
        return { fileName: f.name, data, status }
      } catch {
        return { fileName: f.name, data: null, status: 'error' }
      }
    }))
    setPending(parsed)
  }

  async function confirmImport(label: string) {
    // Unchanged sheets are imported too, so every player has a sheet under this label.
    const files = (pending ?? []).filter(f => f.data && f.status !== 'error')
    const players = [...campaign!.players]
    const now = Date.now()
    for (const [i, f] of files.entries()) {
      const key = playerKeyOf(f.data!)
      if (!players.some(p => p.key === key)) players.push({ key, playerName: '', dmNote: '' })
      await putSnapshot({ id: uuid(), campaignId: campaign!.id, playerKey: key, label, takenAt: now + i, data: f.data! })
    }
    save({ ...campaign!, players })
    setSnapshots(await listSnapshots(campaign!.id))
    setPending(null)
  }

  async function removePlayer(key: string) {
    const name = latest.get(key)?.data.name || key
    if (!confirm(`Remove ${name} and all their imported sheets from “${campaign!.name}”?`)) return
    for (const s of snapshots.filter(x => x.playerKey === key)) await deleteSnapshot(s.id)
    save({
      ...campaign!,
      players: campaign!.players.filter(p => p.key !== key),
      tiles: campaign!.tiles.filter(t => t.playerKey !== key),
      initiative: campaign!.initiative.filter(e => !(e.isPC && e.name === name)),
    })
    setSnapshots(await listSnapshots(campaign!.id))
  }

  async function newCampaign() {
    const name = prompt('Name of the new campaign?', `Campaign ${campaigns!.length + 1}`)
    if (!name?.trim()) return
    const c = makeCampaign(name.trim())
    await putCampaign(c)
    setCampaigns([...campaigns!, c])
    setActiveId(c.id)
  }

  async function removeCampaign() {
    if (!confirm(`Delete “${campaign!.name}” and every sheet imported into it? Download a backup first if you might want it back.`)) return
    await deleteCampaign(campaign!.id)
    let rest = campaigns!.filter(c => c.id !== campaign!.id)
    if (!rest.length) {
      const c = makeCampaign('My campaign')
      await putCampaign(c)
      rest = [c]
    }
    setCampaigns(rest)
    setActiveId(rest[0].id)
  }

  async function restore(file: File) {
    try {
      const c = await importCampaign(JSON.parse(await file.text()))
      setCampaigns([...campaigns!, c])
      setActiveId(c.id)
    } catch (e) {
      alert(`Couldn't restore: ${(e as Error).message}`)
    }
  }

  async function relabel(oldLabel: string, newLabel: string) {
    for (const s of snapshots.filter(x => x.label === oldLabel)) await putSnapshot({ ...s, label: newLabel })
    setSnapshots(await listSnapshots(campaign!.id))
  }

  const characters = campaign.players.map(p => latest.get(p.key)?.data).filter((c): c is Character => !!c)
  const tabBtn = (t: DmTab, label: string) => (
    <button key={t} onClick={() => setTab(t)}
      className={`px-3 md:px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 shrink-0 ${tab === t ? 'border-amber-500 text-amber-200' : 'border-transparent text-amber-700 hover:text-amber-400'}`}>
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-[#130e06] text-amber-100 font-sans">
      <header className="border-b border-amber-800/30 bg-gradient-to-b from-amber-950/60 to-transparent px-4 md:px-6 pt-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Full-width line on phones so the name isn't squeezed by the buttons. */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-2xl">🎲</span>
              <input value={campaign.name} onChange={e => patch({ name: e.target.value })} placeholder="Campaign name…"
                className="min-w-0 flex-1 md:flex-none md:w-80 bg-transparent text-xl md:text-2xl font-bold text-amber-100 placeholder-amber-800/50 focus:outline-none border-b-2 border-amber-800/30 focus:border-amber-600/50" />
            </div>
            <select value={campaign.id} onChange={e => setActiveId(e.target.value)} title="Switch campaign"
              style={{ background: 'var(--color-amber-950)', color: 'var(--color-amber-200)' }}
              className="text-xs rounded border border-amber-800/50 px-2 py-1 max-w-[10rem]">
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name || 'Untitled'}</option>)}
            </select>
            <button onClick={newCampaign} className="px-2 py-1 rounded border border-amber-800/50 text-amber-400 text-xs">＋ Campaign</button>
            <span className="flex-1" />
            <label className="px-3 py-1.5 rounded-lg border border-amber-600/60 text-amber-200 hover:bg-amber-800/30 text-xs font-bold uppercase tracking-widest cursor-pointer">
              ↑ Import sheets
              <input type="file" accept=".json,application/json" multiple className="hidden"
                onChange={e => { if (e.target.files?.length) chooseFiles(e.target.files); e.target.value = '' }} />
            </label>
            <button onClick={onExit} className="px-3 py-1.5 rounded-lg border border-amber-900/50 text-amber-600 hover:text-amber-300 text-xs font-bold uppercase tracking-widest">← My sheet</button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-1">
            <p className="text-[10px] uppercase tracking-widest text-amber-700/70">
              {campaign.players.length} player{campaign.players.length === 1 ? '' : 's'} · {snapshots.length} sheets · last import {labels.length ? `“${labels[labels.length - 1]}”` : 'none'}
            </p>
            <div className="flex gap-2 text-[10px]">
              <button onClick={async () => download(`${campaign.name || 'campaign'}-dm-backup.json`, await exportCampaign(campaign))} className="text-amber-600 hover:text-amber-300">⬇ Backup</button>
              <label className="text-amber-600 hover:text-amber-300 cursor-pointer">⬆ Restore
                <input type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = '' }} />
              </label>
              <button onClick={removeCampaign} className="text-red-500/70 hover:text-red-400">Delete campaign</button>
            </div>
          </div>
          <nav className="flex overflow-x-auto mt-2 -mb-px">
            {tabBtn('party', 'Party')}{tabBtn('compare', 'Compare')}{tabBtn('changes', 'Changes')}{tabBtn('chronicle', 'Chronicle')}
          </nav>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
        {campaign.players.length === 0 && tab !== 'compare' ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🗺️</span>
            <h2 className="text-lg font-bold text-amber-200 mb-2">No characters in “{campaign.name}” yet</h2>
            <p className="text-sm text-amber-600/80 max-w-md mb-6">
              Ask your players to press <b>Export</b> on their sheet and send you the file. Import them all at once and label
              the batch (e.g. “Session 1 start”). Import again after each session to see what changed.
            </p>
            <label className="px-4 py-2 rounded-lg bg-amber-700/30 border border-amber-600/40 text-amber-200 text-sm font-bold cursor-pointer">
              ↑ Import character files
              <input type="file" accept=".json,application/json" multiple className="hidden"
                onChange={e => { if (e.target.files?.length) chooseFiles(e.target.files); e.target.value = '' }} />
            </label>
          </div>
        ) : tab === 'party' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-3">
              {campaign.players.map(p => {
                const snap = latest.get(p.key)
                if (!snap) return null
                return (
                  <PartyCard key={p.key} char={snap.data} snap={snap} count={snapshots.filter(s => s.playerKey === p.key).length}
                    playerName={p.playerName} dmNote={p.dmNote}
                    onPlayerName={v => patchPlayer(p.key, { playerName: v })} onDmNote={v => patchPlayer(p.key, { dmNote: v })}
                    onRemove={() => removePlayer(p.key)}
                    expanded={expanded === p.key} onToggle={() => setExpanded(x => (x === p.key ? null : p.key))} />
                )
              })}
            </div>
            <details className="rounded-xl border border-amber-800/30 bg-amber-950/30 p-3 self-start" open={campaign.initiative.length > 0}>
              <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-amber-600/80 font-bold">⚔ Initiative (for combat)</summary>
              <div className="mt-2"><InitiativeTracker campaign={campaign} characters={characters} onChange={patch} /></div>
            </details>
          </div>
        ) : tab === 'compare' ? (
          <CompareBoard players={campaign.players} latest={latest} tiles={campaign.tiles} onTiles={tiles => patch({ tiles })} />
        ) : tab === 'changes' ? (
          <ChangesView players={campaign.players} snapshots={snapshots} onRelabel={relabel}
            onDeleteSnapshot={async id => { await deleteSnapshot(id); setSnapshots(await listSnapshots(campaign.id)) }} />
        ) : (
          <MergedChronicle characters={characters} />
        )}
      </main>

      {pending && <ImportDialog files={pending} labels={labels} onCancel={() => setPending(null)} onConfirm={confirmImport} />}
    </div>
  )
}
