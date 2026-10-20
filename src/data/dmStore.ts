// DM Mode storage. Campaigns and every imported sheet snapshot live in IndexedDB:
// full character sheets for several players across many sessions quickly outgrow
// localStorage's ~5 MB. The database name carries the beta prefix like the maps DB.

import type { Character } from '../types'
import { makeDefaultCharacter } from '../defaultCharacter'
import { STORAGE_PREFIX } from '../storageScope'
import { v4 as uuid } from '../uuid'

export type SectionKey =
  | 'overview' | 'abilities' | 'skills' | 'spells' | 'equipment'
  | 'features' | 'background' | 'proficiencies' | 'notes'

export interface InitiativeEntry {
  id: string
  name: string
  init: number
  isPC: boolean
  hp?: number
  maxHp?: number
}

export interface PlayerEntry {
  key: string           // stable id across imports: the character's name, lowercased
  playerName: string    // who plays them (DM's note)
  dmNote: string        // private DM notes
}

export interface BoardTile {
  id: string
  playerKey: string
  section: SectionKey
  wide?: boolean
}

export interface Campaign {
  id: string
  name: string
  createdAt: number
  players: PlayerEntry[]
  tiles: BoardTile[]
  initiative: InitiativeEntry[]
  initiativeActive: number
}

/** One imported copy of a player's sheet, e.g. "Session 2 end". */
export interface Snapshot {
  id: string
  campaignId: string
  playerKey: string
  label: string
  takenAt: number
  data: Character
}

const DB_NAME = `${STORAGE_PREFIX}dnd5e_dm`
const LEGACY_KEY = 'dnd5e_dm_campaign'
const MIGRATED_KEY = 'dnd5e_dm_migrated'

export const playerKeyOf = (c: Pick<Character, 'name'>) => (c.name || 'Unnamed').trim().toLowerCase()

export function makeCampaign(name: string): Campaign {
  return { id: uuid(), name, createdAt: Date.now(), players: [], tiles: [], initiative: [], initiativeActive: -1 }
}

/** Fill in fields an older export might lack, the same way the sheet loads a save. */
export function normalizeCharacter(raw: unknown): Character {
  return { ...makeDefaultCharacter(), ...(raw as Partial<Character>) }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      db.createObjectStore('campaigns', { keyPath: 'id' })
      db.createObjectStore('snapshots', { keyPath: 'id' }).createIndex('campaignId', 'campaignId')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(store: 'campaigns' | 'snapshots', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const req = fn(tx.objectStore(store))
    tx.oncomplete = () => resolve(req ? req.result : (undefined as T))
    tx.onerror = () => reject(tx.error)
  }))
}

export const listCampaigns = () =>
  run<Campaign[]>('campaigns', 'readonly', s => s.getAll()).then(cs => cs.sort((a, b) => a.createdAt - b.createdAt))
export const putCampaign = (c: Campaign) => run('campaigns', 'readwrite', s => { s.put(c) })
export const listSnapshots = (campaignId: string) =>
  run<Snapshot[]>('snapshots', 'readonly', s => s.index('campaignId').getAll(campaignId)).then(ss => ss.sort((a, b) => a.takenAt - b.takenAt))
export const putSnapshot = (s: Snapshot) => run('snapshots', 'readwrite', st => { st.put(s) })
export const deleteSnapshot = (id: string) => run('snapshots', 'readwrite', s => { s.delete(id) })

export async function deleteCampaign(id: string): Promise<void> {
  const snaps = await listSnapshots(id)
  await run('snapshots', 'readwrite', s => { for (const x of snaps) s.delete(x.id) })
  await run('campaigns', 'readwrite', s => { s.delete(id) })
}

/** The single localStorage campaign from before campaigns existed becomes the first campaign. */
export async function migrateLegacyCampaign(): Promise<void> {
  if (localStorage.getItem(MIGRATED_KEY)) return
  const raw = localStorage.getItem(LEGACY_KEY)
  localStorage.setItem(MIGRATED_KEY, '1')
  if (raw) {
    try {
      const old = JSON.parse(raw) as {
        name?: string; characters?: unknown[]; importedAt?: Record<string, number>
        dmNotes?: Record<string, string>; initiative?: InitiativeEntry[]; initiativeActive?: number
      }
      const camp = makeCampaign(old.name || 'My campaign')
      camp.initiative = old.initiative ?? []
      camp.initiativeActive = old.initiativeActive ?? -1
      for (const rawChar of old.characters ?? []) {
        const data = normalizeCharacter(rawChar)
        const key = playerKeyOf(data)
        if (camp.players.some(p => p.key === key)) continue
        camp.players.push({ key, playerName: '', dmNote: old.dmNotes?.[data.name || 'Unnamed'] ?? '' })
        await putSnapshot({ id: uuid(), campaignId: camp.id, playerKey: key, label: 'Imported before snapshots', takenAt: old.importedAt?.[data.name || 'Unnamed'] ?? Date.now(), data })
      }
      await putCampaign(camp)
    } catch { /* unreadable legacy data: start fresh */ }
  }
}

// ── Backup / restore (IndexedDB lives in one browser only) ───────────────────

export interface CampaignBackup { format: 'dnd5e-dm-campaign'; version: 1; campaign: Campaign; snapshots: Snapshot[] }

export async function exportCampaign(c: Campaign): Promise<CampaignBackup> {
  return { format: 'dnd5e-dm-campaign', version: 1, campaign: c, snapshots: await listSnapshots(c.id) }
}

/** Restores as a new campaign (fresh ids), so it never overwrites an existing one. */
export async function importCampaign(raw: unknown): Promise<Campaign> {
  const b = raw as CampaignBackup
  if (b?.format !== 'dnd5e-dm-campaign' || !b.campaign) throw new Error('Not a DM campaign backup')
  const camp: Campaign = { ...makeCampaign(b.campaign.name), ...b.campaign, name: `${b.campaign.name} (restored)`, id: uuid(), createdAt: Date.now() }
  for (const s of b.snapshots ?? []) await putSnapshot({ ...s, id: uuid(), campaignId: camp.id, data: normalizeCharacter(s.data) })
  await putCampaign(camp)
  return camp
}

let opening: Promise<Campaign[]> | null = null

/**
 * Migrate old data, list campaigns, and create a first one if there are none.
 * Concurrent calls share one run (React mounts effects twice in development),
 * so the migration and the default campaign can never happen twice.
 */
export function openCampaigns(): Promise<Campaign[]> {
  if (!opening) {
    opening = (async () => {
      await migrateLegacyCampaign()
      const cs = await listCampaigns()
      if (cs.length) return cs
      const c = makeCampaign('My campaign')
      await putCampaign(c)
      return [c]
    })().finally(() => { opening = null })
  }
  return opening
}
