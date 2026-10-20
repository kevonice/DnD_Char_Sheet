// What changed between two snapshots of the same character, for the DM.
// Deliberately concise: it compares end states, so a player nudging HP down one
// point at a time shows up once as "lost 6 HP". Groups come in priority order;
// `primary` marks the ones the DM sees first (HP, resources, items, story).

import type { Character, NoteNode } from '../types'

export type DiffTone = 'good' | 'bad' | 'neutral'
export interface DiffLine { text: string; tone: DiffTone }
export interface DiffGroup { key: string; title: string; primary: boolean; lines: DiffLine[] }

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
const line = (text: string, tone: DiffTone = 'neutral'): DiffLine => ({ text, tone })
const lower = (s: string) => s.trim().toLowerCase()

function setDiff(a: string[], b: string[]): { added: string[]; removed: string[] } {
  const A = new Set(a.map(lower)), B = new Set(b.map(lower))
  return {
    added: [...new Map(b.filter(x => !A.has(lower(x))).map(x => [lower(x), x])).values()],
    removed: [...new Map(a.filter(x => !B.has(lower(x))).map(x => [lower(x), x])).values()],
  }
}

const hitDiceLeft = (hd: string) => Number(hd.match(/^(\d+)/)?.[1] ?? NaN)
const slotsLeft = (s?: { max: number; used: number; bonus?: number }) => (s ? s.max + (s.bonus ?? 0) - s.used : 0)
const gp = (c: Character['currency']) => c.cp / 100 + c.sp / 10 + c.ep / 2 + c.gp + c.pp * 10
const round = (n: number) => Math.round(n * 100) / 100

// ── HP & condition ────────────────────────────────────────────────────────────

function combat(a: Character, b: Character): DiffLine[] {
  const out: DiffLine[] = []
  if (a.currentHp !== b.currentHp || a.maxHp !== b.maxHp) {
    const d = b.currentHp - a.currentHp
    const what = d < 0 ? `lost ${-d}` : d > 0 ? `gained ${d}` : 'no change'
    out.push(line(`HP ${a.currentHp}/${a.maxHp} → ${b.currentHp}/${b.maxHp} (${what})`, d < 0 ? 'bad' : d > 0 ? 'good' : 'neutral'))
  }
  if (b.tempHp > 0 && b.tempHp !== a.tempHp) out.push(line(`${b.tempHp} temporary HP`, 'good'))
  if (b.currentHp <= 0 && (b.deathSaveFailures || b.deathSaveSuccesses)) {
    out.push(line(`Dying: ${b.deathSaveSuccesses} successes, ${b.deathSaveFailures} failures`, 'bad'))
  }
  const cond = setDiff(a.conditions, b.conditions)
  cond.added.forEach(c => out.push(line(`Now ${c}`, 'bad')))
  cond.removed.forEach(c => out.push(line(`No longer ${c}`, 'good')))
  if (a.exhaustion !== b.exhaustion) out.push(line(`Exhaustion ${a.exhaustion} → ${b.exhaustion}`, b.exhaustion > a.exhaustion ? 'bad' : 'good'))
  const hdA = hitDiceLeft(a.hitDice), hdB = hitDiceLeft(b.hitDice)
  if (Number.isFinite(hdA) && Number.isFinite(hdB) && hdA !== hdB) {
    out.push(line(`Hit dice left ${hdA} → ${hdB}`, hdB < hdA ? 'bad' : 'good'))
  }
  if (a.inspiration !== b.inspiration) out.push(line(b.inspiration ? 'Gained inspiration' : 'Used inspiration', b.inspiration ? 'good' : 'neutral'))
  return out
}

// ── Spell slots & limited-use resources ──────────────────────────────────────

function resources(a: Character, b: Character): DiffLine[] {
  const out: DiffLine[] = []
  for (let l = 1; l <= 9; l++) {
    const sa = a.spellSlots[l], sb = b.spellSlots[l]
    const maxA = (sa?.max ?? 0) + (sa?.bonus ?? 0), maxB = (sb?.max ?? 0) + (sb?.bonus ?? 0)
    if (!maxA && !maxB) continue
    const la = slotsLeft(sa), lb = slotsLeft(sb)
    if (la !== lb || maxA !== maxB) out.push(line(`${ORD[l]}-level slots: ${la}/${maxA} → ${lb}/${maxB} left`, lb < la ? 'bad' : lb > la ? 'good' : 'neutral'))
  }
  const byName = new Map(a.activeFeatures.map(f => [lower(f.name), f]))
  for (const f of b.activeFeatures) {
    const old = byName.get(lower(f.name))
    if (!old || f.maxUses === 0) continue
    if (old.usesLeft !== f.usesLeft || old.maxUses !== f.maxUses) {
      out.push(line(`${f.name}: ${old.usesLeft}/${old.maxUses} → ${f.usesLeft}/${f.maxUses}`, f.usesLeft < old.usesLeft ? 'bad' : 'good'))
    }
  }
  return out
}

// ── Items & coin ──────────────────────────────────────────────────────────────

function items(a: Character, b: Character): DiffLine[] {
  const out: DiffLine[] = []
  const key = (i: { id: string; name: string }) => i.id
  const aById = new Map(a.inventory.map(i => [key(i), i]))
  const bById = new Map(b.inventory.map(i => [key(i), i]))
  // Match by id first; an item re-added with a new id but the same name counts as the same item.
  const unmatchedA = a.inventory.filter(i => !bById.has(i.id))
  const unmatchedB = b.inventory.filter(i => !aById.has(i.id))
  const pairs: Array<[typeof a.inventory[number], typeof b.inventory[number]]> = []
  for (const i of b.inventory) if (aById.has(i.id)) pairs.push([aById.get(i.id)!, i])
  const added: typeof b.inventory = []
  for (const i of unmatchedB) {
    const k = unmatchedA.findIndex(x => lower(x.name) === lower(i.name))
    if (k >= 0) pairs.push([unmatchedA.splice(k, 1)[0], i])
    else added.push(i)
  }
  added.forEach(i => out.push(line(`+ ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`, 'good')))
  unmatchedA.forEach(i => out.push(line(`− ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`, 'bad')))
  for (const [x, y] of pairs) {
    if (x.quantity !== y.quantity) out.push(line(`${y.name}: ${x.quantity} → ${y.quantity}`, y.quantity < x.quantity ? 'bad' : 'good'))
    if (!x.equipped && y.equipped && (y.category === 'armor' || y.category === 'weapon')) out.push(line(`Now using ${y.name}`))
    if (lower(x.name) !== lower(y.name)) out.push(line(`Renamed ${x.name} → ${y.name}`))
  }
  const coins = (['pp', 'gp', 'ep', 'sp', 'cp'] as const)
    .map(k => [k, b.currency[k] - a.currency[k]] as const).filter(([, d]) => d !== 0)
  if (coins.length) {
    const net = round(gp(b.currency) - gp(a.currency))
    out.push(line(`Coin: ${coins.map(([k, d]) => `${d > 0 ? '+' : ''}${d} ${k}`).join(', ')}${coins.length > 1 || coins[0][0] !== 'gp' ? ` (net ${net >= 0 ? '+' : ''}${net} gp)` : ''}`, net < 0 ? 'bad' : 'good'))
  }
  return out
}

// ── Background & personality (new sentences, not every keystroke) ────────────

const sentences = (s: string) => s.split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean)
const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function story(a: Character, b: Character): DiffLine[] {
  const out: DiffLine[] = []
  for (const [k, label] of [['background', 'Background'], ['alignment', 'Alignment']] as const) {
    if (lower(a[k]) !== lower(b[k]) && b[k]) out.push(line(`${label}: ${a[k] || '—'} → ${b[k]}`))
  }
  const fields = [
    ['personalityTraits', 'Personality'], ['ideals', 'Ideals'], ['bonds', 'Bonds'], ['flaws', 'Flaws'],
    ['backstory', 'Backstory'], ['backgroundFlavour', 'Background notes'], ['characterGrowth', 'Character growth'],
  ] as const
  for (const [k, label] of fields) {
    const before = a[k] ?? '', after = b[k] ?? ''
    if (before.trim() === after.trim()) continue
    if (!before.trim()) { out.push(line(`${label} written: “${clip(after.trim())}”`, 'good')); continue }
    if (!after.trim()) { out.push(line(`${label} cleared`, 'bad')); continue }
    const { added, removed } = setDiff(sentences(before), sentences(after))
    added.slice(0, 2).forEach(s => out.push(line(`${label} — new: “${clip(s)}”`, 'good')))
    if (added.length > 2) out.push(line(`${label}: +${added.length - 2} more new sentences`))
    if (removed.length && !added.length) out.push(line(`${label}: ${removed.length} sentence${removed.length > 1 ? 's' : ''} removed`))
    if (!added.length && !removed.length) out.push(line(`${label} reworded`))
  }
  return out
}

// ── Secondary groups ──────────────────────────────────────────────────────────

function level(a: Character, b: Character): DiffLine[] {
  const out: DiffLine[] = []
  if (a.level !== b.level) out.push(line(`Level ${a.level} → ${b.level}`, 'good'))
  if (lower(a.class) !== lower(b.class)) out.push(line(`Class ${a.class || '—'} → ${b.class}`))
  if (lower(a.subclass) !== lower(b.subclass) && b.subclass) out.push(line(`Subclass: ${b.subclass}`, 'good'))
  for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
    if (a.abilities[k] !== b.abilities[k]) out.push(line(`${k.toUpperCase()} ${a.abilities[k]} → ${b.abilities[k]}`, b.abilities[k] > a.abilities[k] ? 'good' : 'bad'))
  }
  if (a.ac !== b.ac) out.push(line(`AC ${a.ac} → ${b.ac}`, b.ac > a.ac ? 'good' : 'bad'))
  if (a.speed !== b.speed) out.push(line(`Speed ${a.speed} → ${b.speed} ft`))
  if (a.xp !== b.xp) out.push(line(`XP ${a.xp} → ${b.xp}`, 'good'))
  return out
}

function spells(a: Character, b: Character): DiffLine[] {
  const { added, removed } = setDiff(a.spells.map(s => s.name), b.spells.map(s => s.name))
  return [
    ...(added.length ? [line(`Learned: ${added.join(', ')}`, 'good')] : []),
    ...(removed.length ? [line(`Removed: ${removed.join(', ')}`, 'bad')] : []),
  ]
}

function features(a: Character, b: Character): DiffLine[] {
  const names = (c: Character) => [
    ...c.activeFeatures.map(f => f.name), ...c.passiveTraits.map(t => t.name),
    ...(c.feats ?? []).map(f => `Feat: ${f.name}`),
    ...(c.classOptions ?? []).filter(o => !c.passiveTraits.some(t => lower(t.name) === lower(o.name))).map(o => o.name),
  ]
  const { added, removed } = setDiff(names(a), names(b))
  return [
    ...(added.length ? [line(`New: ${added.join(', ')}`, 'good')] : []),
    ...(removed.length ? [line(`Removed: ${removed.join(', ')}`, 'bad')] : []),
  ]
}

function proficiencies(a: Character, b: Character): DiffLine[] {
  const out: DiffLine[] = []
  const profs = setDiff(a.proficiencyList.map(p => p.name), b.proficiencyList.map(p => p.name))
  const langs = setDiff(a.languages.map(l => l.name), b.languages.map(l => l.name))
  const skillsOf = (c: Character, f: 'proficient' | 'expertise') => Object.entries(c.skills).filter(([, v]) => v[f]).map(([k]) => k)
  const skills = setDiff(skillsOf(a, 'proficient'), skillsOf(b, 'proficient'))
  const exp = setDiff(skillsOf(a, 'expertise'), skillsOf(b, 'expertise'))
  if (profs.added.length) out.push(line(`New proficiencies: ${profs.added.join(', ')}`, 'good'))
  if (profs.removed.length) out.push(line(`Lost proficiencies: ${profs.removed.join(', ')}`, 'bad'))
  if (skills.added.length) out.push(line(`New skills: ${skills.added.join(', ')}`, 'good'))
  if (skills.removed.length) out.push(line(`Skills removed: ${skills.removed.join(', ')}`, 'bad'))
  if (exp.added.length) out.push(line(`Expertise: ${exp.added.join(', ')}`, 'good'))
  if (langs.added.length) out.push(line(`New languages: ${langs.added.join(', ')}`, 'good'))
  if (langs.removed.length) out.push(line(`Languages removed: ${langs.removed.join(', ')}`, 'bad'))
  return out
}

function flatNotes(nodes: NoteNode[]): NoteNode[] {
  return nodes.flatMap(n => [n, ...flatNotes(n.children ?? [])])
}

function notes(a: Character, b: Character): DiffLine[] {
  const na = flatNotes(a.noteTree ?? []), nb = flatNotes(b.noteTree ?? [])
  const byId = new Map(na.map(n => [n.id, n]))
  const ids = new Set(nb.map(n => n.id))
  const added = nb.filter(n => !byId.has(n.id)).map(n => n.title || 'Untitled')
  const removed = na.filter(n => !ids.has(n.id)).map(n => n.title || 'Untitled')
  const edited = nb.filter(n => byId.has(n.id) && byId.get(n.id)!.content !== n.content).map(n => n.title || 'Untitled')
  return [
    ...(added.length ? [line(`New notes: ${added.join(', ')}`, 'good')] : []),
    ...(edited.length ? [line(`Edited: ${edited.join(', ')}`)] : []),
    ...(removed.length ? [line(`Deleted: ${removed.join(', ')}`, 'bad')] : []),
  ]
}

export function diffSheets(a: Character, b: Character): DiffGroup[] {
  const groups: DiffGroup[] = [
    { key: 'combat', title: 'HP & condition', primary: true, lines: combat(a, b) },
    { key: 'resources', title: 'Spell slots & resources', primary: true, lines: resources(a, b) },
    { key: 'items', title: 'Items & coin', primary: true, lines: items(a, b) },
    { key: 'story', title: 'Background & personality', primary: true, lines: story(a, b) },
    { key: 'level', title: 'Level & abilities', primary: false, lines: level(a, b) },
    { key: 'spells', title: 'Spells', primary: false, lines: spells(a, b) },
    { key: 'features', title: 'Features & feats', primary: false, lines: features(a, b) },
    { key: 'proficiencies', title: 'Proficiencies & languages', primary: false, lines: proficiencies(a, b) },
    { key: 'notes', title: 'Notes', primary: false, lines: notes(a, b) },
  ]
  return groups.filter(g => g.lines.length > 0)
}
