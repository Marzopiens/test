import { useState } from 'react'

const EXAMPLES = [
  'A company refused to delete my account and personal data after I requested it.',
  'My employer shared my salary and personal details with a third party without telling me.',
  'I keep receiving marketing emails even after unsubscribing multiple times.',
  'A retailer had a data breach and never notified me, even though my data was exposed.',
]

interface LandingStageProps {
  onAnalyse: (scenario: string, apiKey: string) => void
  onGuided: () => void
}

export function LandingStage({ onAnalyse, onGuided }: LandingStageProps) {
  const [scenario, setScenario] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gdpr_api_key') ?? '')
  const [apiSaved, setApiSaved] = useState(false)

  function saveApiKey() {
    localStorage.setItem('gdpr_api_key', apiKey)
    setApiSaved(true)
    setTimeout(() => setApiSaved(false), 2000)
  }

  return (
    <div className="gdpr-fade-in">
      <div className="bg-gdpr-s border border-gdpr-b rounded-2xl overflow-hidden mt-6">
        <div
          className="h-[2px]"
          style={{ background: 'linear-gradient(90deg, #4631FF, #00E5A0)' }}
        />
        <div className="p-[22px]">
          {/* Textarea */}
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Describe your situation in plain language — e.g. 'A company refused to delete my account after I requested it...'"
            className="w-full min-h-[120px] bg-gdpr-s2 border border-gdpr-b2 rounded-[10px] text-gdpr-t px-[15px] py-[13px] text-[0.88rem] font-[inherit] leading-[1.65] resize-y outline-none transition-colors focus:border-gdpr-v placeholder:text-gdpr-dim"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />

          {/* Examples */}
          <div className="my-[14px]">
            <div className="text-[0.58rem] font-bold tracking-[1.5px] uppercase text-gdpr-dim mb-[9px]">
              Try an example
            </div>
            <div className="flex flex-wrap gap-[7px]">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setScenario(ex)}
                  className="bg-gdpr-s2 border border-gdpr-b rounded-lg px-[11px] py-[7px] text-[0.7rem] text-gdpr-mu text-left font-[inherit] cursor-pointer transition-all leading-[1.4] max-w-full hover:border-gdpr-v hover:text-gdpr-t"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="mt-[18px] px-4 py-[14px] bg-gdpr-s2 border border-gdpr-b rounded-[10px]">
            <label className="text-[0.62rem] font-bold tracking-[1.5px] uppercase text-gdpr-mu mb-[9px] block">
              Anthropic API Key (for AI analysis)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 bg-gdpr-s border border-gdpr-b2 text-gdpr-t px-[13px] py-[9px] rounded-lg font-[inherit] text-[0.78rem] outline-none transition-colors focus:border-gdpr-v placeholder:text-gdpr-dim"
              />
              <button
                onClick={saveApiKey}
                className="px-3 py-[9px] text-[0.72rem] font-semibold text-gdpr-mu border border-gdpr-b2 rounded-lg cursor-pointer bg-transparent transition-all hover:border-gdpr-em hover:text-gdpr-em font-[inherit]"
              >
                Save
              </button>
            </div>
            {apiSaved && (
              <div className="text-[0.7rem] text-gdpr-em mt-2">Key saved locally ✓</div>
            )}
            <div
              className="text-[0.66rem] text-gdpr-or mt-[9px] rounded-[7px] px-[11px] py-2 leading-[1.5]"
              style={{
                background: 'rgba(227,126,7,0.07)',
                border: '1px solid rgba(227,126,7,0.2)',
              }}
            >
              Your key is stored only in your browser. Requests are sent directly to Anthropic — we
              never see your key.
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-[10px] flex-wrap items-center mt-5">
            <button
              onClick={() => onAnalyse(scenario, apiKey)}
              disabled={!scenario.trim() || !apiKey.trim()}
              className="inline-flex items-center gap-2 rounded-[10px] px-6 py-[13px] text-white text-[0.86rem] font-bold cursor-pointer border-none transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #4631FF, #6B50FF)',
                boxShadow: '0 4px 20px rgba(70,49,255,0.35)',
              }}
            >
              ✦ Analyse with AI
            </button>
            <button
              onClick={onGuided}
              disabled={!scenario.trim()}
              className="inline-flex items-center gap-2 rounded-[10px] px-[22px] py-3 text-[#0A0A10] text-[0.82rem] font-bold cursor-pointer border-none transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #00E5A0, #00C88A)' }}
            >
              Guided assessment →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
