import { useState, useEffect } from 'react'
import {
  getNextQuestion,
  getProgress,
  computeResult,
  inferAnswersFromText,
  extractAnswersWithClaude,
} from './gdprEngine'
import type { TriageAnswers, TriageResult, EngineQuestion } from './gdprEngine'
import { TriageResultDisplay } from './TriageResult'
import './gdpr.css'

interface GuidedStageProps {
  onBack: () => void
  scenario?: string
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

// Human-readable labels for inferred answers
const INFERRED_LABELS: Record<string, Record<string, string>> = {
  ctx_actor:   { STATE: 'Public authority', COMPANY: 'Private company', PLATFORM: 'Online platform', EMPLOYER: 'Your employer', PROFESSIONAL: 'Professional', PERSON: 'Private individual' },
  ctx_format:  { TEXT: 'Text', IMAGE: 'Images', VIDEO: 'Video', AUDIO: 'Audio', STRUCTURED: 'Structured data', METADATA: 'Metadata / tracking data', MIXED: 'Multiple formats' },
  ctx_action:  { UNAUTHORIZED_ACCESS: 'Unauthorised access / breach', PUBLICATION: 'Public disclosure', SALE_TRANSFER: 'Sale or transfer', INCORRECT_DELETION: 'Refused deletion', PROFILING: 'Profiling', INTL_TRANSFER: 'International transfer', COMMUNICATION: 'Sharing with third parties', COLLECTION: 'Data collection', STORAGE: 'Data storage', INTERNAL_USE: 'Internal use' },
  ctx_purpose: { MARKETING: 'Marketing', HEALTH: 'Healthcare', RESEARCH: 'Research', SECURITY: 'Security / fraud prevention', LEGAL_OBLIGATION: 'Legal obligation', SERVICE: 'Service provision', STATISTICS: 'Statistics', JUSTICE: 'Justice', OTHER: 'Other' },
  breach_1:    { YES: 'Security breach present', NO: 'No breach', UNSURE: 'Possible breach' },
  prof_1:      { YES: 'Profiling / automated scoring', NO: 'No profiling' },
  tr_1:        { YES: 'International transfer', NO: 'No transfer' },
  lb_main:     { CONSENT: 'Consent', CONTRACT: 'Contract', LEGAL_OBLIGATION: 'Legal obligation', LEGITIMATE_INTERESTS: 'Legitimate interests', PUBLIC_TASK: 'Public task' },
}

const SENSITIVE_LABELS: Record<string, string> = {
  HEALTH: 'Health data', BIOMETRIC: 'Biometric data', IDEOLOGY: 'Political opinions',
  RELIGION: 'Religious beliefs', SEXUAL_LIFE: 'Sexual orientation/life',
  TRADE_UNION: 'Trade union membership', CHILDREN: "Children's data", CRIMINAL: 'Criminal data',
}

const RIGHTS_LABELS: Record<string, string> = {
  ACCESS: 'Access request', RECTIFICATION: 'Rectification', ERASURE: 'Erasure',
  OBJECTION: 'Objection', RESTRICTION: 'Restriction', PORTABILITY: 'Portability',
}

function describeInferred(answers: TriageAnswers): string[] {
  const lines: string[] = []
  for (const [key, val] of Object.entries(answers)) {
    if (key === 'pd_1' || key === 'id_1') continue
    if (Array.isArray(val)) {
      if (key === 'sc_1') {
        const labels = val.filter(v => v !== 'NONE').map(v => SENSITIVE_LABELS[v] ?? v)
        if (labels.length) lines.push(`Sensitive data: ${labels.join(', ')}`)
      } else if (key === 'rights_1') {
        const labels = val.filter(v => v !== 'NONE').map(v => RIGHTS_LABELS[v] ?? v)
        if (labels.length) lines.push(`Rights exercised: ${labels.join(', ')}`)
      } else if (key === 'impact_1') {
        const labels = val.filter(v => v !== 'NONE')
        if (labels.length) lines.push(`Impact: ${labels.join(', ').toLowerCase()}`)
      }
    } else if (typeof val === 'string') {
      const map = INFERRED_LABELS[key]
      if (map && map[val]) lines.push(map[val])
    }
  }
  return lines
}

export function GuidedStage({ onBack, scenario }: GuidedStageProps) {
  const [answers, setAnswers] = useState<TriageAnswers>({})
  const [multiSel, setMultiSel] = useState<string[]>([])
  const [result, setResult] = useState<TriageResult | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [inferring, setInferring] = useState(!!scenario)
  const [inferredKeys, setInferredKeys] = useState<string[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [summaryLines, setSummaryLines] = useState<string[]>([])

  useEffect(() => {
    if (!scenario) return

    async function init() {
      if (!scenario) { setInferring(false); return }

      // Step 1: keyword inference (instant)
      let inferred = inferAnswersFromText(scenario)

      // Step 2: try Claude if API key saved (improves quality)
      const savedKey = localStorage.getItem('gdpr_api_key') ?? ''
      if (savedKey) {
        try {
          const claudeInferred = await extractAnswersWithClaude(scenario, savedKey)
          // Claude takes priority over keyword matching
          inferred = { ...inferred, ...claudeInferred }
        } catch {
          // silently fall back to keyword inference
        }
      }

      const keys = Object.keys(inferred)
      const lines = describeInferred(inferred)

      setAnswers(inferred)
      setInferredKeys(keys)
      setSummaryLines(lines)
      setInferring(false)
      if (lines.length > 0) setShowSummary(true)
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const question: EngineQuestion | null = (result || showSummary || inferring) ? null : getNextQuestion(answers)
  const { total } = getProgress(answers)
  const answeredManually = history.length
  const progress = total > 0 ? Math.min(((answeredManually) / Math.max(total - inferredKeys.length, 1)) * 100, 98) : 0

  function submitAnswer(questionId: string, value: string | string[]) {
    const newAnswers = { ...answers, [questionId]: value }
    setHistory((h) => [...h, questionId])
    setMultiSel([])

    const next = getNextQuestion(newAnswers)
    if (!next) setResult(computeResult(newAnswers))
    setAnswers(newAnswers)
  }

  function goBack() {
    if (history.length === 0) { onBack(); return }
    const lastId = history[history.length - 1]
    const newAnswers = { ...answers }
    delete newAnswers[lastId]
    setAnswers(newAnswers)
    setMultiSel([])
    setHistory((h) => h.slice(0, -1))
    setResult(null)
  }

  function restart() {
    setAnswers({})
    setMultiSel([])
    setResult(null)
    setHistory([])
    setInferredKeys([])
    setSummaryLines([])
    setShowSummary(false)
  }

  // ── Loading state while inferring
  if (inferring) {
    return (
      <div className="bg-gdpr-s border border-gdpr-b rounded-2xl overflow-hidden mt-6">
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #4631FF, #00E5A0)' }} />
        <div className="text-center px-5 py-12">
          <div
            className="w-[48px] h-[48px] mx-auto mb-4 rounded-full flex items-center justify-center text-[1.2rem] gdpr-spin"
            style={{ background: 'radial-gradient(circle, rgba(0,229,160,0.2), rgba(70,49,255,0.3))', border: '1px solid rgba(70,49,255,0.4)' }}
          >
            ⚖
          </div>
          <p className="text-gdpr-mu text-[0.84rem] gdpr-pulse">Reading your scenario…</p>
        </div>
      </div>
    )
  }

  // ── Inference summary before questions start
  if (showSummary) {
    return (
      <div className="bg-gdpr-s border border-gdpr-b rounded-2xl overflow-hidden mt-6 gdpr-fade-in">
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #4631FF, #00E5A0)' }} />
        <div className="p-[22px]">
          <div className="text-[0.58rem] font-bold tracking-[2px] uppercase text-gdpr-dim mb-3">
            Scenario analysis
          </div>
          <h2 className="text-[1.05rem] font-extrabold text-white mb-2 leading-[1.3]">
            Based on your description, I identified:
          </h2>
          <div className="bg-gdpr-s2 border border-gdpr-b rounded-[10px] px-[18px] py-4 mb-5">
            {summaryLines.length > 0 ? (
              summaryLines.map((line, i) => (
                <div key={i} className="flex gap-2 items-start mb-2 last:mb-0">
                  <span className="text-gdpr-em text-[0.75rem] flex-shrink-0 mt-[2px]">✓</span>
                  <span className="text-[0.82rem] text-gdpr-t leading-[1.5]">{line}</span>
                </div>
              ))
            ) : (
              <p className="text-[0.82rem] text-gdpr-mu">No specific context could be inferred. The full assessment will be shown.</p>
            )}
          </div>

          {summaryLines.length > 0 && (
            <p className="text-[0.76rem] text-gdpr-mu mb-5 leading-[1.55]">
              These answers have been pre-filled. You will only be asked questions that need further clarification.
            </p>
          )}

          <div className="flex gap-[10px] flex-wrap items-center">
            <button
              onClick={() => setShowSummary(false)}
              className="inline-flex items-center gap-2 rounded-[10px] px-6 py-[13px] text-white text-[0.86rem] font-bold cursor-pointer border-none transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #4631FF, #6B50FF)', boxShadow: '0 4px 20px rgba(70,49,255,0.35)' }}
            >
              Continue →
            </button>
            <button
              onClick={onBack}
              className="rounded-[10px] px-[18px] py-[11px] text-gdpr-mu text-[0.78rem] font-semibold cursor-pointer bg-transparent border border-gdpr-b2 hover:border-gdpr-em hover:text-gdpr-em transition-all"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Final result
  if (result) {
    return <TriageResultDisplay result={result} onRestart={restart} />
  }

  // ── No more questions — compute result immediately
  if (!question) {
    const r = computeResult(answers)
    setResult(r)
    return null
  }

  // ── Question UI
  return (
    <div className="bg-gdpr-s border border-gdpr-b rounded-2xl overflow-hidden mt-6 gdpr-fade-in">
      <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #4631FF, #00E5A0)' }} />
      <div className="p-[22px]">

        {/* Progress */}
        <div className="h-[2px] bg-gdpr-s3 rounded-[2px] mb-5 overflow-hidden">
          <div
            className="h-full rounded-[2px] transition-[width] duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #4631FF, #00E5A0)' }}
          />
        </div>

        {/* Module label + back */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-[0.58rem] font-bold tracking-[2px] uppercase text-gdpr-dim">
            {question.moduleLabel}
            {inferredKeys.length > 0 && (
              <span className="ml-2 text-gdpr-v3">· {inferredKeys.length} pre-filled from scenario</span>
            )}
          </div>
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-gdpr-mu text-[0.65rem] font-semibold tracking-[1px] uppercase bg-transparent border-none cursor-pointer p-0 font-[inherit] hover:text-gdpr-t transition-colors"
          >
            ← {history.length === 0 ? 'Exit' : 'Back'}
          </button>
        </div>

        {/* Question */}
        <h2 className="text-[clamp(0.95rem,3vw,1.15rem)] font-extrabold text-white mb-3 leading-[1.3]">
          {question.text}
        </h2>

        {/* Help box */}
        {question.help && (
          <div
            className="bg-gdpr-s2 border border-gdpr-b rounded-lg px-[14px] py-[10px] text-[0.76rem] text-gdpr-mu leading-[1.6] mb-4"
            style={{ borderLeft: '3px solid #4631FF' }}
          >
            {question.help}
          </div>
        )}

        {/* Options */}
        {question.multi ? (
          <div className="flex flex-col gap-2">
            {question.options.map((opt, i) => {
              const selected = multiSel.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === 'NONE') {
                      setMultiSel(['NONE'])
                    } else {
                      setMultiSel((prev) => {
                        const without = prev.filter((v) => v !== 'NONE')
                        return selected ? without.filter((v) => v !== opt.value) : [...without, opt.value]
                      })
                    }
                  }}
                  className="flex items-center gap-[11px] rounded-[10px] px-[15px] py-[13px] text-left text-[0.85rem] font-medium cursor-pointer transition-all font-[inherit] w-full"
                  style={{
                    background: selected ? 'rgba(70,49,255,0.15)' : '#18182F',
                    border: selected ? '1px solid #4631FF' : '1px solid #2A2A50',
                    color: selected ? '#fff' : '#E8E8F5',
                  }}
                >
                  <span
                    className="min-w-[24px] h-6 rounded flex items-center justify-center text-[0.62rem] flex-shrink-0 font-bold transition-colors"
                    style={{
                      border: selected ? '1px solid #4631FF' : '1px solid #363660',
                      color: selected ? '#4631FF' : '#6B6B99',
                      background: selected ? 'rgba(70,49,255,0.15)' : 'transparent',
                    }}
                  >
                    {selected ? '✓' : OPTION_LETTERS[i]}
                  </span>
                  {opt.label}
                </button>
              )
            })}
            <button
              onClick={() => submitAnswer(question.id, multiSel)}
              disabled={multiSel.length === 0}
              className="mt-2 w-full rounded-[10px] py-[13px] text-white text-[0.86rem] font-bold cursor-pointer border-none transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #4631FF, #6B50FF)', boxShadow: '0 4px 20px rgba(70,49,255,0.35)' }}
            >
              Continue →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {question.options.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => submitAnswer(question.id, opt.value)}
                className="flex items-center gap-[11px] bg-gdpr-s2 border border-gdpr-b rounded-[10px] px-[15px] py-[13px] text-gdpr-t text-left text-[0.85rem] leading-[1.5] font-medium cursor-pointer transition-all font-[inherit] w-full hover:bg-gdpr-s3 hover:border-gdpr-v hover:text-white"
              >
                <span className="min-w-[24px] h-6 border border-gdpr-b2 rounded-full flex items-center justify-center text-[0.62rem] text-gdpr-mu flex-shrink-0 font-bold">
                  {OPTION_LETTERS[i]}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
