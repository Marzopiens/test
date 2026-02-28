interface SectionLabelProps {
  children: React.ReactNode
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 h-px bg-gdpr-b" />
      <span className="text-[0.56rem] font-bold tracking-[2.5px] uppercase text-gdpr-mu">
        {children}
      </span>
      <div className="flex-1 h-px bg-gdpr-b" />
    </div>
  )
}
