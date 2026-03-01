import type { TriageResult, RiskLevel, PrincipleStatus } from './gdprEngine'
import { DpaAccordion } from './DpaAccordion'
import './gdpr.css'

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; dot: string }> = {
  LOW:      { label: 'Low Risk',      color: '#6B6B99', bg: 'rgba(107,107,153,0.12)', dot: '#6B6B99' },
  MED:      { label: 'Medium Risk',   color: '#E37E07', bg: 'rgba(227,126,7,0.10)',   dot: '#E37E07' },
  HIGH:     { label: 'High Risk',     color: '#6B50FF', bg: 'rgba(107,80,255,0.12)',  dot: '#6B50FF' },
  CRITICAL: { label: 'Critical Risk', color: '#00E5A0', bg: 'rgba(0,229,160,0.10)',   dot: '#00E5A0' },
}

const PRINCIPLE_LABEL: Record<PrincipleStatus, { text: string; color: string }> = {
  PASS:    { text: 'PASS',    color: '#00E5A0' },
  FAIL:    { text: 'FAIL',    color: '#FF6B6B' },
  UNKNOWN: { text: 'UNKNOWN', color: '#6B6B99' },
}

// Map internal article codes to readable labels
const ARTICLE_LABELS: Record<string, string> = {
  ART_6_LAWFULNESS_UNCERTAIN:                'Art. 6 — No clear lawful basis identified',
  ART_6_1_A_CONSENT_RISK:                   'Art. 6(1)(a) — Defective consent',
  ART_7_CONDITIONS_RISK:                     'Art. 7 — Conditions for consent not met',
  ART_6_1_B_NECESSITY_RISK:                  'Art. 6(1)(b) — Processing exceeds contractual necessity',
  ART_6_1_D_VITAL_INTERESTS_RISK:           'Art. 6(1)(d) — Vital interests basis unjustified',
  ART_6_1_E_PUBLIC_TASK_DISPROPORTIONATE:   'Art. 6(1)(e) — Disproportionate public task processing',
  ART_6_1_F_NOT_APPLICABLE_TO_PUBLIC_AUTHORITIES: 'Art. 6(1)(f) — Legitimate interests not available to public authorities',
  ART_6_1_F_BALANCING_RISK:                 'Art. 6(1)(f) — Balancing test fails (your interests prevail)',
  ART_5_1_A_RISK:                           'Art. 5(1)(a) — Lawfulness, fairness or transparency deficit',
  ART_5_1_B_PURPOSE_LIMITATION_RISK:        'Art. 5(1)(b) — Purpose limitation violated',
  ART_5_1_C_DATA_MINIMISATION_RISK:         'Art. 5(1)(c) — Data minimisation principle violated',
  ART_5_1_D_ACCURACY_RISK:                  'Art. 5(1)(d) — Accuracy principle violated',
  ART_5_1_E_STORAGE_LIMITATION_RISK:        'Art. 5(1)(e) — Storage limitation exceeded',
  ART_5_PUBLIC_DISCLOSURE_RISK:             'Art. 5 — Unlawful public disclosure of personal data',
  ART_5_2_ACCOUNTABILITY_RISK:              'Art. 5(2) — Accountability — controller cannot demonstrate compliance',
  ART_9_SPECIAL_CATEGORY_RISK:             'Art. 9 — Special category data processed without valid exception',
  ART_10_CRIMINAL_DATA_RISK:               'Art. 10 — Criminal data processed without official authority',
  ART_12_14_INFO_DEFICIT:                  'Arts. 12–14 — Transparency / information obligations not met',
  ART_13_14_INFO_DEFICIT:                  'Arts. 13–14 — Legitimate interest not communicated',
  ART_12_22_RIGHTS_HANDLING_RISK:          'Arts. 12–22 — Rights request not handled correctly',
  ART_22_AUTOMATED_DECISION_RISK:          'Art. 22 — Automated decision without human review',
  ART_22_PROFILING_RISK:                   'Art. 22 — Profiling without adequate safeguards',
  ART_32_SECURITY_RISK:                    'Art. 32 — Inadequate security measures',
  ART_34_BREACH_NOTIFICATION_RISK:         'Art. 34 — Failure to notify individuals of breach',
  ART_35_DPIA_RISK:                        'Art. 35 — DPIA not conducted for high-risk processing',
  CHAPTER_V_TRANSFER_RISK:                 'Chapter V — International transfer without adequate safeguard',
}

function articleLabel(code: string): string {
  return ARTICLE_LABELS[code] ?? code.replace(/_/g, ' ')
}

interface TriageResultProps {
  result: TriageResult
  onRestart: () => void
}

export function TriageResultDisplay({ result, onRestart }: TriageResultProps) {
  const rc = RISK_CONFIG[result.risk_level]

  if (!result.gdpr_applicable) {
    return (
      <div className="gdpr-fade-in mt-6">
        <div className="bg-gdpr-s border border-gdpr-b rounded-2xl overflow-hidden">
          <div className="h-[2px] bg-gdpr-b" />
          <div className="p-[22px]">
            <div className="text-[0.63rem] font-extrabold tracking-[2px] uppercase text-gdpr-mu mb-4">
              Assessment complete
            </div>
            <h2 className="text-[clamp(1rem,3vw,1.32rem)] font-extrabold text-white mb-3">
              {result.verdict_title}
            </h2>
            <p className="text-[0.85rem] text-gdpr-mu leading-[1.65] mb-6">{result.verdict_summary}</p>
            {result.next_actions.map((a, i) => (
              <p key={i} className="text-[0.82rem] text-gdpr-t leading-[1.6] mb-2">{a}</p>
            ))}
            <button
              onClick={onRestart}
              className="mt-5 rounded-[10px] px-[18px] py-[11px] text-gdpr-mu text-[0.78rem] font-semibold cursor-pointer bg-transparent border border-gdpr-b2 hover:border-gdpr-em hover:text-gdpr-em transition-all"
            >
              Start new check
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gdpr-fade-in mt-6 pb-10">
      {/* Risk badge */}
      <div
        className="inline-flex items-center gap-2 rounded-full px-[14px] py-[6px] mb-4"
        style={{ background: rc.bg }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: rc.dot }} />
        <span className="text-[0.63rem] font-extrabold tracking-[2px] uppercase" style={{ color: rc.color }}>
          {rc.label}
        </span>
      </div>

      <h2 className="text-[clamp(1rem,3vw,1.32rem)] font-extrabold text-white mb-3 leading-[1.2]">
        {result.verdict_title}
      </h2>

      {/* Summary */}
      <div className="bg-gdpr-s2 border border-gdpr-b rounded-[10px] px-[18px] py-4 mb-4">
        <p className="text-[0.85rem] text-gdpr-t leading-[1.65]">{result.verdict_summary}</p>
      </div>

      {/* Art. 5 Principles */}
      <SectionLabel>Art. 5 Principle Assessment</SectionLabel>
      <div className="bg-gdpr-s2 border border-gdpr-b rounded-[10px] overflow-hidden mb-4">
        {Object.entries(result.principle_flags).map(([principle, status], i) => {
          const pc = PRINCIPLE_LABEL[status]
          return (
            <div
              key={principle}
              className="flex items-center justify-between px-[18px] py-[11px] text-[0.78rem]"
              style={{ borderTop: i > 0 ? '1px solid #2A2A50' : 'none' }}
            >
              <span className="text-gdpr-t">{principle}</span>
              <span className="text-[0.6rem] font-extrabold tracking-[1.5px] uppercase ml-4 flex-shrink-0"
                style={{ color: pc.color }}>
                {pc.text}
              </span>
            </div>
          )
        })}
      </div>

      {/* Articles at risk */}
      {result.likely_articles.length > 0 && (
        <>
          <SectionLabel>GDPR provisions at risk</SectionLabel>
          <div className="bg-gdpr-s2 border border-gdpr-b rounded-[10px] px-[18px] py-4 mb-4">
            {result.likely_articles.map((code, i) => (
              <div key={i} className="flex gap-[9px] items-start mb-2 last:mb-0 text-[0.78rem] leading-[1.5]">
                <span className="text-gdpr-dim flex-shrink-0 mt-[1px]">›</span>
                <span className="text-gdpr-t">{articleLabel(code)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Next actions */}
      <SectionLabel>Recommended actions</SectionLabel>
      <div className="bg-gdpr-s2 border border-gdpr-b rounded-[10px] px-[18px] py-4 mb-4">
        {result.next_actions.map((action, i) => (
          <div key={i} className="flex gap-3 items-start mb-[11px] last:mb-0">
            <div
              className="min-w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[0.6rem] font-extrabold text-white flex-shrink-0 mt-[2px]"
              style={{ background: 'linear-gradient(135deg, #4631FF, #6B50FF)' }}
            >
              {i + 1}
            </div>
            <p className="text-[0.82rem] text-gdpr-t leading-[1.6]">{action}</p>
          </div>
        ))}
      </div>

      {/* DPA Accordion */}
      <DpaAccordion />

      {/* Disclaimer */}
      <div className="text-center text-[0.63rem] text-gdpr-dim mt-4 leading-[1.6] px-2">
        This tool provides general information only and does not constitute legal advice.
        Always consult a qualified legal professional for advice specific to your situation.
      </div>

      <div className="mt-5">
        <button
          onClick={onRestart}
          className="rounded-[10px] px-[18px] py-[11px] text-gdpr-mu text-[0.78rem] font-semibold cursor-pointer bg-transparent border border-gdpr-b2 hover:border-gdpr-em hover:text-gdpr-em transition-all"
        >
          Start new check
        </button>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 h-px bg-gdpr-b" />
      <span className="text-[0.56rem] font-bold tracking-[2.5px] uppercase text-gdpr-mu">{children}</span>
      <div className="flex-1 h-px bg-gdpr-b" />
    </div>
  )
}
