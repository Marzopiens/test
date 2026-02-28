import './gdpr.css'

export function AnalysingStage() {
  return (
    <div className="bg-gdpr-s border border-gdpr-b rounded-2xl overflow-hidden mt-6">
      <div
        className="h-[2px]"
        style={{ background: 'linear-gradient(90deg, #4631FF, #00E5A0)' }}
      />
      <div className="text-center px-5 py-[50px]">
        <div
          className="w-[60px] h-[60px] mx-auto mb-5 rounded-full flex items-center justify-center text-[1.5rem] gdpr-spin"
          style={{
            background: 'radial-gradient(circle, rgba(0,229,160,0.2), rgba(70,49,255,0.3))',
            border: '1px solid rgba(70,49,255,0.4)',
          }}
        >
          ⚖
        </div>
        <p className="text-gdpr-mu text-[0.84rem] gdpr-pulse">Analysing your scenario…</p>
      </div>
    </div>
  )
}
