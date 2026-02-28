import { useState } from 'react'
import { TREE, isVerdict } from './gdprData'
import type { Verdict } from './gdprData'
import './gdpr.css'

interface GuidedStageProps {
  onResult: (verdict: Verdict) => void
  onBack: () => void
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export function GuidedStage({ onResult, onBack }: GuidedStageProps) {
  const [nodeId, setNodeId] = useState('start')
  const [history, setHistory] = useState<string[]>([])

  const node = TREE[nodeId]
  if (!node || isVerdict(node)) return null

  const maxDepth = 4
  const progress = Math.min((history.length / maxDepth) * 100, 90)

  function choose(next: string) {
    const nextNode = TREE[next]
    if (!nextNode) return
    if (isVerdict(nextNode)) {
      onResult(nextNode)
    } else {
      setHistory((h) => [...h, nodeId])
      setNodeId(next)
    }
  }

  function goBack() {
    if (history.length === 0) {
      onBack()
    } else {
      const prev = history[history.length - 1]
      setHistory((h) => h.slice(0, -1))
      setNodeId(prev)
    }
  }

  return (
    <div className="bg-gdpr-s border border-gdpr-b rounded-2xl overflow-hidden mt-6 gdpr-fade-in">
      <div
        className="h-[2px]"
        style={{ background: 'linear-gradient(90deg, #4631FF, #00E5A0)' }}
      />
      <div className="p-[22px]">
        {/* Progress */}
        <div className="h-[2px] bg-gdpr-s3 rounded-[2px] my-5 overflow-hidden">
          <div
            className="h-full rounded-[2px] transition-[width] duration-400"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #4631FF, #00E5A0)',
            }}
          />
        </div>

        {/* Back */}
        <button
          onClick={goBack}
          className="flex items-center gap-[6px] text-gdpr-mu text-[0.68rem] font-semibold tracking-[1px] uppercase mb-[18px] bg-transparent border-none cursor-pointer p-0 font-[inherit] hover:text-gdpr-t transition-colors"
        >
          ← {history.length === 0 ? 'Back to start' : 'Previous question'}
        </button>

        <div className="text-[0.58rem] font-bold tracking-[2px] uppercase text-gdpr-dim mb-3">
          Step {history.length + 1}
        </div>

        <h2 className="text-[clamp(1rem,3vw,1.2rem)] font-extrabold text-white mb-4 leading-[1.25]">
          {node.question}
        </h2>

        {node.help && (
          <div
            className="bg-gdpr-s2 border border-gdpr-b rounded-lg px-[14px] py-[10px] text-[0.76rem] text-gdpr-mu leading-[1.6] mb-5"
            style={{ borderLeft: '3px solid #4631FF' }}
          >
            {node.help}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-1">
          {node.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => choose(opt.next)}
              className="bg-gdpr-s2 border border-gdpr-b rounded-[10px] px-[15px] py-[13px] text-gdpr-t text-left text-[0.86rem] leading-[1.5] font-medium cursor-pointer transition-all flex items-center gap-[11px] font-[inherit] w-full hover:bg-gdpr-s3 hover:border-gdpr-v hover:text-white"
            >
              <span className="min-w-[24px] h-6 border border-gdpr-b2 rounded-full flex items-center justify-center text-[0.62rem] text-gdpr-mu flex-shrink-0 font-bold">
                {OPTION_LETTERS[i]}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
