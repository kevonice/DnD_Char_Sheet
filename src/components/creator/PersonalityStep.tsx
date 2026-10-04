import type { BackgroundOption } from '../../data/creator2014'
import type { Personality } from '../../data/creatorBuild'
import { SectionLabel } from './ui'

interface Props {
  background: BackgroundOption | null
  personality: Personality
  onPersonality: (p: Personality) => void
  alignment: string
  onAlignment: (a: string) => void
}

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
]

const pickRandom = <T,>(xs: T[], n: number): T[] => [...xs].sort(() => Math.random() - 0.5).slice(0, n)

function TableSection({ title, hint, options, value, onChange, pickCount }: {
  title: string
  hint: string
  options: string[]
  value: string
  onChange: (v: string) => void
  pickCount: number            // 2 for personality traits, 1 for the rest
}) {
  const lines = value.split('\n').filter(Boolean)
  function toggle(opt: string) {
    if (pickCount === 1) return onChange(value === opt ? '' : opt)
    onChange(lines.includes(opt) ? lines.filter(l => l !== opt).join('\n') : [...lines, opt].join('\n'))
  }
  return (
    <section className="rounded-xl border border-amber-800/30 bg-amber-950/30 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel>{title}</SectionLabel>
        {options.length > 0 && (
          <button
            onClick={() => onChange(pickRandom(options, pickCount).join('\n'))}
            className="text-xs px-2 py-0.5 rounded border border-amber-700/50 text-amber-300 hover:bg-amber-800/30"
          >🎲 Roll</button>
        )}
      </div>
      <p className="text-[11px] text-amber-500/70 mb-2">{hint}</p>
      {options.length > 0 && (
        <div className="space-y-1 mb-2">
          {options.map((opt, i) => {
            const on = pickCount === 1 ? value === opt : lines.includes(opt)
            return (
              <button
                key={i}
                onClick={() => toggle(opt)}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                  on ? 'bg-amber-600/25 border-amber-500/60 text-amber-50' : 'border-amber-900/40 text-amber-300/80 hover:border-amber-700/60'
                }`}
              >
                <span className="text-amber-600/80 font-mono mr-1.5">{i + 1}.</span>{opt}
              </button>
            )
          })}
        </div>
      )}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={pickCount > 1 ? 3 : 2}
        placeholder={options.length ? 'Pick from the list above, or write your own…' : 'Write your own…'}
        className="w-full bg-amber-950/60 border border-amber-800/40 rounded-lg p-2 text-xs text-amber-100 placeholder:text-amber-800/60 focus:outline-none focus:border-amber-600 resize-y"
      />
    </section>
  )
}

export default function PersonalityStep({ background, personality, onPersonality, alignment, onAlignment }: Props) {
  const t = background?.tables ?? { traits: [], ideals: [], bonds: [], flaws: [] }
  const set = (patch: Partial<Personality>) => onPersonality({ ...personality, ...patch })
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-amber-800/30 bg-amber-950/30 p-3">
        <SectionLabel>Alignment</SectionLabel>
        <p className="text-[11px] text-amber-500/70 mb-2">A rough compass for your character's morals. It describes them; it doesn't bind them.</p>
        <div className="grid grid-cols-3 gap-1.5 max-w-md">
          {ALIGNMENTS.map(a => (
            <button
              key={a}
              onClick={() => onAlignment(alignment === a ? '' : a)}
              className={`px-2 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                alignment === a ? 'bg-amber-600/30 border-amber-500/70 text-amber-100' : 'border-amber-800/40 text-amber-400/80 hover:border-amber-600/60'
              }`}
            >{a}</button>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <TableSection title="Personality traits" hint="Pick two — how your character acts and talks." options={t.traits} value={personality.traits} onChange={v => set({ traits: v })} pickCount={2} />
        <TableSection title="Ideal" hint="What they believe in. The tag in brackets hints at an alignment." options={t.ideals} value={personality.ideal} onChange={v => set({ ideal: v })} pickCount={1} />
        <TableSection title="Bond" hint="A person, place or cause they care about." options={t.bonds} value={personality.bond} onChange={v => set({ bond: v })} pickCount={1} />
        <TableSection title="Flaw" hint="A weakness others could exploit. Great for roleplay." options={t.flaws} value={personality.flaw} onChange={v => set({ flaw: v })} pickCount={1} />
      </div>
    </div>
  )
}
