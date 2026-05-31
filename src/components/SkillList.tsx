import { ALL_SKILLS, SKILL_ABILITIES, skillBonusStr } from '../utils'
import type { AbilityScores, SkillEntry } from '../types'

interface Props {
  abilities: AbilityScores
  skills: Record<string, SkillEntry>
  level: number
  onChange: (skill: string, entry: SkillEntry) => void
}

export default function SkillList({ abilities, skills, level, onChange }: Props) {
  return (
    <div className="space-y-0.5">
      {ALL_SKILLS.map(skill => {
        const entry = skills[skill] ?? { proficient: false, expertise: false }
        const bonus = skillBonusStr(skill, abilities, entry, level)
        const ability = SKILL_ABILITIES[skill].toUpperCase()

        return (
          <div key={skill} className="flex items-center gap-1.5 text-xs">
            {/* expertise dot */}
            <button
              title="Expertise"
              onClick={() => onChange(skill, { ...entry, expertise: !entry.expertise, proficient: !entry.expertise ? true : entry.proficient })}
              className={`w-3 h-3 rounded-full border flex-shrink-0 transition-colors ${
                entry.expertise ? 'bg-amber-400 border-amber-400' : 'border-amber-700/50 hover:border-amber-500'
              }`}
            />
            {/* proficiency dot */}
            <button
              title="Proficiency"
              onClick={() => onChange(skill, { ...entry, proficient: !entry.proficient, expertise: !entry.proficient ? false : entry.expertise })}
              className={`w-3 h-3 rounded-full border flex-shrink-0 transition-colors ${
                entry.proficient && !entry.expertise ? 'bg-amber-200 border-amber-200' : 'border-amber-700/50 hover:border-amber-500'
              }`}
            />
            <span className="w-6 text-amber-500/60 flex-shrink-0">{bonus}</span>
            <span className="text-amber-100 flex-1">{skill}</span>
            <span className="text-amber-600/50">{ability}</span>
          </div>
        )
      })}
    </div>
  )
}
