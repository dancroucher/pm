'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LockPage() {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

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
      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        reset()
      }
    } catch {
      reset()
    } finally {
      setLoading(false)
    }
  }, [router, reset])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    setError(false)
    const next = [...digits]
    next[index] = value
    setDigits(next)

    if (value && index < 3) {
      inputs.current[index + 1]?.focus()
    }
    if (next.every(d => d !== '')) {
      submit(next.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-white text-2xl font-semibold tracking-wide">Enter Passcode</h1>
        <p className="text-gray-500 text-sm">4-digit PIN required</p>
      </div>

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
              'w-14 h-14 text-center text-2xl font-bold rounded-xl',
              'bg-gray-900 text-white outline-none',
              'border-2 transition-colors duration-150',
              error
                ? 'border-red-500 animate-shake'
                : 'border-gray-700 focus:border-indigo-500',
            ].join(' ')}
          />
        ))}
      </div>

      <p className={`text-red-400 text-sm transition-opacity ${error ? 'opacity-100' : 'opacity-0'}`}>
        Incorrect passcode
      </p>
    </main>
  )
}
