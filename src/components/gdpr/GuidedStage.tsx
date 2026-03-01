import { useState } from 'react'
import { getNextQuestion, getProgress, computeResult } from './gdprEngine'
import type { TriageAnswers, TriageResult, EngineQuestion } from './gdprEngine'
import { TriageResultDisplay } from './TriageResult'
import './gdpr.css'

interface GuidedStageProps {
  onBack: () => void
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

export function GuidedStage({ onBack }: GuidedStageProps) {
  const [answers, setAnswers] = useState<TriageAnswers>({})
  const [multiSel, setMultiSel] = useState<string[]>([])
  const [result, setResult] = useState<TriageResult | null>(null)
  const [history, setHistory] = useState<string[]>([]) // question ids for back navigation

  const question: EngineQuestion | null = result ? null : getNextQuestion(answers)
  const { current, total } = getProgress(answers)
  const progress = total > 0 ? Math.min((current / total) * 100, 98) : 0

  function submitAnswer(questionId: string, value: string | string[]) {
    const newAnswers = { ...answers, [questionId]: value }
    setHistory((h) => [...h, questionId])
    setMultiSel([])

    const next = getNextQuestion(newAnswers)
    if (!next) {
      setResult(computeResult(newAnswers))
    }
    setAnswers(newAnswers)
  }

  function goBack() {
    if (history.length === 0) {
      onBack()
      return
    }
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
  }

  if (result) {
    return <TriageResultDisplay result={result} onRestart={restart} />
  }

  if (!question) return null

  return (
    <div className="bg-gdpr-s border border-gdpr-b rounded-2xl overflow-hidden mt-6 gdpr-fade-in">
      <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #4631FF, #00E5A0)' }} />
      <div className="p-[22px]">

        {/* Progress bar */}
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
            {total > 0 && (
              <span className="text-gdpr-b2 ml-2">· {current + 1} / ~{total}</span>
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
          // Multi-select
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
          // Single-select: immediate submit on click
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
