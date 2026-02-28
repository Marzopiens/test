export function GDPRFooter() {
  return (
    <footer className="border-t border-gdpr-b px-[18px] py-7 bg-gdpr-bg2 relative z-10 mt-10">
      <div className="max-w-[680px] mx-auto">
        {/* Logo text */}
        <div className="text-gdpr-em font-bold text-[0.95rem] mb-[14px]">IT Legal Solutions</div>

        <p className="text-[0.79rem] text-gdpr-mu leading-[1.75] mb-[14px]">
          Helping individuals understand their data rights under EU GDPR.{' '}
          <a href="https://www.itslegal.io/" target="_blank" rel="noopener noreferrer"
            className="text-gdpr-em no-underline hover:underline">
            itslegal.io
          </a>
        </p>

        <div className="flex gap-3 flex-wrap text-[0.66rem] text-gdpr-dim items-center">
          <span>© 2025 IT Legal Solutions</span>
          <span>·</span>
          <a href="https://www.itslegal.io/" target="_blank" rel="noopener noreferrer"
            className="text-gdpr-dim no-underline hover:text-gdpr-mu">
            Privacy Policy
          </a>
          <span>·</span>
          <span>Not legal advice</span>
        </div>
      </div>
    </footer>
  )
}
