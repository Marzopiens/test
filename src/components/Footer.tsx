export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-4 px-8 text-center text-sm text-slate-400">
      <p>
        Hecho con{' '}
        <span className="text-red-400 font-medium">React</span>
        {' · '}
        <span className="text-blue-400 font-medium">Vite</span>
        {' · '}
        <span className="text-green-400 font-medium">Tailwind v4</span>
        {' · '}
        <span className="text-blue-300 font-medium">shadcn/ui</span>
      </p>
    </footer>
  )
}
