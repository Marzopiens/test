export function NavBar() {
  return (
    <nav
      className="flex items-center justify-between px-[18px] py-[13px] border-b border-gdpr-b sticky top-0 z-50"
      style={{ background: 'rgba(8,8,15,0.92)', backdropFilter: 'blur(14px)' }}
    >
      <a
        href="https://www.itslegal.io/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-[10px] no-underline"
      >
        <span className="text-gdpr-em font-bold text-[0.95rem] tracking-tight">
          IT Legal Solutions
        </span>
      </a>
      <div className="flex items-center gap-2">
        <span
          className="text-[0.6rem] font-bold tracking-[1.5px] text-gdpr-em uppercase rounded-full px-[11px] py-[4px]"
          style={{
            background: 'rgba(0,229,160,0.08)',
            border: '1px solid rgba(0,229,160,0.25)',
          }}
        >
          EU GDPR
        </span>
        <a
          href="https://www.itslegal.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.68rem] text-gdpr-mu no-underline border border-gdpr-b rounded-full px-3 py-1 transition-all hover:border-gdpr-em hover:text-gdpr-em"
        >
          itslegal.io
        </a>
      </div>
    </nav>
  )
}
