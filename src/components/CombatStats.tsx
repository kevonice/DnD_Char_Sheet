import { modifier, proficiencyBonus } from '../utils'
import type { Character } from '../types'

interface Props {
  char: Character
  onChange: (updates: Partial<Character>) => void
}

function StatBox({ label, value, children }: { label: string; value?: string | number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center bg-amber-950/40 border border-amber-800/40 rounded-lg py-2 px-2 text-center">
      {children ?? <span className="text-xl font-bold text-amber-100">{value}</span>}
      <span className="text-[9px] uppercase tracking-widest text-amber-600/70 mt-1">{label}</span>
    </div>
  )
}

export default function CombatStats({ char, onChange }: Props) {
  const pb = proficiencyBonus(char.level)
  const initMod = modifier(char.abilities.dex)
  const initDisplay = initMod >= 0 ? `+${initMod}` : `${initMod}`

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <StatBox label="Proficiency">
          <span className="text-xl font-bold text-amber-100">+{pb}</span>
        </StatBox>
        <StatBox label="Initiative">
          <span className="text-xl font-bold text-amber-100">{initDisplay}</span>
        </StatBox>
        <StatBox label="AC">
          <input
            type="number"
            value={char.ac}
            onChange={e => onChange({ ac: Number(e.target.value) })}
            className="w-12 text-center text-xl font-bold bg-transparent text-amber-100"
          />
        </StatBox>
        <StatBox label="Speed">
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              value={char.speed}
              onChange={e => onChange({ speed: Number(e.target.value) })}
              className="w-10 text-center text-xl font-bold bg-transparent text-amber-100"
            />
            <span className="text-xs text-amber-600/60">ft</span>
          </div>
        </StatBox>
      </div>

      {/* HP */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Max HP">
          <input
            type="number"
            value={char.maxHp}
            onChange={e => onChange({ maxHp: Number(e.target.value) })}
            className="w-12 text-center text-xl font-bold bg-transparent text-amber-100"
          />
        </StatBox>
        <StatBox label="Current HP">
          <input
            type="number"
            value={char.currentHp}
            onChange={e => onChange({ currentHp: Number(e.target.value) })}
            className={`w-12 text-center text-xl font-bold bg-transparent ${
              char.currentHp <= 0 ? 'text-red-400' : char.currentHp < char.maxHp / 2 ? 'text-yellow-400' : 'text-green-400'
            }`}
          />
        </StatBox>
        <StatBox label="Temp HP">
          <input
            type="number"
            value={char.tempHp}
            onChange={e => onChange({ tempHp: Number(e.target.value) })}
            className="w-12 text-center text-xl font-bold bg-transparent text-blue-300"
          />
        </StatBox>
      </div>

      {/* Hit dice & Death saves */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2">
          <span className="text-[9px] uppercase tracking-widest text-amber-600/70 block mb-1">Hit Dice</span>
          <input
            value={char.hitDice}
            onChange={e => onChange({ hitDice: e.target.value })}
            className="bg-transparent text-amber-100 text-sm w-full"
            placeholder="1d8"
          />
        </div>
        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2">
          <span className="text-[9px] uppercase tracking-widest text-amber-600/70 block mb-1">Death Saves</span>
          <div className="flex gap-2 text-xs">
            <div>
              <span className="text-green-400/70">S </span>
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => onChange({ deathSaveSuccesses: char.deathSaveSuccesses === i + 1 ? i : i + 1 })}
                  className={`w-3 h-3 rounded-full border mr-0.5 ${i < char.deathSaveSuccesses ? 'bg-green-400 border-green-400' : 'border-amber-700/50'}`}
                />
              ))}
            </div>
            <div>
              <span className="text-red-400/70">F </span>
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => onChange({ deathSaveFailures: char.deathSaveFailures === i + 1 ? i : i + 1 })}
                  className={`w-3 h-3 rounded-full border mr-0.5 ${i < char.deathSaveFailures ? 'bg-red-400 border-red-400' : 'border-amber-700/50'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
