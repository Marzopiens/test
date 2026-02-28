import { useState, useEffect } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TextInput } from '@/components/TextInput'

function App() {
  const [count, setCount] = useState(0)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setAnimate(true)
    const t = setTimeout(() => setAnimate(false), 200)
    return () => clearTimeout(t)
  }, [count])

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">

      <Header />

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center gap-5 py-10">

        {/* Display del contador */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl px-12 py-6 shadow-xl text-center">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Valor actual</p>
          <div
            aria-live="polite"
            style={{
              fontSize: '3.5rem',
              fontWeight: 800,
              transition: 'transform 180ms cubic-bezier(.2,.9,.3,1), color 180ms',
              transform: animate ? 'scale(1.18)' : 'scale(1)',
              color: animate ? '#60a5fa' : '#f1f5f9',
            }}
          >
            {count}
          </div>
        </div>

        {/* +1 / -1 (azul / rojo) */}
        <div className="flex gap-3">
          <Button
            className="bg-red-600 hover:bg-red-500 text-white"
            onClick={() => setCount((c) => c - 1)}
          >
            −1
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-500 text-white"
            onClick={() => setCount((c) => c + 1)}
          >
            +1
          </Button>
        </div>

        {/* ×2 / ÷2 (verde) */}
        <div className="flex gap-3">
          <Button
            className="bg-green-700 hover:bg-green-600 text-white"
            onClick={() => setCount((c) => c * 2)}
          >
            ×2
          </Button>
          <Button
            className="bg-green-900 hover:bg-green-800 text-white"
            onClick={() => setCount((c) => Math.trunc(c / 2))}
          >
            ÷2
          </Button>
        </div>

        {/* +10 / -10 / Reset (azul / rojo / rojo oscuro) */}
        <div className="flex gap-3">
          <Button
            className="bg-red-800 hover:bg-red-700 text-white"
            onClick={() => setCount((c) => c - 10)}
          >
            −10
          </Button>
          <Button
            className="bg-blue-800 hover:bg-blue-700 text-white"
            onClick={() => setCount((c) => c + 10)}
          >
            +10
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-500 text-white"
            onClick={() => setCount(0)}
          >
            Reset
          </Button>
        </div>

        <TextInput />

      </main>

      <Footer />

    </div>
  )
}

export default App
