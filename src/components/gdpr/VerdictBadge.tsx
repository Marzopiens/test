import type { VerdictKey } from './gdprData'

const VERDICT_STYLES: Record<VerdictKey, { bg: string; dotColor: string; textColor: string }> = {
  strong: {
    bg: 'rgba(0,229,160,0.1)',
    dotColor: '#00E5A0',
    textColor: '#00E5A0',
  },
  possible: {
    bg: 'rgba(70,49,255,0.12)',
    dotColor: '#6B50FF',
    textColor: '#A89FFF',
  },
  limited: {
    bg: 'rgba(227,126,7,0.1)',
    dotColor: '#E37E07',
    textColor: '#E37E07',
  },
  none: {
    bg: 'rgba(107,107,153,0.12)',
    dotColor: '#6B6B99',
    textColor: '#6B6B99',
  },
}

interface VerdictBadgeProps {
  verdict: VerdictKey
  label: string
}

export function VerdictBadge({ verdict, label }: VerdictBadgeProps) {
  const s = VERDICT_STYLES[verdict]
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-[14px] py-[6px] mb-4"
      style={{ background: s.bg }}
    >
      <span
        className="w-2 h-2 rounded-full inline-block"
        style={{ background: s.dotColor }}
      />
      <span
        className="text-[0.63rem] font-extrabold tracking-[2px] uppercase"
        style={{ color: s.textColor }}
      >
        {label}
      </span>
    </div>
  )
}
