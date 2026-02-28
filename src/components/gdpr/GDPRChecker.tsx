import { useState } from 'react'
import './gdpr.css'
import type { Verdict } from './gdprData'
import { NavBar } from './NavBar'
import { Hero } from './Hero'
import { LandingStage } from './LandingStage'
import { AnalysingStage } from './AnalysingStage'
import { GuidedStage } from './GuidedStage'
import { ResultDisplay } from './ResultDisplay'
import { GDPRFooter } from './GDPRFooter'

type Stage = 'landing' | 'analysing' | 'ai-result' | 'guided' | 'result'

export function GDPRChecker() {
  const [stage, setStage] = useState<Stage>('landing')
  const [scenario, setScenario] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  async function handleAnalyse(text: string, apiKey: string) {
    setScenario(text)
    setAiError(null)
    setStage('analysing')

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `You are a GDPR legal analysis assistant. Analyse the following scenario and respond ONLY with a valid JSON object matching this exact structure:

{
  "key": "strong" | "possible" | "limited" | "none",
  "label": "Strong Case" | "Possible Claim" | "Limited Basis" | "No Clear Claim",
  "title": "short title (max 10 words)",
  "summary": "2-3 sentence summary of the GDPR analysis",
  "rights": ["Right name — Art. X", ...],
  "actions": ["Action description", ...],
  "legalRef": "GDPR Art. X (Name) · ..."
}

Scenario: ${text}

Respond ONLY with the JSON object, no other text.`,
            },
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${res.status}`)
      }

      const data = await res.json() as { content: { type: string; text: string }[] }
      const text_content = data.content.find((c) => c.type === 'text')?.text ?? ''
      const parsed = JSON.parse(text_content) as Verdict
      setVerdict(parsed)
      setStage('ai-result')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error')
      setStage('landing')
    }
  }

  function handleGuidedResult(v: Verdict) {
    setVerdict(v)
    setStage('result')
  }

  function restart() {
    setStage('landing')
    setVerdict(null)
    setScenario('')
    setAiError(null)
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ background: '#08080F', color: '#E8E8F5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Background gradient */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(70,49,255,.28) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 100% 80%, rgba(70,53,99,.18) 0%, transparent 55%),
            radial-gradient(ellipse 40% 30% at 0% 100%, rgba(0,229,160,.05) 0%, transparent 50%),
            #08080F
          `,
        }}
      />
      {/* Grid overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(70,49,255,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(70,49,255,.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <NavBar />

        <main className="flex-1">
          <div className="max-w-[680px] mx-auto px-[18px]">
            {(stage === 'landing' || stage === 'analysing') && <Hero />}

            {aiError && (
              <div
                className="mt-4 px-4 py-3 rounded-lg text-[0.82rem] text-gdpr-or"
                style={{ background: 'rgba(227,126,7,0.08)', border: '1px solid rgba(227,126,7,0.25)' }}
              >
                Error: {aiError}
              </div>
            )}

            {stage === 'landing' && (
              <LandingStage
                onAnalyse={handleAnalyse}
                onGuided={() => setStage('guided')}
              />
            )}

            {stage === 'analysing' && <AnalysingStage />}

            {stage === 'ai-result' && verdict && (
              <div className="mt-0">
                <ResultDisplay
                  verdict={verdict}
                  scenario={scenario}
                  onRestart={restart}
                  onContinueGuided={() => setStage('guided')}
                />
              </div>
            )}

            {stage === 'guided' && (
              <GuidedStage
                onResult={handleGuidedResult}
                onBack={() => setStage('landing')}
              />
            )}

            {stage === 'result' && verdict && (
              <ResultDisplay
                verdict={verdict}
                onRestart={restart}
              />
            )}

            <div className="pb-10" />
          </div>
        </main>

        <GDPRFooter />
      </div>
    </div>
  )
}
