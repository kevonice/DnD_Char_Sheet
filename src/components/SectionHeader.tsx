interface Props {
  title: string
}

export default function SectionHeader({ title }: Props) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 bg-amber-600/70 rounded-full flex-shrink-0" />
      <span className="text-[10px] font-bold tracking-widest uppercase text-amber-500/90">
        {title}
      </span>
    </div>
  )
}
