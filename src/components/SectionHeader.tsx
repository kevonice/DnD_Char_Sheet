interface Props {
  title: string
}

export default function SectionHeader({ title }: Props) {
  return (
    <div className="relative flex items-center mb-3">
      <div className="flex-1 h-px bg-amber-800/50" />
      <span className="mx-3 text-xs font-bold tracking-widest uppercase text-amber-500/80">
        {title}
      </span>
      <div className="flex-1 h-px bg-amber-800/50" />
    </div>
  )
}
