import type { Grants } from '../../data/creator2014'

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six']
const word = (n: number) => WORDS[n] ?? String(n)

/** ["+2 DEX", "+1 INT", "+1 to two abilities of your choice"] */
export function abilityBonusText(g: Grants): string[] {
  const fixed = Object.entries(g.abilityFixed).filter(([, v]) => v)
  // Standard Human: +1 to every ability reads better as one line.
  if (fixed.length === 6 && fixed.every(([, v]) => v === fixed[0][1])) return [`+${fixed[0][1]} to every ability`]
  const out = fixed.map(([k, v]) => `+${v} ${k.toUpperCase()}`)
  for (const c of g.abilityChoices) {
    const any = c.from.length === 6
    out.push(`+${c.amount} to ${word(c.count)} ${any ? 'abilities of your choice' : `of ${c.from.map(a => a.toUpperCase()).join('/')}`}`)
  }
  return out
}
