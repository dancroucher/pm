'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LockPage() {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => { inputs.current[0]?.focus() }, [])

  const reset = useCallback(() => {
    setDigits(['', '', '', ''])
    setError(true)
    setTimeout(() => inputs.current[0]?.focus(), 0)
  }, [])

  const submit = useCallback(async (code: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code }),
      })
      if (res.ok) { router.push('/'); router.refresh() }
      else reset()
    } catch { reset() }
    finally { setLoading(false) }
  }, [router, reset])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    setError(false)
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 3) inputs.current[index + 1]?.focus()
    if (next.every(d => d !== '')) submit(next.join(''))
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus()
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 relative z-10">
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs text-gray-600 uppercase tracking-widest">// ACCESS CONTROL //</p>
        <h1 className="text-3xl uppercase tracking-widest text-white">ENTER PASSCODE</h1>
      </div>

      {/* LCD-style digit display */}
      <div className="panel rounded-sm p-6 flex flex-col items-center gap-4">
        <div className="flex gap-3">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              disabled={loading}
              className={[
                'w-14 h-14 text-center text-3xl border border-dashed outline-none transition-colors',
                'bg-gray-900',
                error ? 'border-red-400 text-red-400' : 'border-gray-600 focus:border-gray-400',
              ].join(' ')}
              style={{ fontFamily: 'inherit', color: error ? undefined : '#e87800', caretColor: '#e87800' }}
            />
          ))}
        </div>

        <p className={`text-xs uppercase tracking-widest transition-opacity ${error ? 'text-red-400 opacity-100' : 'opacity-0'}`}>
          // ACCESS DENIED //
        </p>
      </div>
    </main>
  )
}
