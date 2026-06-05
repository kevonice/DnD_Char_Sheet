import type { Character, ChangelogEntry, ChangeCategory } from './types'
import { v4 as uuid } from './uuid'

function entry(category: ChangeCategory, summary: string, detail?: string): ChangelogEntry {
  return { id: uuid(), timestamp: Date.now(), category, summary, detail }
}

function gpValue(c: Character['currency']): number {
  return c.cp / 100 + c.sp / 10 + c.ep / 2 + c.gp + c.pp * 10
}

export function detectChanges(prev: Character, next: Character): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []

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
  if (prev.tempHp !== next.tempHp && next.tempHp > 0 && next.tempHp !== prev.tempHp) {
    const delta = next.tempHp - prev.tempHp
    entries.push(entry('combat', delta > 0 ? `Gained ${next.tempHp} temporary HP` : `Lost temporary HP`, `Temp HP: ${prev.tempHp} → ${next.tempHp}`))
  }
  if (prev.deathSaveSuccesses !== next.deathSaveSuccesses || prev.deathSaveFailures !== next.deathSaveFailures) {
    entries.push(entry('combat', `Death save updated`, `Successes: ${next.deathSaveSuccesses} · Failures: ${next.deathSaveFailures}`))
  }

  // ── Conditions ───────────────────────────────────────────────────────────────
  const addedConditions = next.conditions.filter(c => !prev.conditions.includes(c))
  const removedConditions = prev.conditions.filter(c => !next.conditions.includes(c))
  addedConditions.forEach(c => entries.push(entry('combat', `Afflicted: ${c}`)))
  removedConditions.forEach(c => entries.push(entry('combat', `Recovered from: ${c}`)))
  if (prev.exhaustion !== next.exhaustion) {
    entries.push(entry('combat',
      next.exhaustion > prev.exhaustion ? `Exhaustion increased to ${next.exhaustion}` : `Exhaustion reduced to ${next.exhaustion}`
    ))
  }

  // ── Inventory ─────────────────────────────────────────────────────────────────
  const prevIds = new Set(prev.inventory.map(i => i.id))
  const nextIds = new Set(next.inventory.map(i => i.id))
  next.inventory.filter(i => !prevIds.has(i.id)).forEach(i =>
    entries.push(entry('inventory', `Acquired: ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`, i.category !== 'misc' ? i.category : undefined))
  )
  prev.inventory.filter(i => !nextIds.has(i.id)).forEach(i =>
    entries.push(entry('inventory', `Lost: ${i.name}`))
  )
  // Quantity changes on existing items
  next.inventory.forEach(item => {
    const old = prev.inventory.find(i => i.id === item.id)
    if (old && old.quantity !== item.quantity) {
      const delta = item.quantity - old.quantity
      entries.push(entry('inventory',
        delta > 0 ? `${item.name} ×${delta} added` : `${item.name} ×${Math.abs(delta)} removed`,
        `Quantity: ${old.quantity} → ${item.quantity}`
      ))
    }
  })

  // ── Currency ──────────────────────────────────────────────────────────────────
  const prevGp = gpValue(prev.currency)
  const nextGp = gpValue(next.currency)
  const gpDelta = Math.round((nextGp - prevGp) * 100) / 100
  if (gpDelta !== 0) {
    const parts: string[] = []
    const keys: Array<keyof Character['currency']> = ['pp', 'gp', 'ep', 'sp', 'cp']
    keys.forEach(k => {
      const d = next.currency[k] - prev.currency[k]
      if (d !== 0) parts.push(`${d > 0 ? '+' : ''}${d} ${k}`)
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
