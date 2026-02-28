export function Hero() {
  return (
    <div className="text-center pt-10 pb-7">
      {/* Icon placeholder */}
      <div className="flex justify-center mb-[14px]">
        <div
          className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl"
          style={{ background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.25)' }}
        >
          ⚖
        </div>
      </div>

      {/* Tag */}
      <div
        className="inline-flex items-center gap-[7px] rounded-full px-[14px] py-[5px] mb-4 text-[0.62rem] font-semibold tracking-[1.5px] text-gdpr-em uppercase"
        style={{
          background: 'rgba(0,229,160,0.08)',
          border: '1px solid rgba(0,229,160,0.25)',
        }}
      >
        <span className="w-[5px] h-[5px] bg-gdpr-em rounded-full inline-block" />
        Data Rights Checker
      </div>

      {/* Heading */}
      <h1
        className="font-extrabold leading-[1.1] tracking-[-1.5px] mb-3"
        style={{ fontSize: 'clamp(1.75rem, 5vw, 2.7rem)' }}
      >
        <span className="text-white">Know your </span>
        <span className="text-gdpr-em">GDPR rights</span>
        <br />
        <span className="text-gdpr-v3">instantly</span>
      </h1>

      {/* Subtitle */}
      <p className="text-[0.88rem] text-gdpr-mu max-w-[440px] mx-auto leading-[1.7]">
        Describe your situation and we'll analyse whether you have a valid data
        rights claim under EU GDPR — free, private, and instant.
      </p>

      {/* Pills */}
      <div className="flex gap-2 justify-center flex-wrap mt-4">
        {[
          { dot: '#00E5A0', label: 'Free' },
          { dot: '#6B50FF', label: 'GDPR' },
          { dot: '#6B6B99', label: 'Not legal advice' },
        ].map(({ dot, label }) => (
          <div
            key={label}
            className="flex items-center gap-[6px] bg-gdpr-s border border-gdpr-b rounded-full px-3 py-[5px] text-[0.65rem] font-semibold text-gdpr-mu"
          >
            <span className="w-[5px] h-[5px] rounded-full" style={{ background: dot }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
