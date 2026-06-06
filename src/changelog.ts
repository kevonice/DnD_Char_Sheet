import type { Character, ChangelogEntry, ChangeCategory, NoteNode } from './types'
import { v4 as uuid } from './uuid'

const DEBOUNCE_MS = 5 * 60 * 1000 // 5 minutes

function entry(category: ChangeCategory, summary: string, detail?: string): ChangelogEntry {
  return { id: uuid(), timestamp: Date.now(), category, summary, detail }
}

function gpValue(c: Character['currency']): number {
  return c.cp / 100 + c.sp / 10 + c.ep / 2 + c.gp + c.pp * 10
}

// Returns true if a recent entry with the same summary exists within the debounce window
function recentlyLogged(existing: ChangelogEntry[], summary: string): boolean {
  const cutoff = Date.now() - DEBOUNCE_MS
  return existing.some(e => e.summary === summary && e.timestamp >= cutoff)
}

export function detectChanges(prev: Character, next: Character, existing: ChangelogEntry[] = []): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []

  function maybeAdd(e: ChangelogEntry) {
    if (!recentlyLogged([...existing, ...entries], e.summary)) entries.push(e)
  }

  // ── HP & combat ──────────────────────────────────────────────────────────────
  if (prev.currentHp !== next.currentHp) {
    const delta = next.currentHp - prev.currentHp
    if (delta < 0) {
      entries.push(entry('combat', `Took ${Math.abs(delta)} damage`, `HP: ${prev.currentHp} → ${next.currentHp}`))
    } else {
      entries.push(entry('combat', `Healed ${delta} HP`, `HP: ${prev.currentHp} → ${next.currentHp}`))
    }
  }
  if (prev.maxHp !== next.maxHp) {
    entries.push(entry('combat', `Max HP changed to ${next.maxHp}`, `Was ${prev.maxHp}`))
  }
  if (prev.tempHp !== next.tempHp && next.tempHp !== prev.tempHp) {
    const delta = next.tempHp - prev.tempHp
    entries.push(entry('combat', delta > 0 ? `Gained ${next.tempHp} temporary HP` : `Lost temporary HP`, `Temp HP: ${prev.tempHp} → ${next.tempHp}`))
  }
  if (prev.deathSaveSuccesses !== next.deathSaveSuccesses || prev.deathSaveFailures !== next.deathSaveFailures) {
    entries.push(entry('combat', `Death save updated`, `Successes: ${next.deathSaveSuccesses} · Failures: ${next.deathSaveFailures}`))
  }

  // ── Conditions ───────────────────────────────────────────────────────────────
  next.conditions.filter(c => !prev.conditions.includes(c)).forEach(c =>
    entries.push(entry('combat', `Afflicted: ${c}`))
  )
  prev.conditions.filter(c => !next.conditions.includes(c)).forEach(c =>
    entries.push(entry('combat', `Recovered from: ${c}`))
  )
  if (prev.exhaustion !== next.exhaustion) {
    entries.push(entry('combat',
      next.exhaustion > prev.exhaustion ? `Exhaustion increased to ${next.exhaustion}` : `Exhaustion reduced to ${next.exhaustion}`
    ))
  }

  // ── Inventory ─────────────────────────────────────────────────────────────────
  const prevItemIds = new Set(prev.inventory.map(i => i.id))
  const nextItemIds = new Set(next.inventory.map(i => i.id))
  next.inventory.filter(i => !prevItemIds.has(i.id)).forEach(i =>
    entries.push(entry('inventory', `Acquired: ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`, i.category !== 'misc' ? i.category : undefined))
  )
  prev.inventory.filter(i => !nextItemIds.has(i.id)).forEach(i =>
    entries.push(entry('inventory', `Lost: ${i.name}`))
  )
  next.inventory.forEach(item => {
    const old = prev.inventory.find(i => i.id === item.id)
    if (!old) return
    if (old.quantity !== item.quantity) {
      const delta = item.quantity - old.quantity
      entries.push(entry('inventory',
        delta > 0 ? `${item.name} ×${delta} added` : `${item.name} ×${Math.abs(delta)} removed`,
        `Quantity: ${old.quantity} → ${item.quantity}`
      ))
    }
    // Description edited — debounced
    if (old.description !== item.description || old.notes !== item.notes) {
      maybeAdd(entry('inventory', `Item updated: ${item.name}`, 'Description or notes edited'))
    }
  })

  // ── Currency ──────────────────────────────────────────────────────────────────
  const gpDelta = Math.round((gpValue(next.currency) - gpValue(prev.currency)) * 100) / 100
  if (gpDelta !== 0) {
    const keys: Array<keyof Character['currency']> = ['pp', 'gp', 'ep', 'sp', 'cp']
    const parts = keys.flatMap(k => {
      const d = next.currency[k] - prev.currency[k]
      return d !== 0 ? [`${d > 0 ? '+' : ''}${d} ${k}`] : []
    })
    entries.push(entry('inventory',
      gpDelta > 0 ? `Received ${Math.abs(gpDelta)} gp worth of coin` : `Spent ${Math.abs(gpDelta)} gp worth of coin`,
      parts.join(', ')
    ))
  }

  // ── Spells ────────────────────────────────────────────────────────────────────
  const prevSpellIds = new Set(prev.spells.map(s => s.id))
  const nextSpellIds = new Set(next.spells.map(s => s.id))
  next.spells.filter(s => !prevSpellIds.has(s.id)).forEach(s =>
    entries.push(entry('magic', `Learned: ${s.name}`, s.level === 0 ? 'Cantrip' : `Level ${s.level} spell`))
  )
  prev.spells.filter(s => !nextSpellIds.has(s.id)).forEach(s =>
    entries.push(entry('magic', `Forgot: ${s.name}`))
  )

  // ── Notes ────────────────────────────────────────────────────────────────────
  function flattenNotes(nodes: NoteNode[]): NoteNode[] {
    return nodes.flatMap(n => [n, ...flattenNotes(n.children)])
  }
  const prevNotes = flattenNotes(prev.noteTree ?? [])
  const nextNotes = flattenNotes(next.noteTree ?? [])
  const prevNoteMap = new Map(prevNotes.map(n => [n.id, n]))
  const nextNoteMap = new Map(nextNotes.map(n => [n.id, n]))

  nextNotes.filter(n => !prevNoteMap.has(n.id)).forEach(n =>
    entries.push(entry('note', `Note added: "${n.title}"`))
  )
  prevNotes.filter(n => !nextNoteMap.has(n.id)).forEach(n =>
    entries.push(entry('note', `Note deleted: "${n.title}"`))
  )
  nextNotes.forEach(n => {
    const old = prevNoteMap.get(n.id)
    if (!old) return
    if (old.title !== n.title) {
      entries.push(entry('note', `Note renamed: "${old.title}" → "${n.title}"`))
    } else if (old.content !== n.content) {
      // Content edited — debounced
      maybeAdd(entry('note', `Note edited: "${n.title}"`))
    }
  })

  // ── Active features ───────────────────────────────────────────────────────────
  const prevFeatMap = new Map(prev.activeFeatures.map(f => [f.id, f]))
  const nextFeatMap = new Map(next.activeFeatures.map(f => [f.id, f]))
  next.activeFeatures.filter(f => !prevFeatMap.has(f.id)).forEach(f =>
    entries.push(entry('note', `Feature added: "${f.name}"`))
  )
  prev.activeFeatures.filter(f => !nextFeatMap.has(f.id)).forEach(f =>
    entries.push(entry('note', `Feature removed: "${f.name}"`))
  )
  next.activeFeatures.forEach(f => {
    const old = prevFeatMap.get(f.id)
    if (old && old.description !== f.description) {
      maybeAdd(entry('note', `Feature updated: "${f.name}"`))
    }
  })

  // ── Passive traits ────────────────────────────────────────────────────────────
  const prevTraitMap = new Map(prev.passiveTraits.map(t => [t.id, t]))
  const nextTraitMap = new Map(next.passiveTraits.map(t => [t.id, t]))
  next.passiveTraits.filter(t => !prevTraitMap.has(t.id)).forEach(t =>
    entries.push(entry('note', `Trait added: "${t.name}"`))
  )
  prev.passiveTraits.filter(t => !nextTraitMap.has(t.id)).forEach(t =>
    entries.push(entry('note', `Trait removed: "${t.name}"`))
  )
  next.passiveTraits.forEach(t => {
    const old = prevTraitMap.get(t.id)
    if (old && old.description !== t.description) {
      maybeAdd(entry('note', `Trait updated: "${t.name}"`))
    }
  })

  // ── Level & XP ────────────────────────────────────────────────────────────────
  if (prev.level !== next.level) {
    entries.push(entry('progression',
      next.level > prev.level ? `⬆ Leveled up to level ${next.level}!` : `Level changed to ${next.level}`,
      `Was level ${prev.level}`
    ))
  }
  if (prev.xp !== next.xp) {
    const delta = next.xp - prev.xp
    entries.push(entry('progression',
      delta > 0 ? `Gained ${delta} XP` : `Lost ${Math.abs(delta)} XP`,
      `Total: ${next.xp} XP`
    ))
  }

  return entries
}
