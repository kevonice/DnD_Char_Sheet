import type { AbilityKey, AbilityScores } from '../../types'
import { ABILITY_KEYS } from '../../utils'

export type AbilityMethod = 'array' | 'pointbuy' | 'roll'

export interface AbilityState {
  method: AbilityMethod
  pool: (number | null)[]                    // six values to assign (array / roll)
  dice: number[][]                           // 4d6 detail per pool slot (roll only)
  assign: Record<AbilityKey, number | null>  // ability → pool index
  pointBuy: Record<AbilityKey, number>
}

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]
export const POINT_BUDGET = 27
export const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }

const empty = <T,>(v: T) => Object.fromEntries(ABILITY_KEYS.map(k => [k, v])) as Record<AbilityKey, T>

export function initialAbilityState(): AbilityState {
  return { method: 'array', pool: [...STANDARD_ARRAY], dice: [], assign: empty(null), pointBuy: empty(8) }
}

export function switchMethod(s: AbilityState, method: AbilityMethod): AbilityState {
  if (method === s.method) return s
  return {
    ...s, method, assign: empty(null), dice: [],
    pool: method === 'array' ? [...STANDARD_ARRAY] : method === 'roll' ? [null, null, null, null, null, null] : s.pool,
  }
}

/** Base scores before racial bonuses; null = not assigned yet. */
export function baseScores(s: AbilityState): Record<AbilityKey, number | null> {
  if (s.method === 'pointbuy') return { ...s.pointBuy }
  return Object.fromEntries(ABILITY_KEYS.map(k => {
    const idx = s.assign[k]
    return [k, idx == null ? null : s.pool[idx] ?? null]
  })) as Record<AbilityKey, number | null>
}

export function pointsSpent(s: AbilityState): number {
  return ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[s.pointBuy[k]] ?? 0), 0)
}

export function baseComplete(s: AbilityState): boolean {
  if (s.method === 'pointbuy') return pointsSpent(s) <= POINT_BUDGET
  return ABILITY_KEYS.every(k => {
    const v = baseScores(s)[k]
    return v != null && v >= 3 && v <= 18
  })
}

export function finalScores(base: Record<AbilityKey, number | null>, bonus: Record<AbilityKey, number>): AbilityScores {
  return Object.fromEntries(ABILITY_KEYS.map(k => [k, (base[k] ?? 10) + bonus[k]])) as unknown as AbilityScores
}

/** Roll 4d6, drop the lowest. Returns the four dice sorted high → low and the total. */
export function roll4d6(): { dice: number[]; total: number } {
  const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a)
  return { dice, total: dice[0] + dice[1] + dice[2] }
}

/** Highest pool values go to the class's priority abilities. */
export function suggestAssignment(pool: (number | null)[], priority: AbilityKey[]): Record<AbilityKey, number | null> {
  const order = pool.map((v, i) => ({ v: v ?? -1, i })).sort((a, b) => b.v - a.v)
  const out = empty<number | null>(null)
  priority.forEach((k, n) => { if (order[n] && order[n].v >= 0) out[k] = order[n].i })
  return out
}
