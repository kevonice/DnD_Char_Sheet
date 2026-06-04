const BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data'

export interface ClassLevel {
  level: number
  profBonus: number
  features: string[]   // display names
  columns: string[]    // values for each colLabel
}

export interface ClassFeatureDesc {
  name: string
  level: number
  description: string
}

export interface ClassProgressionData {
  name: string
  source: string
  hitDie: number
  colLabels: string[]
  levels: ClassLevel[]
  featureMap: Map<string, ClassFeatureDesc>  // key: `${name}|${level}`
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function profBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

function cellStr(cell: unknown): string {
  if (cell === null || cell === undefined) return '—'
  if (typeof cell === 'number') return String(cell)
  if (typeof cell === 'string') return cell || '—'
  if (typeof cell === 'object') {
    const o = cell as Record<string, unknown>
    if (o.type === 'bonus' && typeof o.value === 'number') return `+${o.value}`
    if (o.type === 'dice') {
      const toRoll = o.toRoll as Array<{number: number; faces: number}> | undefined
      if (toRoll?.length) return toRoll.map(d => `${d.number}d${d.faces}`).join('+')
    }
    if (typeof o.value === 'string') return o.value
    if (typeof o.number === 'number') return String(o.number)
  }
  return '—'
}

function featureName(ref: unknown): string | null {
  if (typeof ref === 'string') return ref.split('|')[0] || null
  if (typeof ref === 'object' && ref !== null) {
    const o = ref as Record<string, unknown>
    if (o.gainSubclassFeature) return 'Subclass Feature'
    if (typeof o.classFeature === 'string') return o.classFeature.split('|')[0] || null
    if (typeof o.refClassFeature === 'string') return o.refClassFeature.split('|')[0] || null
    if (typeof o.name === 'string') return o.name
  }
  return null
}

function stripTags(text: string): string {
  return text
    .replace(/\{@dc\s+(\d+)\}/gi, 'DC $1')
    .replace(/\{@hit\s+([+-]?\d+)\}/gi, '$1')
    .replace(/\{@damage\s+([^}]+)\}/gi, '$1')
    .replace(/\{@dice\s+([^}]+)\}/gi, '$1')
    .replace(/\{@(\w+)\s+([^|}]+)[^}]*\}/g, '$2')
    .replace(/\{@(\w+)\}/g, '')
}

function flattenEntries(entries: unknown[], depth = 0): string {
  if (depth > 4) return ''
  return entries.map(e => {
    if (typeof e === 'string') return stripTags(e)
    if (typeof e === 'object' && e !== null) {
      const o = e as Record<string, unknown>
      const parts: string[] = []
      if (typeof o.name === 'string') parts.push(`${o.name}: `)
      if (Array.isArray(o.entries)) parts.push(flattenEntries(o.entries, depth + 1))
      if (Array.isArray(o.items))   parts.push(flattenEntries(o.items, depth + 1))
      return parts.join('')
    }
    return ''
  }).filter(Boolean).join('\n')
}

// ── Class name → file mapping ─────────────────────────────────────────────────

const CLASS_FILE: Record<string, string> = {
  artificer: 'class-artificer.json',
  barbarian: 'class-barbarian.json',
  bard:      'class-bard.json',
  cleric:    'class-cleric.json',
  druid:     'class-druid.json',
  fighter:   'class-fighter.json',
  monk:      'class-monk.json',
  paladin:   'class-paladin.json',
  ranger:    'class-ranger.json',
  rogue:     'class-rogue.json',
  sorcerer:  'class-sorcerer.json',
  warlock:   'class-warlock.json',
  wizard:    'class-wizard.json',
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const cache = new Map<string, ClassProgressionData>()

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchClassProgression(
  className: string,
  edition: '2014' | '2024',
): Promise<ClassProgressionData | null> {
  const key = className.toLowerCase().split(/[\s/(]/)[0]
  const file = CLASS_FILE[key]
  if (!file) return null

  const cacheKey = `${key}|${edition}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  const json = await fetch(`${BASE}/class/${file}`).then(r => r.json())

  const targetSource = edition === '2024' ? 'XPHB' : 'PHB'
  // Pick the entry matching the target source; fall back to first entry
  const classEntry =
    (json.class as Record<string, unknown>[]).find(c => c.source === targetSource) ??
    (json.class as Record<string, unknown>[])[0]

  if (!classEntry) return null

  const hd = (classEntry.hd as { faces: number } | undefined)?.faces ?? 8

  // ── Column labels from classTableGroups ──────────────────────────────────
  const tableGroups = (classEntry.classTableGroups as Array<Record<string, unknown>> | undefined) ?? []
  const allColLabels: string[] = []
  const allGroupRows: unknown[][] = Array.from({ length: 20 }, () => [])

  for (const group of tableGroups) {
    const labels = (group.colLabels as string[] | undefined) ?? []
    const rows   = (group.rows as unknown[][] | undefined) ?? []
    allColLabels.push(...labels)
    for (let i = 0; i < 20; i++) {
      const rowCells = rows[i] ?? []
      allGroupRows[i].push(...rowCells)
    }
  }

  // ── Feature names per level ───────────────────────────────────────────────
  const classFeatureRefs = (classEntry.classFeatures as unknown[][] | undefined) ?? []

  // ── Feature descriptions from classFeature array ─────────────────────────
  const featureMap = new Map<string, ClassFeatureDesc>()
  const rawFeatures = (json.classFeature as Record<string, unknown>[] | undefined) ?? []
  for (const raw of rawFeatures) {
    if (raw.source !== classEntry.source && raw.classSource !== classEntry.source) continue
    const fname  = typeof raw.name === 'string' ? raw.name : ''
    const flevel = typeof raw.level === 'number' ? raw.level : 0
    const desc   = Array.isArray(raw.entries) ? flattenEntries(raw.entries) : ''
    if (fname) featureMap.set(`${fname}|${flevel}`, { name: fname, level: flevel, description: desc })
  }

  // ── Build levels array ────────────────────────────────────────────────────
  const levels: ClassLevel[] = Array.from({ length: 20 }, (_, i) => {
    const lvl = i + 1
    const refs = classFeatureRefs[i] ?? []
    const features = (refs as unknown[])
      .map(featureName)
      .filter((n): n is string => n !== null && n !== '')
      .filter((n, idx, arr) => arr.indexOf(n) === idx) // dedupe

    return {
      level: lvl,
      profBonus: profBonus(lvl),
      features,
      columns: allGroupRows[i].map(cellStr),
    }
  })

  const result: ClassProgressionData = {
    name: classEntry.name as string,
    source: classEntry.source as string,
    hitDie: hd,
    colLabels: allColLabels,
    levels,
    featureMap,
  }

  cache.set(cacheKey, result)
  return result
}
