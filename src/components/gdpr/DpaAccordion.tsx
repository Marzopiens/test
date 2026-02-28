import { useState } from 'react'
import { DPA_LIST } from './gdprData'

export function DpaAccordion() {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gdpr-b rounded-[10px] overflow-hidden mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex justify-between items-center text-gdpr-mu text-[0.64rem] font-bold tracking-[2px] uppercase cursor-pointer bg-transparent border-none font-[inherit]"
      >
        <span>Find your Data Protection Authority</span>
        <span
          className="transition-transform duration-200 text-xs"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            background: '#2A2A50',
          }}
        >
          {DPA_LIST.map((dpa) => (
            <a
              key={dpa.country}
              href={dpa.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-[13px] py-[10px] bg-gdpr-s2 no-underline hover:bg-gdpr-s3 transition-colors"
            >
              <div className="text-[0.78rem] text-gdpr-em font-semibold mb-px">{dpa.country}</div>
              <div className="text-[0.63rem] text-gdpr-mu">{dpa.name}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
