import { useState } from 'react'
import DOMPurify from 'dompurify'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const MAX_LENGTH = 300

function sanitize(raw: string): string {
  // 1. Elimina HTML/scripts (XSS)
  const clean = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  // 2. Recorta espacios extremos
  return clean.trim()
}

export function TextInput() {
  const [raw, setRaw] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)

  const sanitized = sanitize(raw)
  const wasTrimmed = sanitized !== raw.trim()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(sanitized)
  }

  return (
    <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-slate-100">
      <CardHeader>
        <CardTitle className="text-base text-slate-200">Entrada de texto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-input" className="text-slate-300">
              Mensaje
            </Label>
            <Input
              id="user-input"
              value={raw}
              maxLength={MAX_LENGTH}
              onChange={(e) => {
                setSubmitted(null)
                setRaw(e.target.value)
              }}
              placeholder="Escribe algo..."
              className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500 text-right">
              {raw.length} / {MAX_LENGTH}
            </p>
          </div>

          {wasTrimmed && (
            <p className="text-xs text-yellow-400">
              Se detectó contenido no permitido y será eliminado al enviar.
            </p>
          )}

          <button
            type="submit"
            disabled={sanitized.length === 0}
            className="w-full rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 transition-colors"
          >
            Enviar
          </button>

          {submitted !== null && (
            <div className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2">
              <p className="text-xs text-slate-400 mb-1">Texto recibido (sanitizado):</p>
              <p className="text-sm text-green-400 break-words">{submitted}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
