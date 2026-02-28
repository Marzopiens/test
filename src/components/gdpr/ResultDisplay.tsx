import type { Verdict } from './gdprData'
import { VerdictBadge } from './VerdictBadge'
import { SectionLabel } from './SectionLabel'
import { DpaAccordion } from './DpaAccordion'

interface ResultDisplayProps {
  verdict: Verdict
  scenario?: string
  onRestart: () => void
  onContinueGuided?: () => void
}

export function ResultDisplay({ verdict, scenario, onRestart, onContinueGuided }: ResultDisplayProps) {
  return (
    <div className="gdpr-fade-in">
      {scenario && (
        <div className="bg-gdpr-s2 border border-gdpr-b rounded-xl px-4 py-[13px] mb-[14px] mt-6">
          <div className="text-[0.56rem] font-bold tracking-[2px] uppercase text-gdpr-dim mb-[7px]">
            Your scenario
          </div>
          <p className="text-[0.81rem] text-gdpr-mu leading-[1.65] italic">{scenario}</p>
        </div>
      )}

      <VerdictBadge verdict={verdict.key} label={verdict.label} />
      <h2 className="text-[clamp(1rem,3vw,1.32rem)] font-extrabold text-white mb-[10px]">
        {verdict.title}
      </h2>
      <div className="bg-gdpr-s2 border border-gdpr-b rounded-[10px] px-[18px] py-4 mb-3">
        <p className="text-[0.82rem] text-gdpr-t leading-[1.65]">{verdict.summary}</p>
      </div>

      <SectionLabel>Your rights</SectionLabel>
      <div className="bg-gdpr-s2 border border-gdpr-b rounded-[10px] px-[18px] py-4 mb-3">
        {verdict.rights.map((r, i) => (
          <div key={i} className="flex gap-[9px] items-start mb-2 last:mb-0 text-[0.8rem] text-gdpr-em leading-[1.5]">
            <span className="text-gdpr-dim flex-shrink-0">›</span>
            <span>{r}</span>
          </div>
        ))}
      </div>

      <SectionLabel>Recommended actions</SectionLabel>
      <div className="bg-gdpr-s2 border border-gdpr-b rounded-[10px] px-[18px] py-4 mb-3">
        {verdict.actions.map((a, i) => (
          <div key={i} className="flex gap-3 items-start mb-[11px] last:mb-0">
            <div
              className="min-w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[0.6rem] font-extrabold text-white flex-shrink-0 mt-[2px]"
              style={{ background: 'linear-gradient(135deg, #4631FF, #6B50FF)' }}
            >
              {i + 1}
            </div>
            <p className="text-[0.82rem] text-gdpr-t leading-[1.6]">{a}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-[14px] py-[9px] rounded-lg mb-4"
        style={{ background: 'rgba(70,49,255,0.06)', border: '1px solid rgba(70,49,255,0.2)' }}>
        <span className="text-[0.7rem] text-gdpr-mu font-medium">⚖ {verdict.legalRef}</span>
      </div>

      <DpaAccordion />

      <div className="text-center text-[0.63rem] text-gdpr-dim mt-4 leading-[1.6] px-2">
        This tool provides general information only and does not constitute legal advice.
        Always consult a qualified legal professional for advice specific to your situation.
      </div>

      <div className="flex gap-[10px] flex-wrap items-center mt-5">
        {onContinueGuided && (
          <button
            onClick={onContinueGuided}
            className="inline-flex items-center gap-2 rounded-[10px] px-6 py-[13px] text-white text-[0.86rem] font-bold cursor-pointer border-none transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #4631FF, #6B50FF)',
              boxShadow: '0 4px 20px rgba(70,49,255,0.35)',
            }}
          >
            Try guided assessment
          </button>
        )}
        <button
          onClick={onRestart}
          className="rounded-[10px] px-[18px] py-[11px] text-gdpr-mu text-[0.78rem] font-semibold cursor-pointer transition-all bg-transparent border border-gdpr-b2 hover:border-gdpr-em hover:text-gdpr-em"
        >
          Start new check
        </button>
      </div>
    </div>
  )
}
