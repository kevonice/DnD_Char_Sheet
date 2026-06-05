import { modifier, proficiencyBonus } from '../utils'
import type { Character } from '../types'

interface Props {
  char: Character
  onChange: (updates: Partial<Character>) => void
}

function IconCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center bg-amber-950/50 border border-amber-800/40 rounded-xl py-3 px-2 text-center flex-1 min-w-0">
      {children}
      <span className="text-[8px] uppercase tracking-widest text-amber-600/60 mt-1.5 leading-tight">{label}</span>
    </div>
  )
}

export default function CombatStats({ char, onChange }: Props) {
  const pb = proficiencyBonus(char.level)
  const initMod = modifier(char.abilities.dex)
  const initDisplay = initMod >= 0 ? `+${initMod}` : `${initMod}`
  const totalBar = char.maxHp + char.tempHp
  const hpPct = totalBar > 0 ? Math.max(0, Math.min(1, char.currentHp / totalBar)) : 0
  const hpColor = char.maxHp > 0
    ? (char.currentHp / char.maxHp > 0.5 ? 'bg-green-500' : char.currentHp / char.maxHp > 0.25 ? 'bg-yellow-500' : 'bg-red-500')
    : 'bg-green-500'
  const tempPct = totalBar > 0 ? char.tempHp / totalBar : 0

  return (
    <div className="space-y-3">
      {/* HP hero block */}
      <div className="bg-amber-950/60 border border-amber-800/50 rounded-xl p-4">
        <div className="flex items-stretch gap-3">
          {/* Current HP — large focal point */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-[9px] uppercase tracking-widest text-amber-600/60 mb-1">Current HP</span>
            <input
              type="number"
              value={char.currentHp}
              onFocus={e => e.target.select()}
              onChange={e => onChange({ currentHp: Math.min(Number(e.target.value), char.maxHp) })}
              className={`text-5xl font-bold bg-transparent text-center w-full focus:outline-none leading-none ${
                char.currentHp <= 0 ? 'text-red-400' : char.currentHp < char.maxHp / 2 ? 'text-yellow-400' : 'text-green-400'
              }`}
            />
          </div>
          {/* Max + Temp stacked */}
          <div className="flex flex-col gap-2 justify-center min-w-[72px]">
            <div className="flex flex-col items-center bg-amber-900/30 border border-amber-800/30 rounded-lg px-2 py-1.5">
              <span className="text-[8px] uppercase tracking-widest text-amber-600/50 mb-0.5">Max</span>
              <input
                type="number"
                value={char.maxHp}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const newMax = Number(e.target.value)
                  const updates: Partial<Character> = { maxHp: newMax }
                  if (char.currentHp > newMax) updates.currentHp = newMax
                  onChange(updates)
                }}
                className="text-lg font-bold bg-transparent text-amber-100 text-center w-full focus:outline-none"
              />
            </div>
            <div className="flex flex-col items-center bg-amber-900/30 border border-amber-800/30 rounded-lg px-2 py-1.5">
              <span className="text-[8px] uppercase tracking-widest text-amber-600/50 mb-0.5">Temp</span>
              <input
                type="number"
                value={char.tempHp}
                onFocus={e => e.target.select()}
                onChange={e => onChange({ tempHp: Number(e.target.value) })}
                className="text-lg font-bold bg-transparent text-blue-300 text-center w-full focus:outline-none"
              />
            </div>
          </div>
        </div>
        {/* HP bar — green/yellow/red for current HP, blue extension for temp HP */}
        <div className="mt-3 h-1.5 bg-amber-950 rounded-full overflow-hidden border border-amber-900/60 flex">
          <div
            className={`h-full transition-all duration-300 ${hpColor}`}
            style={{ width: `${hpPct * 100}%` }}
          />
          <div
            className="h-full bg-blue-400 transition-all duration-300"
            style={{ width: `${tempPct * 100}%` }}
          />
        </div>
      </div>

      {/* Icon stat row */}
      <div className="flex gap-2">
        <IconCard label="Armour Class">
          <input
            type="number"
            value={char.ac}
            onChange={e => onChange({ ac: Number(e.target.value) })}
            className="text-2xl font-bold bg-transparent text-amber-100 text-center w-full focus:outline-none"
          />
        </IconCard>
        <IconCard label="Initiative">
          <span className="text-2xl font-bold text-amber-100">{initDisplay}</span>
        </IconCard>
        <IconCard label="Speed">
          <div className="flex items-baseline gap-0.5">
            <input
              type="number"
              value={char.speed}
              onChange={e => onChange({ speed: Number(e.target.value) })}
              className="text-2xl font-bold bg-transparent text-amber-100 text-center w-12 focus:outline-none"
            />
            <span className="text-[10px] text-amber-600/50">ft</span>
          </div>
        </IconCard>
        <IconCard label="Proficiency">
          <span className="text-2xl font-bold text-amber-100">+{pb}</span>
        </IconCard>
      </div>

      {/* Hit dice + Death saves */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-amber-950/50 border border-amber-800/40 rounded-xl p-3">
          <div className="flex items-start justify-between gap-1 mb-1.5">
            <span className="text-[9px] uppercase tracking-widest text-amber-600/60">Hit Dice</span>
            <div className="flex flex-col items-end">
              <span className="text-[8px] uppercase tracking-widest text-amber-700/40 leading-none">Max</span>
              <input
                value={char.maxHitDice ?? char.hitDice}
                onChange={e => onChange({ maxHitDice: e.target.value })}
                className="bg-transparent text-amber-500/70 text-[11px] text-right w-14 focus:outline-none font-mono"
                placeholder="10d8"
              />
            </div>
          </div>
          <input
            value={char.hitDice}
            onChange={e => onChange({ hitDice: e.target.value })}
            className="bg-transparent text-amber-100 text-sm w-full focus:outline-none"
            placeholder="1d8"
          />
        </div>
        <div className="bg-amber-950/50 border border-amber-800/40 rounded-xl p-3">
          <span className="text-[9px] uppercase tracking-widest text-amber-600/60 block mb-1.5">Death Saves</span>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-green-400/70 w-3">S</span>
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => onChange({ deathSaveSuccesses: char.deathSaveSuccesses === i + 1 ? i : i + 1 })}
                  className={`w-3.5 h-3.5 rounded-full border transition-colors ${i < char.deathSaveSuccesses ? 'bg-green-400 border-green-400' : 'border-amber-700/50 hover:border-green-400/50'}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-red-400/70 w-3">F</span>
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => onChange({ deathSaveFailures: char.deathSaveFailures === i + 1 ? i : i + 1 })}
                  className={`w-3.5 h-3.5 rounded-full border transition-colors ${i < char.deathSaveFailures ? 'bg-red-400 border-red-400' : 'border-amber-700/50 hover:border-red-400/50'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
